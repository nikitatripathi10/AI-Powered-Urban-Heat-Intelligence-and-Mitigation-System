# TEAM - Vision League
# THERMA — Urban Heat Mitigation Intelligence Platform

THERMA gives city planners an AI-powered dashboard to identify urban heat-stress hotspots across Indian cities, prioritise cooling interventions, and generate actionable investment plans — all backed by a physics-informed Random Forest ML model.

---

## Live demo (Docker — one command)

```bash
git clone <repo-url>
cd HackMatrixV2
docker compose up --build
```

| Service | URL |
|---------|-----|
| Dashboard | **http://localhost:3000** |
| API docs (Swagger) | http://localhost:3000/api/docs |
| Backend direct | http://localhost:8000 |

---

## Feature overview

### Dashboard
The main view. Five Indian cities, interactive heat map, live stats.

| Panel | What it does |
|-------|-------------|
| **Navbar** | Live stats — zones mapped, critical zones, people at risk, avg temperature. City switcher. Links to Analytics and Catalogue. |
| **Sidebar** | Layer toggles (composite risk, LST, vegetation, population). Risk-level filters. Zone search. Live charts (risk pie, temperature bar, heat distribution). Hour-of-day timeline slider. |
| **Map** | Leaflet dark-tile map. Colour-coded hotspot circles — red (extreme) → orange (high) → yellow (moderate) → teal (safe). Click any circle to select it. Fly-to animation on city change. Simulation pulse mode. |
| **Zone Diagnostics** (right panel) | **Overview tab** — temperature, risk score, population, risk bar, AI recommendations, quick intervention chip. **Deep Dive tab** — dominant heat driver, land-use breakdown pie, area/excess LST/peak LST metadata, 4-stat impact grid, cost-effectiveness ranked action steps. |
| **Bottom panel** | Budget slider (₹0–50M). **Projected Outcomes** tab — temp reduction + protected population. **Allocation** tab — budget-split pie chart + priority-ranked spend list. **Cost / Impact** tab — diminishing-returns curve. Run AI Optimization button. Export PDF. Simulation toggle. |

### Planner tab (centre panel)
Per-zone intervention plan. Click any zone card to expand full details:
- **What to build** — specific intervention type with icon
- **Where** — street-level description + lat/lng
- **Cost** — ₹Crore per intervention
- **Timeline** — implementation weeks range
- **Impact** — °C cooling, people protected, risk score change
- **Co-benefits** — flood control, biodiversity, air quality chips

### Timeline tab (centre panel)
Gantt-style 18-month rollout plan:
- Animated Gantt bars on a time ruler (0 → 18 months)
- Phase 1 (0–3 months): Quick wins — fast, high-impact interventions
- Phase 2 (3–9 months): Medium-term infrastructure
- Phase 3 (9–18 months): Long-term structural transformation
- Expand each phase to see all scheduled zones with cost + cooling

### Intervention Catalogue (modal)
Click **📋 Catalogue** in the navbar:
- All 8 intervention types with icon, description, cost range, cooling effectiveness
- Animated cooling effectiveness bar
- Filter by zone risk level
- Co-benefits, implementation timeline, best-suited levels

### Analytics page
Click **▲ Analytics** in the navbar:
- ML model performance — MAE, R², feature list with icons
- Interactive horizontal bar chart — toggle scenarios on/off
- "What if I only had budget for N interventions?" selector
- Cumulative cooling projection label
- Full data table

### Export PDF
Three-page planning report:
1. **Cover + Executive Summary** — stat boxes, outcome projections at 6 and 18 months
2. **Top 5 Priority Zones** — per-zone temp/risk/population, intervention, cost, cooling, heat driver
3. **Budget Allocation + Recommendations** — bar chart breakdown, level-coded action plan

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 8, Framer Motion 12, Recharts 3, React Leaflet 5, CSS Modules |
| Backend | Python FastAPI 0.115, Pydantic v2, Uvicorn |
| ML pipeline | scikit-learn Random Forest, pandas, numpy, matplotlib |
| Infra | Docker + docker-compose, nginx 1.27 (reverse proxy + SPA serve) |

---

## Project structure

```
HackMatrixV2/
├── backend/
│   ├── main.py                 FastAPI app, CORS, router registration
│   ├── config.py               ML_OUTPUTS_DIR env var
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routers/
│   │   ├── cities.py           GET /api/cities, /{city}/config, /hotspots, /stats
│   │   ├── optimization.py     GET /api/optimization, POST /api/optimization/run
│   │   ├── scenarios.py        GET /api/scenarios
│   │   ├── metrics.py          GET /api/model-metrics
│   │   └── interventions.py    GET /api/interventions/catalogue, /plan/{city}
│   └── services/
│       └── ml_data.py          All data logic — city reprojection, enriched hotspots,
│                               greedy optimizer, intervention planner, phase builder
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx / App.module.css     Page router (Dashboard ↔ Analytics)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx/css        Main layout — map/planner/timeline centre tabs
│   │   │   ├── Analytics.jsx/css        Scenario comparison + model metrics
│   │   │   └── Compare.jsx              Before/after view (legacy)
│   │   ├── components/
│   │   │   ├── Navbar                   Live stats + city selector + nav buttons
│   │   │   ├── Sidebar                  Layer toggles, filters, charts, timeline
│   │   │   ├── MapPanel                 Leaflet map, hotspot circles, fly-to
│   │   │   ├── Diagnostics              Overview + Deep Dive tabs
│   │   │   ├── BottomPanel              Budget slider + 3-tab data panel + actions
│   │   │   ├── InterventionPlanner      Per-zone expandable plan cards
│   │   │   ├── PlannerTimeline          Gantt 3-phase view
│   │   │   ├── InterventionCatalogue    Full catalogue modal with filters
│   │   │   ├── StatisticsCharts         Risk pie, temp bar, heat distribution
│   │   │   ├── HeatTimeline             Hour-of-day slider
│   │   │   ├── AnimatedNumber           Smooth stat transitions
│   │   │   ├── Skeleton / Toast         Loading + notifications
│   │   │   └── SearchBar                Zone search
│   │   ├── hooks/
│   │   │   ├── useHotspots              Fetch + filter + select
│   │   │   ├── useCityStats             Aggregate stats from hotspots + budget
│   │   │   ├── useOptimization          POST /api/optimization/run
│   │   │   ├── useSimulation            Live temp mutation interval
│   │   │   ├── useHeatTimeline          Hour-of-day temp offset
│   │   │   ├── useCities                City list fetch
│   │   │   └── useNotifications         Toast queue
│   │   └── utils/
│   │       ├── api.js                   All fetch calls incl. fetchCatalogue, fetchInterventionPlan
│   │       ├── exportReport.js          3-page jsPDF planning report
│   │       ├── formatters.js            parsePopulation, formatTemperature, formatRisk
│   │       └── recommendations.js       Level-based recommendation text
│   ├── nginx.conf              Reverse-proxy /api → backend, SPA fallback
│   ├── Dockerfile              node:20-alpine build → nginx:1.27-alpine serve
│   └── vite.config.js          Dev proxy /api → localhost:8000
│
├── AI/urban-heat-aiml/
│   ├── src/
│   │   ├── run_pipeline.py     End-to-end ML pipeline
│   │   ├── data_generator.py   Synthetic 60×60 geospatial grid
│   │   ├── model.py            Physics-informed Random Forest (R²=0.974, MAE=0.73°C)
│   │   ├── hotspots.py         Hotspot detection and ranking
│   │   ├── scenarios.py        5 cooling scenario comparisons
│   │   └── optimizer.py        Budget-constrained greedy optimizer
│   └── outputs/                JSON files read by the backend
│       ├── hotspots.json
│       ├── scenario_comparison.json
│       ├── optimization_result.json
│       └── model_metrics.json
│
└── docker-compose.yml
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cities` | List of 5 supported cities |
| GET | `/api/cities/{city}/config` | Map center, zoom, bounds |
| GET | `/api/cities/{city}/hotspots` | Enriched hotspot list (temp, risk, intervention, land use, etc.) |
| GET | `/api/cities/{city}/stats` | Aggregate city stats |
| GET | `/api/scenarios` | 5 cooling scenario effectiveness data |
| GET | `/api/optimization` | Pre-computed ML optimizer result |
| POST | `/api/optimization/run` | Live greedy budget optimizer `{city, budget}` |
| GET | `/api/model-metrics` | RF model MAE, R², feature list |
| GET | `/api/interventions/catalogue` | Full catalogue of 8 intervention types |
| GET | `/api/interventions/plan/{city}?budget=65` | Per-zone plan, budget allocation, phases, curve |
| GET | `/api/health` | Health check |

---

## Data flow

```
ML pipeline (run_pipeline.py)
    └─▶ outputs/*.json

Backend (FastAPI)
    ├─ Reads hotspots.json, reprojects centroids into each city's lat/lng bounds
    ├─ Enriches each hotspot with: intervention type, cost, cooling impact,
    │  timeline, land use breakdown, dominant driver, co-benefits
    └─ /api/optimization/run — greedy budget optimizer ranks by risk,
       assigns interventions, accumulates spend

nginx (in Docker)
    └─ Proxies /api/* → backend:8000, serves React SPA for all other routes

Frontend
    ├─ useHotspots → fetch hotspots + config in parallel on city change
    ├─ useCityStats → aggregate stats from hotspot array + budget slider
    ├─ useOptimization → POST /run, patches hotspot state with reductions
    ├─ BottomPanel → fetchInterventionPlan (debounced 400ms) on budget/city change
    └─ InterventionPlanner / PlannerTimeline → fetchInterventionPlan
```

---

## Design system

Three semantic colour roles defined as CSS variables in `global.css`:

| Role | Variable | Colour | Used for |
|------|----------|--------|----------|
| Live / current | `--live-primary` | `#38bdf8` | Navbar, sidebar, map tab, live stats |
| Heat / danger | `--heat-primary` | `#f97316` | Critical zones, high temps, costs |
| Projected / future | `--future-primary` | `#4ade80` | Outcomes, optimize button, planner |

---

## Running locally (without Docker)

```bash
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Refresh ML outputs

```bash
cd AI/urban-heat-aiml
pip install -r requirements.txt
python src/run_pipeline.py
# Outputs written to AI/urban-heat-aiml/outputs/
# Restart backend to pick up new data (or it reads on every request)
```

---

## Cities supported

| City | Lat/Lng center | Base temp | Climate character |
|------|---------------|-----------|-------------------|
| Delhi | 28.61°N, 77.21°E | 43.5°C | High summer heat, dense built-up |
| Mumbai | 19.08°N, 72.88°E | 38.0°C | Coastal humidity, dense urban |
| Bangalore | 12.97°N, 77.59°E | 36.5°C | Elevated plateau, rapid urbanisation |
| Chennai | 13.08°N, 80.27°E | 41.0°C | Coastal heat, high solar radiation |
| Hyderabad | 17.39°N, 78.49°E | 42.0°C | Interior plateau, mixed land use |

---

Built for HackMatrix
