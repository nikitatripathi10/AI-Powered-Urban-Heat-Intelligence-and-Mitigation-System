"""
run_pipeline.py
----------------
End-to-end AI/ML pipeline for the Urban Heat Mitigation project. No web
server, no frontend — this is the model/analysis pipeline only.

Steps:
    1. Generate/load the geospatial grid (LST, LULC, morphology, met data)
    2. Train the physics-informed LST model + quantify driver importance
    3. Detect and rank heat stress hotspots
    4. Simulate every cooling intervention over the top hotspot
    5. Run budget-constrained optimization for spatial placement
    6. Save all results (CSV/JSON) and diagnostic plots (PNG) to outputs/

Run:
    python3 run_pipeline.py
"""

import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from data_generator import generate_city_grid, CITY_NAME
from model import train_lst_model
from hotspots import detect_hotspots
from scenarios import compare_all_interventions, INTERVENTION_CATALOG
from optimizer import optimize_interventions

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "outputs")
OUT_DIR = os.path.normpath(OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)


def _save_json(obj, filename):
    with open(os.path.join(OUT_DIR, filename), "w") as f:
        json.dump(obj, f, indent=2, default=str)


def main():
    print(f"[1/6] Generating synthetic geospatial grid for {CITY_NAME}...")
    grid = generate_city_grid(n_rows=60, n_cols=60)
    grid.to_csv(os.path.join(OUT_DIR, "city_grid.csv"), index=False)

    print("[2/6] Training physics-informed LST model...")
    trained = train_lst_model(grid)
    print(f"       Test MAE = {trained.mae} C   R2 = {trained.r2}")
    _save_json({"mae_c": trained.mae, "r2": trained.r2, "features": trained.features},
               "model_metrics.json")
    trained.feature_importance.to_csv(os.path.join(OUT_DIR, "driver_importance.csv"), index=False)

    print("[3/6] Detecting heat stress hotspots...")
    data, hotspots = detect_hotspots(grid)
    _save_json([h.__dict__ for h in hotspots], "hotspots.json")
    print(f"       {len(hotspots)} hotspot zones flagged")

    print("[4/6] Simulating cooling interventions over the top hotspot...")
    top_hotspot_cells = data[data["hotspot_rank"] == 1]["cell_id"].tolist()
    scenario_results = compare_all_interventions(grid, trained, top_hotspot_cells)
    scenario_export = [{
        "intervention": r.intervention,
        "label": INTERVENTION_CATALOG[r.intervention]["label"],
        "n_cells_treated": r.n_cells_treated,
        "mean_reduction_c": r.mean_reduction_c,
        "max_reduction_c": r.max_reduction_c,
        "baseline_mean_lst": r.baseline_mean_lst,
        "scenario_mean_lst": r.scenario_mean_lst,
    } for r in scenario_results]
    _save_json(scenario_export, "scenario_comparison.json")

    print("[5/6] Running budget-constrained placement optimization...")
    all_hot_cells = data[data["hotspot_rank"] > 0]["cell_id"].tolist()
    optimization = optimize_interventions(grid, trained, all_hot_cells, budget=1200)
    _save_json({
        "budget": optimization.budget,
        "budget_used": optimization.budget_used,
        "total_predicted_reduction_c": optimization.total_predicted_reduction_c,
        "mean_hotspot_reduction_c": optimization.mean_hotspot_reduction_c,
        "intervention_mix": optimization.intervention_mix,
        "placements": [p.__dict__ for p in optimization.placements],
    }, "optimization_result.json")
    print(f"       Budget used: {optimization.budget_used}/{optimization.budget}")
    print(f"       Total predicted reduction: {optimization.total_predicted_reduction_c} C")
    print(f"       Intervention mix: {optimization.intervention_mix}")

    print("[6/6] Saving diagnostic plots...")
    _plot_heatmap(data)
    _plot_driver_importance(trained.feature_importance)
    _plot_scenario_comparison(scenario_export)
    _plot_optimization_map(data, optimization)

    print(f"\nDone. All results written to: {OUT_DIR}")


def _plot_heatmap(data):
    n_rows, n_cols = int(data["row"].max() + 1), int(data["col"].max() + 1)
    grid_lst = np.full((n_rows, n_cols), np.nan)
    for _, r in data.iterrows():
        grid_lst[int(r["row"]), int(r["col"])] = r["lst_c"]

    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(grid_lst, cmap="inferno", origin="upper")
    fig.colorbar(im, ax=ax, label="Land Surface Temperature (°C)")

    hot = data[data["hotspot_rank"] > 0]
    ax.scatter(hot["col"], hot["row"], s=1, c="cyan", alpha=0.15, marker="s")

    ax.set_title(f"{CITY_NAME} — Land Surface Temperature & Heat Hotspots")
    ax.set_xlabel("Grid column (≈100 m/cell)")
    ax.set_ylabel("Grid row (≈100 m/cell)")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "heatmap.png"), dpi=140)
    plt.close(fig)


def _plot_driver_importance(importance_df):
    fig, ax = plt.subplots(figsize=(7, 5))
    df = importance_df.sort_values("contribution_pct")
    ax.barh(df["feature"], df["contribution_pct"], color="#d9480f")
    ax.set_xlabel("Contribution to LST prediction (%)")
    ax.set_title("Quantified Drivers of Urban Heating")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "driver_importance.png"), dpi=140)
    plt.close(fig)


def _plot_scenario_comparison(scenario_export):
    fig, ax = plt.subplots(figsize=(7.5, 5))
    labels = [s["label"] for s in scenario_export]
    values = [s["mean_reduction_c"] for s in scenario_export]
    colors = plt.cm.Greens(np.linspace(0.9, 0.4, len(values)))
    ax.barh(labels, values, color=colors)
    ax.set_xlabel("Mean Predicted Temperature Reduction (°C)")
    ax.set_title("Cooling Scenario Effectiveness (top hotspot zone)")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "scenario_comparison.png"), dpi=140)
    plt.close(fig)


def _plot_optimization_map(data, optimization):
    n_rows, n_cols = int(data["row"].max() + 1), int(data["col"].max() + 1)
    grid_lst = np.full((n_rows, n_cols), np.nan)
    for _, r in data.iterrows():
        grid_lst[int(r["row"]), int(r["col"])] = r["lst_c"]

    fig, ax = plt.subplots(figsize=(8, 7))
    ax.imshow(grid_lst, cmap="inferno", origin="upper", alpha=0.85)

    intervention_colors = {
        "urban_greening": "#2ecc71", "cool_roofs": "#3498db", "green_roofs": "#1abc9c",
        "reflective_pavement": "#9b59b6", "tree_canopy_streets": "#27ae60",
    }
    row_lookup = data.set_index("cell_id")
    for name, color in intervention_colors.items():
        pts = [p.cell_id for p in optimization.placements if p.intervention == name]
        if not pts:
            continue
        rows = [row_lookup.loc[cid, "row"] for cid in pts]
        cols = [row_lookup.loc[cid, "col"] for cid in pts]
        ax.scatter(cols, rows, s=14, c=color, label=INTERVENTION_CATALOG[name]["label"],
                   edgecolors="white", linewidths=0.3)

    ax.set_title("Optimal Cooling Intervention Placement")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.08), ncol=2, fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "optimization_map.png"), dpi=140)
    plt.close(fig)


if __name__ == "__main__":
    main()
