"""
data_generator.py
------------------
Generates a synthetic but physically-plausible geospatial grid for a demo city
(default: Bhopal, India) standing in for the real remote-sensing stack:

    Landsat 8 LST         -> synthetic LST driven by physical relationships
    ECOSTRESS LST         -> synthetic high-res LST (finer grid, correlated)
    Sentinel-2 / Landsat  -> synthetic LULC classes
    ERA5 / CPCB            -> synthetic air temp, humidity, wind
    OSM / GHSL / UT-GLOBUS -> synthetic building height, density, road density

Swap this module for real data loaders (rasterio + GEE/earthaccess exports)
without touching downstream code -- every consumer only depends on the
GeoGrid dataframe schema defined below.

Grid schema (one row per cell):
    cell_id, row, col, lat, lon,
    lulc                 (categorical: built_up, road, tree, grass, water, bare_soil)
    ndvi                 (0-1, vegetation index)
    albedo               (0-1, surface reflectivity)
    building_height_m    (mean building height, GHSL/UT-GLOBUS proxy)
    building_density     (0-1, plan area fraction, GHSL proxy)
    sky_view_factor      (0-1, SVF - fraction of sky visible from ground, SOLWEIG-style)
    impervious_fraction  (0-1)
    road_density         (0-1, OSM proxy)
    elevation_m
    dist_to_water_m
    air_temp_c           (ERA5 proxy, background regional value + urban modifiers)
    humidity_pct          (ERA5 proxy)
    wind_speed_ms         (ERA5 proxy)
    lst_c                (Landsat 8 proxy, ~30m equivalent, TARGET variable)
    lst_ecostress_c      (ECOSTRESS proxy, finer-scale, correlated w/ noise)
"""

import numpy as np
import pandas as pd

RNG_SEED = 42

# Demo city center - Bhopal, India (matches user's approximate location)
CITY_NAME = "Bhopal"
CITY_LAT, CITY_LON = 23.2599, 77.4126

LULC_CLASSES = ["built_up", "road", "tree", "grass", "water", "bare_soil"]

# Typical physical parameter ranges per LULC class (used to seed physically
# consistent synthetic data - NOT arbitrary noise)
LULC_PARAMS = {
    #                ndvi_mean  albedo_mean  bld_h   bld_dens  imperv  road_dens
    "built_up":   dict(ndvi=0.08, albedo=0.14, bld_h=14.0, bld_dens=0.55, imperv=0.85, road=0.35),
    "road":       dict(ndvi=0.03, albedo=0.11, bld_h=0.0,  bld_dens=0.0,  imperv=0.98, road=0.95),
    "tree":       dict(ndvi=0.72, albedo=0.18, bld_h=0.0,  bld_dens=0.0,  imperv=0.05, road=0.02),
    "grass":      dict(ndvi=0.45, albedo=0.22, bld_h=0.0,  bld_dens=0.0,  imperv=0.10, road=0.03),
    "water":      dict(ndvi=-0.10, albedo=0.08, bld_h=0.0, bld_dens=0.0,  imperv=0.0,  road=0.0),
    "bare_soil":  dict(ndvi=0.12, albedo=0.28, bld_h=0.0,  bld_dens=0.0,  imperv=0.20, road=0.01),
}

# Fractions used to stochastically assign LULC across the grid (rough Indian
# tier-2 city mix - dense core, moderate green cover, a central lake)
LULC_MIX = {
    "built_up": 0.42,
    "road": 0.12,
    "tree": 0.16,
    "grass": 0.14,
    "water": 0.05,
    "bare_soil": 0.11,
}


def _smooth(field: np.ndarray, iterations: int = 2) -> np.ndarray:
    """Cheap box-blur smoothing without scipy, used to turn discrete noise
    fields into organic, spatially-correlated continuous fields (a simple
    stand-in for Perlin/fractal noise)."""
    out = field.copy()
    for _ in range(iterations):
        padded = np.pad(out, 1, mode="edge")
        out = (
            padded[0:-2, 1:-1] + padded[2:, 1:-1] +
            padded[1:-1, 0:-2] + padded[1:-1, 2:] +
            4 * padded[1:-1, 1:-1]
        ) / 8.0
    return out


def _assign_lulc(n_rows: int, n_cols: int, rng: np.random.Generator) -> np.ndarray:
    """Assign LULC using multi-scale continuous noise fields (multiple octaves,
    each blurred at a different resolution and summed) so that class
    boundaries look like organic urban patches/corridors rather than blocky
    tiles or salt-and-pepper noise."""
    classes = list(LULC_MIX.keys())
    probs = np.array(list(LULC_MIX.values()))

    # Build a fractal-ish continuous field by summing several octaves of
    # random noise blurred at increasingly fine resolutions.
    field = np.zeros((n_rows, n_cols))
    octaves = [(6, 0.5), (14, 0.3), (30, 0.15), (60, 0.05)]
    for coarse, weight in octaves:
        coarse = max(2, coarse)
        seed_rows = max(2, n_rows // (n_rows // coarse if coarse < n_rows else 1))
        seed = rng.normal(size=(min(n_rows, coarse), min(n_cols, coarse)))
        row_idx = np.linspace(0, seed.shape[0] - 1, n_rows)
        col_idx = np.linspace(0, seed.shape[1] - 1, n_cols)
        # bilinear-ish upsample via nearest + smoothing (avoids extra deps)
        upsampled = seed[np.round(row_idx).astype(int)][:, np.round(col_idx).astype(int)]
        upsampled = _smooth(upsampled, iterations=3)
        field += weight * upsampled

    # A second, independent field used to carve road corridors (thin, low
    # values along quasi-linear paths) so roads don't look like random pixels.
    road_field = _smooth(rng.normal(size=(n_rows, n_cols)), iterations=1)

    # Rank-normalize the composite field to [0,1], then bucket into classes
    # according to LULC_MIX proportions (cumulative thresholds) -> guarantees
    # class frequencies stay close to the intended mix while preserving
    # smooth, organic spatial structure.
    flat_order = np.argsort(field, axis=None)
    ranks = np.empty_like(flat_order)
    ranks[flat_order] = np.arange(flat_order.size)
    pct = ranks.reshape(field.shape) / (field.size - 1)

    cum = np.cumsum(probs)
    cum = cum / cum[-1]
    class_idx = np.searchsorted(cum, pct, side="right")
    class_idx = np.clip(class_idx, 0, len(classes) - 1)
    lulc_arr = np.array(classes)[class_idx]

    # Thread thin road corridors through the grid using the road_field's
    # zero-crossings (creates connective linear features rather than blobs).
    road_mask = np.abs(road_field) < 0.04
    lulc_arr = np.where(road_mask, "road", lulc_arr)

    return lulc_arr


def _urban_core_intensity(rows, cols, n_rows, n_cols):
    """Distance-from-center intensity field (0=edge, 1=core) used to bias
    building density / impervious fraction toward a denser urban core -
    a simple stand-in for GHSL built-up-volume gradients."""
    cy, cx = n_rows / 2, n_cols / 2
    d = np.sqrt((rows - cy) ** 2 + (cols - cx) ** 2)
    d_norm = d / d.max()
    return 1 - d_norm  # 1 at center, 0 at edges


def generate_city_grid(n_rows: int = 60, n_cols: int = 60,
                        cell_size_m: float = 100.0,
                        seed: int = RNG_SEED) -> pd.DataFrame:
    """Generate the synthetic city grid GeoDataFrame (as plain pandas
    DataFrame with lat/lon columns - no GDAL dependency needed for the demo).
    """
    rng = np.random.default_rng(seed)

    row_ix, col_ix = np.meshgrid(np.arange(n_rows), np.arange(n_cols), indexing="ij")
    lulc_grid = _assign_lulc(n_rows, n_cols, rng)
    core_intensity = _urban_core_intensity(row_ix, col_ix, n_rows, n_cols)

    # approx meters -> degrees conversion (fine for a compact demo city extent)
    deg_per_m_lat = 1 / 111_000
    deg_per_m_lon = 1 / (111_000 * np.cos(np.radians(CITY_LAT)))
    lat = CITY_LAT + (row_ix - n_rows / 2) * cell_size_m * deg_per_m_lat
    lon = CITY_LON + (col_ix - n_cols / 2) * cell_size_m * deg_per_m_lon

    rows = []
    for r in range(n_rows):
        for c in range(n_cols):
            lulc = lulc_grid[r, c]
            p = LULC_PARAMS[lulc]
            core = core_intensity[r, c]

            ndvi = np.clip(rng.normal(p["ndvi"], 0.06), -0.2, 0.95)
            albedo = np.clip(rng.normal(p["albedo"], 0.03), 0.03, 0.5)
            bld_h = max(0.0, rng.normal(p["bld_h"] * (0.6 + 0.8 * core), 2.5))
            bld_dens = np.clip(rng.normal(p["bld_dens"] * (0.5 + core), 0.05), 0, 0.95)
            imperv = np.clip(rng.normal(p["imperv"], 0.05), 0, 1)
            road_dens = np.clip(rng.normal(p["road"], 0.04), 0, 1)

            # sky view factor: drops with building height & density (canyon effect)
            svf = np.clip(1 - 0.55 * bld_dens - 0.01 * bld_h, 0.15, 1.0)

            elevation = 500 + rng.normal(0, 8)  # Bhopal ~500m ASL
            dist_water = abs(rng.normal(1500 - 1200 * core, 500))
            if lulc == "water":
                dist_water = 0.0

            rows.append(dict(
                cell_id=r * n_cols + c, row=r, col=c, lat=lat[r, c], lon=lon[r, c],
                lulc=lulc, ndvi=ndvi, albedo=albedo,
                building_height_m=bld_h, building_density=bld_dens,
                sky_view_factor=svf, impervious_fraction=imperv,
                road_density=road_dens, elevation_m=elevation,
                dist_to_water_m=dist_water,
            ))

    df = pd.DataFrame(rows)

    # --- Meteorology (ERA5 / CPCB proxy) ---------------------------------
    # Regional background air temp + gentle spatial gradient + noise
    base_air_temp = 38.5  # peak pre-monsoon afternoon, deg C, central India
    df["air_temp_c"] = base_air_temp + rng.normal(0, 0.4, len(df))
    df["humidity_pct"] = np.clip(28 + rng.normal(0, 4, len(df)) - 8 * (df["dist_to_water_m"] < 300), 10, 90)
    df["wind_speed_ms"] = np.clip(rng.normal(2.2, 0.6, len(df)) * (0.6 + 0.4 * df["sky_view_factor"]), 0.3, 6)

    # --- Physics-informed LST synthesis -----------------------------------
    # Simplified surface energy balance intuition (not a full SEB solve, but
    # directionally faithful): LST rises with impervious surface / low albedo
    # / low vegetation / low sky-view-factor(canyon trapping) and falls near
    # water & high NDVI. This is exactly the relationship the physics-informed
    # model is later asked to *recover* from data, and the relationship the
    # scenario simulator perturbs when it "plants trees" or "installs cool roofs".
    df["lst_c"] = (
        df["air_temp_c"]
        + 9.0 * df["impervious_fraction"]
        - 7.5 * df["ndvi"]
        - 6.0 * df["albedo"]
        + 2.0 * (1 - df["sky_view_factor"])
        + 0.05 * df["building_height_m"]
        - 3.0 * np.exp(-df["dist_to_water_m"] / 600)
        + rng.normal(0, 0.6, len(df))
    )
    df["lst_c"] = df["lst_c"].round(2)

    # ECOSTRESS proxy: finer-scale, slightly higher variance, correlated with Landsat LST
    df["lst_ecostress_c"] = (df["lst_c"] + rng.normal(0, 0.9, len(df))).round(2)

    return df


def save_demo_grid(path: str = "/home/claude/urban-heat-ai/data/city_grid.csv",
                    n_rows: int = 60, n_cols: int = 60) -> pd.DataFrame:
    df = generate_city_grid(n_rows=n_rows, n_cols=n_cols)
    df.to_csv(path, index=False)
    return df


if __name__ == "__main__":
    df = save_demo_grid()
    print(f"Generated {len(df)} grid cells for {CITY_NAME}.")
    print(df[["lulc", "ndvi", "albedo", "lst_c"]].describe(include="all"))
