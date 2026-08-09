"""
hotspots.py
-----------
Identifies urban heat stress hotspots from the LST grid and clusters
contiguous hot cells into named hotspot zones, ranked by severity.

Method:
1. Compute a Heat Stress Index (HSI) per cell — LST expressed as standard
   deviations above the citywide mean (a local z-score), which is more
   robust for cross-city comparison than raw LST.
2. Threshold HSI (default: >= 1.0 std dev above mean) to flag "hot" cells.
3. Cluster flagged cells into spatially contiguous hotspots using a simple
   grid flood-fill (4-connectivity), equivalent in spirit to connected-
   component labeling on a raster.
4. Rank hotspots by a severity score = mean excess temperature * cluster
   area, so both intensity and spatial extent count.
"""

from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd


@dataclass
class Hotspot:
    hotspot_id: int
    n_cells: int
    area_km2: float
    mean_lst_c: float
    max_lst_c: float
    mean_excess_c: float
    severity_score: float
    centroid_lat: float
    centroid_lon: float
    dominant_lulc: str


def compute_heat_stress_index(df: pd.DataFrame, lst_col: str = "lst_c") -> pd.DataFrame:
    out = df.copy()
    mu, sigma = out[lst_col].mean(), out[lst_col].std()
    out["heat_stress_index"] = (out[lst_col] - mu) / sigma
    return out


def _flood_fill_clusters(hot_mask: np.ndarray) -> np.ndarray:
    """4-connectivity connected component labeling without scipy dependency."""
    labels = np.zeros_like(hot_mask, dtype=int)
    n_rows, n_cols = hot_mask.shape
    current_label = 0

    for r in range(n_rows):
        for c in range(n_cols):
            if hot_mask[r, c] and labels[r, c] == 0:
                current_label += 1
                stack = [(r, c)]
                labels[r, c] = current_label
                while stack:
                    cr, cc = stack.pop()
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < n_rows and 0 <= nc < n_cols:
                            if hot_mask[nr, nc] and labels[nr, nc] == 0:
                                labels[nr, nc] = current_label
                                stack.append((nr, nc))
    return labels


def detect_hotspots(df: pd.DataFrame, hsi_threshold: float = 1.0,
                     min_cluster_size: int = 4,
                     cell_area_km2: float = 0.01) -> (pd.DataFrame, List[Hotspot]):
    """Returns (df with hotspot_id column, list of Hotspot summaries)."""
    data = compute_heat_stress_index(df)
    n_rows, n_cols = data["row"].max() + 1, data["col"].max() + 1

    grid_hsi = np.full((n_rows, n_cols), -999.0)
    for _, row in data.iterrows():
        grid_hsi[int(row["row"]), int(row["col"])] = row["heat_stress_index"]

    hot_mask = grid_hsi >= hsi_threshold
    labels = _flood_fill_clusters(hot_mask)

    data["hotspot_id"] = data.apply(lambda r: labels[int(r["row"]), int(r["col"])], axis=1)

    hotspots = []
    mean_lst = data["lst_c"].mean()
    for label_id in sorted(set(labels.flatten()) - {0}):
        cluster = data[data["hotspot_id"] == label_id]
        if len(cluster) < min_cluster_size:
            # too small to be an actionable intervention zone; unset
            data.loc[data["hotspot_id"] == label_id, "hotspot_id"] = 0
            continue
        mean_excess = cluster["lst_c"].mean() - mean_lst
        hotspots.append(Hotspot(
            hotspot_id=label_id,
            n_cells=len(cluster),
            area_km2=round(len(cluster) * cell_area_km2, 3),
            mean_lst_c=round(cluster["lst_c"].mean(), 2),
            max_lst_c=round(cluster["lst_c"].max(), 2),
            mean_excess_c=round(mean_excess, 2),
            severity_score=round(mean_excess * len(cluster), 2),
            centroid_lat=round(cluster["lat"].mean(), 5),
            centroid_lon=round(cluster["lon"].mean(), 5),
            dominant_lulc=cluster["lulc"].mode().iloc[0],
        ))

    hotspots.sort(key=lambda h: h.severity_score, reverse=True)
    # re-rank hotspot_id by severity for readability (1 = most severe)
    id_remap = {h.hotspot_id: i + 1 for i, h in enumerate(hotspots)}
    data["hotspot_rank"] = data["hotspot_id"].map(id_remap).fillna(0).astype(int)
    for i, h in enumerate(hotspots):
        h.hotspot_id = i + 1

    return data, hotspots


if __name__ == "__main__":
    from data_generator import generate_city_grid

    grid = generate_city_grid()
    data, hotspots = detect_hotspots(grid)
    print(f"Detected {len(hotspots)} hotspot zones")
    for h in hotspots[:5]:
        print(h)
