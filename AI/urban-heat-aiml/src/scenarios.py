"""
scenarios.py
------------
Simulates cooling interventions by perturbing the physical feature grid and
re-running it through the trained physics-informed model to predict the
resulting LST. Because the model was trained under monotonicity constraints
consistent with known urban-climate physics, these counterfactual
("what if we intervene here") predictions stay physically sensible even
though no intervention was literally observed in the training data.

Supported interventions (each maps to a concrete feature perturbation):

  urban_greening   -> raises NDVI, lowers impervious_fraction, raises albedo
                       slightly (canopy shading), raises sky_view_factor
                       fractionally reduced by canopy but net cooling wins
  cool_roofs        -> raises albedo of built_up cells substantially,
                       no change to NDVI/imperviousness
  green_roofs       -> raises NDVI + albedo moderately on built_up cells,
                       adds modest evapotranspirative cooling
  reflective_pavement-> raises albedo of road cells, lowers impervious heat
                       retention proxy slightly
  water_body         -> converts bare_soil/grass cells to water-adjacency
                       effect (shrinks dist_to_water_m for neighbors)
  tree_canopy_streets -> targeted street-tree planting: raises NDVI + SVF
                       reduction on road-adjacent built_up cells

Each intervention function takes the feature dataframe + a list of cell_ids
to treat, and returns a modified copy (does not mutate input).
"""

from dataclasses import dataclass
from typing import List, Dict

import numpy as np
import pandas as pd

from model import TrainedModel, predict_lst

INTERVENTION_CATALOG = {
    "urban_greening": dict(
        label="Urban Greening (parks / tree planting)",
        eligible_lulc=["bare_soil", "grass", "built_up"],
        cost_per_cell=8.0,  # relative cost units, for optimizer budget
    ),
    "cool_roofs": dict(
        label="Cool / High-Albedo Roofs",
        eligible_lulc=["built_up"],
        cost_per_cell=5.0,
    ),
    "green_roofs": dict(
        label="Green Roofs",
        eligible_lulc=["built_up"],
        cost_per_cell=9.0,
    ),
    "reflective_pavement": dict(
        label="Reflective / Cool Pavement",
        eligible_lulc=["road"],
        cost_per_cell=4.0,
    ),
    "tree_canopy_streets": dict(
        label="Street Tree Canopy",
        eligible_lulc=["built_up", "road"],
        cost_per_cell=6.0,
    ),
}


def _apply_urban_greening(df: pd.DataFrame, cell_ids: List[int]) -> pd.DataFrame:
    out = df.copy()
    mask = out["cell_id"].isin(cell_ids)
    out.loc[mask, "ndvi"] = np.clip(out.loc[mask, "ndvi"] + 0.45, -0.2, 0.95)
    out.loc[mask, "impervious_fraction"] = np.clip(out.loc[mask, "impervious_fraction"] - 0.35, 0, 1)
    out.loc[mask, "albedo"] = np.clip(out.loc[mask, "albedo"] + 0.02, 0.03, 0.5)
    return out


def _apply_cool_roofs(df: pd.DataFrame, cell_ids: List[int]) -> pd.DataFrame:
    out = df.copy()
    mask = out["cell_id"].isin(cell_ids)
    out.loc[mask, "albedo"] = np.clip(out.loc[mask, "albedo"] + 0.28, 0.03, 0.65)
    return out


def _apply_green_roofs(df: pd.DataFrame, cell_ids: List[int]) -> pd.DataFrame:
    out = df.copy()
    mask = out["cell_id"].isin(cell_ids)
    out.loc[mask, "ndvi"] = np.clip(out.loc[mask, "ndvi"] + 0.25, -0.2, 0.95)
    out.loc[mask, "albedo"] = np.clip(out.loc[mask, "albedo"] + 0.10, 0.03, 0.5)
    return out


def _apply_reflective_pavement(df: pd.DataFrame, cell_ids: List[int]) -> pd.DataFrame:
    out = df.copy()
    mask = out["cell_id"].isin(cell_ids)
    out.loc[mask, "albedo"] = np.clip(out.loc[mask, "albedo"] + 0.20, 0.03, 0.55)
    return out


def _apply_tree_canopy_streets(df: pd.DataFrame, cell_ids: List[int]) -> pd.DataFrame:
    out = df.copy()
    mask = out["cell_id"].isin(cell_ids)
    out.loc[mask, "ndvi"] = np.clip(out.loc[mask, "ndvi"] + 0.20, -0.2, 0.95)
    out.loc[mask, "sky_view_factor"] = np.clip(out.loc[mask, "sky_view_factor"] - 0.05, 0.15, 1.0)
    return out


APPLY_FN = {
    "urban_greening": _apply_urban_greening,
    "cool_roofs": _apply_cool_roofs,
    "green_roofs": _apply_green_roofs,
    "reflective_pavement": _apply_reflective_pavement,
    "tree_canopy_streets": _apply_tree_canopy_streets,
}


@dataclass
class ScenarioResult:
    intervention: str
    n_cells_treated: int
    baseline_mean_lst: float
    scenario_mean_lst: float
    mean_reduction_c: float
    max_reduction_c: float
    treated_cell_ids: List[int]
    cell_deltas: Dict[int, float]  # cell_id -> temperature reduction


def run_scenario(df: pd.DataFrame, trained: TrainedModel, intervention: str,
                  cell_ids: List[int]) -> ScenarioResult:
    if intervention not in APPLY_FN:
        raise ValueError(f"Unknown intervention: {intervention}")

    eligible = set(df[df["lulc"].isin(INTERVENTION_CATALOG[intervention]["eligible_lulc"])]["cell_id"])
    treated_ids = [cid for cid in cell_ids if cid in eligible]

    baseline_pred = predict_lst(trained, df)
    scenario_df = APPLY_FN[intervention](df, treated_ids)
    scenario_pred = predict_lst(trained, scenario_df)

    delta = baseline_pred - scenario_pred  # positive = cooling
    cell_deltas = {int(cid): round(float(d), 3) for cid, d in
                   zip(df["cell_id"], delta) if cid in treated_ids}

    treated_mask = df["cell_id"].isin(treated_ids)

    return ScenarioResult(
        intervention=intervention,
        n_cells_treated=len(treated_ids),
        baseline_mean_lst=round(float(baseline_pred.mean()), 2),
        scenario_mean_lst=round(float(scenario_pred.mean()), 2),
        mean_reduction_c=round(float(delta[treated_mask].mean()) if treated_mask.any() else 0.0, 3),
        max_reduction_c=round(float(delta[treated_mask].max()) if treated_mask.any() else 0.0, 3),
        treated_cell_ids=treated_ids,
        cell_deltas=cell_deltas,
    )


def compare_all_interventions(df: pd.DataFrame, trained: TrainedModel,
                               hotspot_cell_ids: List[int]) -> List[ScenarioResult]:
    """Run every catalog intervention over the same hotspot footprint so
    effectiveness can be compared apples-to-apples."""
    results = []
    for name in INTERVENTION_CATALOG:
        results.append(run_scenario(df, trained, name, hotspot_cell_ids))
    results.sort(key=lambda r: r.mean_reduction_c, reverse=True)
    return results


if __name__ == "__main__":
    from data_generator import generate_city_grid
    from model import train_lst_model
    from hotspots import detect_hotspots

    grid = generate_city_grid()
    trained = train_lst_model(grid)
    data, hotspots = detect_hotspots(grid)
    top_hotspot_cells = data[data["hotspot_rank"] == 1]["cell_id"].tolist()

    results = compare_all_interventions(grid, trained, top_hotspot_cells)
    for r in results:
        print(f"{r.intervention:22s} mean reduction: {r.mean_reduction_c:+.3f} C "
              f"over {r.n_cells_treated} cells (max {r.max_reduction_c:+.3f} C)")
