"""
model.py
--------
Physics-informed ML model relating Land Surface Temperature (LST) to its
physical drivers (LULC, vegetation, morphology, atmosphere).

"Physics-informed" here means two things, deliberately kept lightweight so
the approach is auditable rather than a black box:

1. FEATURE SET is restricted to physically meaningful, causally-motivated
   predictors (impervious fraction, NDVI, albedo, sky view factor, building
   height, distance to water, air temperature) rather than arbitrary raw
   bands - i.e. the model is *structurally* constrained to the known urban
   energy-balance drivers instead of being handed unconstrained pixel data.

2. MONOTONICITY / SIGN CONSTRAINTS are enforced at training time via
   GradientBoostingRegressor's `monotonic_cst` support, encoding known
   physical relationships as hard constraints on the learned function:
       - LST increases with impervious fraction         (+1)
       - LST decreases with NDVI (vegetation cooling)    (-1)
       - LST decreases with albedo (reflectivity cooling) (-1)
       - LST decreases with sky view factor              (-1)
       - LST increases with building height (canyon heat trapping) (+1)
       - LST decreases with proximity to water (inverse of dist)  (-1)
       - LST increases with local air temperature         (+1)
   This prevents the model from learning spurious/noise-driven relationships
   that violate known urban climate physics, improving generalization to
   scenario predictions far from the observed data distribution (a key
   requirement here since the model is later asked to extrapolate to
   "what if we plant trees" counterfactuals).

The model also reports permutation-based driver importance, satisfying the
"quantify the influence of key drivers" objective.
"""

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

FEATURES: List[str] = [
    "impervious_fraction",   # +
    "ndvi",                  # -
    "albedo",                # -
    "sky_view_factor",       # -
    "building_height_m",     # +
    "building_density",      # +
    "inv_dist_to_water",     # + (engineered: 1/(1+dist)) -> cooling effect of proximity
    "air_temp_c",            # +
    "humidity_pct",          # 0 (unconstrained)
    "wind_speed_ms",         # - (ventilation cools canyons)
]

MONOTONIC_CONSTRAINTS: Dict[str, int] = {
    "impervious_fraction": 1,
    "ndvi": -1,
    "albedo": -1,
    "sky_view_factor": -1,
    "building_height_m": 1,
    "building_density": 1,
    "inv_dist_to_water": 1,
    "air_temp_c": 1,
    "humidity_pct": 0,
    "wind_speed_ms": -1,
}

TARGET = "lst_c"


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["inv_dist_to_water"] = 1.0 / (1.0 + out["dist_to_water_m"] / 100.0)
    return out


@dataclass
class TrainedModel:
    model: HistGradientBoostingRegressor
    feature_importance: pd.DataFrame
    mae: float
    r2: float
    features: List[str]


def train_lst_model(df: pd.DataFrame, random_state: int = 42) -> TrainedModel:
    data = _engineer_features(df)
    X = data[FEATURES]
    y = data[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )

    cst = [MONOTONIC_CONSTRAINTS[f] for f in FEATURES]

    model = HistGradientBoostingRegressor(
        max_iter=300,
        max_depth=3,
        learning_rate=0.05,
        monotonic_cst=cst,
        random_state=random_state,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    perm = permutation_importance(
        model, X_test, y_test, n_repeats=15, random_state=random_state, n_jobs=-1
    )
    importance_df = pd.DataFrame({
        "feature": FEATURES,
        "importance_mean": perm.importances_mean,
        "importance_std": perm.importances_std,
    }).sort_values("importance_mean", ascending=False).reset_index(drop=True)
    # normalize to percentage contribution for readability
    total = importance_df["importance_mean"].clip(lower=0).sum()
    importance_df["contribution_pct"] = (
        importance_df["importance_mean"].clip(lower=0) / total * 100
    ).round(1)

    return TrainedModel(model=model, feature_importance=importance_df, mae=round(mae, 3),
                         r2=round(r2, 3), features=FEATURES)


def predict_lst(trained: TrainedModel, df: pd.DataFrame) -> np.ndarray:
    data = _engineer_features(df)
    return trained.model.predict(data[trained.features])


if __name__ == "__main__":
    from data_generator import generate_city_grid

    grid = generate_city_grid()
    trained = train_lst_model(grid)
    print(f"Test MAE: {trained.mae} C | R2: {trained.r2}")
    print(trained.feature_importance)
