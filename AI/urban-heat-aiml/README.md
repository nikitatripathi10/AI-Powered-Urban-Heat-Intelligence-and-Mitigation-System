# AI/ML Pipeline — Urban Heat Mitigation

AI/ML component of the Urban Heat Mitigation hackathon project: a physics-informed geospatial framework that identifies heat stress hotspots, quantifies the drivers of urban heating, and simulates/optimizes cooling interventions. No backend or frontend code — model/analysis layer only.

## Folder structure

urban-heat-aiml/
├── requirements.txt
├── src/
│   ├── data_generator.py   # synthetic geospatial grid (LST, LULC, NDVI, albedo, morphology, met data)
│   ├── model.py             # physics-informed gradient boosting LST model + driver importance
│   ├── hotspots.py          # heat stress hotspot detection & ranking
│   ├── scenarios.py         # cooling intervention simulator
│   ├── optimizer.py         # budget-constrained placement optimizer
│   └── run_pipeline.py      # runs everything end-to-end
└── outputs/                 # results from the last pipeline run

## Module summary

- **data_generator.py** — stands in for real Landsat 8 / ECOSTRESS / Sentinel-2 / ERA5 / GHSL feeds. Generates a spatially-organic synthetic city grid whose LST field follows a simplified surface-energy-balance relationship, so the physics the model later "discovers" is real physics, not noise.
- **model.py** — HistGradientBoostingRegressor trained with monotonicity constraints (LST up with impervious surface/building density/air temp, down with NDVI/albedo/sky view factor/wind/water proximity). This keeps counterfactual scenario predictions physically sane. MAE approx 0.7°C, R² approx 0.97. Reports permutation importance for driver quantification.
- **hotspots.py** — z-score heat stress index + connected-component clustering (flood fill), ranked by excess temperature times area.
- **scenarios.py** — perturbs physical features per intervention type (urban greening, cool roofs, green roofs, reflective pavement, street tree canopy) and re-runs the model to estimate cooling effect.
- **optimizer.py** — greedy knapsack over (cell, intervention) pairs, maximizing cooling per unit budget. Simple and auditable rather than a black box.

## Extending to real data

Replace `generate_city_grid()` in `data_generator.py` with real raster ingestion (rasterio + Earth Engine / NASA AppEEARS) outputting the same column schema. Retrain `model.py` on real LST — the monotonic constraints stay the same. No other module changes.
