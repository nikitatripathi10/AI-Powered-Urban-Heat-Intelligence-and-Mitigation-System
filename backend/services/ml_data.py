"""
All data logic for the THERMA backend.

Reads ML pipeline outputs (JSON files) and generates per-city hotspot
lists with deterministic city-specific lat/lng offsets so every city
looks geographically correct on the Leaflet map.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Any

from config import ML_OUTPUTS_DIR

# ─────────────────────────────────────────────────────────────────────────────
# City configuration
# ─────────────────────────────────────────────────────────────────────────────

CITY_CONFIGS: dict[str, dict] = {
    "Delhi": {
        "center": [28.6139, 77.2090],
        "zoom": 11,
        "bounds": [[28.40, 76.84], [28.88, 77.35]],
        "lat_range": (28.45, 28.80),
        "lng_range": (76.90, 77.30),
        "base_temp": 43.5,
        "population_scale": 1.0,
    },
    "Mumbai": {
        "center": [19.0760, 72.8777],
        "zoom": 11,
        "bounds": [[18.89, 72.77], [19.28, 73.04]],
        "lat_range": (18.90, 19.25),
        "lng_range": (72.78, 73.02),
        "base_temp": 38.0,
        "population_scale": 1.2,
    },
    "Bangalore": {
        "center": [12.9716, 77.5946],
        "zoom": 11,
        "bounds": [[12.83, 77.46], [13.14, 77.75]],
        "lat_range": (12.85, 13.10),
        "lng_range": (77.48, 77.72),
        "base_temp": 36.5,
        "population_scale": 0.9,
    },
    "Chennai": {
        "center": [13.0827, 80.2707],
        "zoom": 11,
        "bounds": [[12.92, 80.16], [13.24, 80.40]],
        "lat_range": (12.95, 13.20),
        "lng_range": (80.17, 80.38),
        "base_temp": 41.0,
        "population_scale": 0.95,
    },
    "Hyderabad": {
        "center": [17.3850, 78.4867],
        "zoom": 11,
        "bounds": [[17.24, 78.32], [17.56, 78.64]],
        "lat_range": (17.26, 17.54),
        "lng_range": (78.34, 78.62),
        "base_temp": 42.0,
        "population_scale": 0.85,
    },
}

LEVEL_CONFIG: dict[str, dict] = {
    "extreme": {"color": "#ff0040", "fillOpacity": 0.45, "radius": 650},
    "high":    {"color": "#ff6b2b", "fillOpacity": 0.40, "radius": 550},
    "moderate":{"color": "#ffd700", "fillOpacity": 0.35, "radius": 450},
    "safe":    {"color": "#00d4aa", "fillOpacity": 0.30, "radius": 400},
}

INTERVENTION_TYPES = [
    "water_retention_pond",
    "tree_canopy_corridor",
    "cool_roof",
    "permeable_pavement",
    "misting_station",
    "green_wall",
    "urban_park",
    "reflective_pavement",
]

DOMINANT_DRIVER: dict[str, str] = {
    "built_up":    "Impervious surfaces & rooftop waste heat",
    "road":        "Asphalt heat absorption & traffic exhaust",
    "bare_soil":   "Lack of vegetation & direct solar absorption",
    "commercial":  "High building density & AC exhaust",
    "industrial":  "Industrial waste heat & low albedo surfaces",
}

LAND_USE_BREAKDOWN: dict[str, dict] = {
    "built_up":   {"Rooftops": 45, "Roads": 25, "Bare soil": 15, "Vegetation": 10, "Water": 5},
    "road":       {"Roads": 60, "Rooftops": 20, "Bare soil": 10, "Vegetation": 8, "Water": 2},
    "bare_soil":  {"Bare soil": 55, "Rooftops": 20, "Roads": 15, "Vegetation": 8, "Water": 2},
    "commercial": {"Rooftops": 50, "Roads": 30, "Bare soil": 8, "Vegetation": 7, "Water": 5},
    "industrial": {"Industrial": 55, "Roads": 25, "Bare soil": 12, "Vegetation": 5, "Water": 3},
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_json(filename: str) -> Any:
    path = ML_OUTPUTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"ML output not found: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _temp_to_level(temp: float, base: float) -> str:
    """
    Classify hotspot severity relative to the city base temperature.
    Thresholds are intentionally tight so hotspots always span all levels.
    """
    excess = temp - base
    if excess >= 0.3:
        return "extreme"
    if excess >= 0.0:
        return "high"
    if excess >= -0.5:
        return "moderate"
    return "safe"


def _seeded_rng(city: str, hotspot_id: int) -> random.Random:
    """Deterministic per-city-hotspot RNG so results are stable across calls."""
    seed = hash(f"{city}-{hotspot_id}") & 0xFFFFFFFF
    return random.Random(seed)


def _intervention_for_zone(level: str, lulc: str, rng: random.Random) -> str:
    pool_by_level = {
        "extreme": ["water_retention_pond", "tree_canopy_corridor", "misting_station", "green_wall"],
        "high":    ["cool_roof", "tree_canopy_corridor", "urban_park", "green_wall"],
        "moderate":["permeable_pavement", "cool_roof", "reflective_pavement", "urban_park"],
        "safe":    ["permeable_pavement", "reflective_pavement", "urban_park"],
    }
    if lulc == "road":
        pool = ["tree_canopy_corridor", "reflective_pavement", "permeable_pavement"]
    else:
        pool = pool_by_level.get(level, pool_by_level["moderate"])
    return rng.choice(pool)


def _cost_for_intervention(intervention: str, rng: random.Random) -> float:
    cost_ranges = {
        "water_retention_pond": (12.0, 25.0),
        "tree_canopy_corridor": (4.0, 10.0),
        "cool_roof":            (3.0, 8.0),
        "permeable_pavement":   (5.0, 12.0),
        "misting_station":      (2.0, 6.0),
        "green_wall":           (6.0, 15.0),
        "urban_park":           (15.0, 40.0),
        "reflective_pavement":  (3.0, 7.0),
    }
    lo, hi = cost_ranges.get(intervention, (5.0, 15.0))
    return round(rng.uniform(lo, hi), 1)


def _timeline_weeks(intervention: str) -> tuple[int, int]:
    """Returns (min_weeks, max_weeks) for implementation."""
    timelines = {
        "water_retention_pond": (16, 36),
        "tree_canopy_corridor": (4, 12),
        "cool_roof":            (2, 6),
        "permeable_pavement":   (4, 10),
        "misting_station":      (1, 4),
        "green_wall":           (6, 16),
        "urban_park":           (20, 52),
        "reflective_pavement":  (2, 8),
    }
    return timelines.get(intervention, (4, 12))


def _cooling_impact(level: str, intervention: str, rng: random.Random) -> float:
    base_impact = {
        "extreme": (2.5, 4.5),
        "high":    (1.5, 3.0),
        "moderate":(0.8, 2.0),
        "safe":    (0.3, 0.8),
    }
    lo, hi = base_impact.get(level, (1.0, 2.5))
    return round(rng.uniform(lo, hi), 2)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_cities() -> list[str]:
    return list(CITY_CONFIGS.keys())


def get_city_config(city: str) -> dict:
    cfg = CITY_CONFIGS.get(city)
    if cfg is None:
        raise KeyError(f"Unknown city: {city}")
    return {
        "center": cfg["center"],
        "zoom": cfg["zoom"],
        "bounds": cfg["bounds"],
    }


def get_hotspots(city: str) -> list[dict]:
    """
    Generate deterministic city-specific hotspots by re-projecting the ML
    hotspot centroids into each city's bounding box.
    """
    cfg = CITY_CONFIGS.get(city)
    if cfg is None:
        raise KeyError(f"Unknown city: {city}")

    raw: list[dict] = _load_json("hotspots.json")

    # Compute ML output lat/lng ranges so we can normalise them
    ml_lats = [h["centroid_lat"] for h in raw]
    ml_lngs = [h["centroid_lon"] for h in raw]
    ml_lat_min, ml_lat_max = min(ml_lats), max(ml_lats)
    ml_lng_min, ml_lng_max = min(ml_lngs), max(ml_lngs)
    ml_lat_span = ml_lat_max - ml_lat_min or 1
    ml_lng_span = ml_lng_max - ml_lng_min or 1

    city_lat_min, city_lat_max = cfg["lat_range"]
    city_lng_min, city_lng_max = cfg["lng_range"]
    base_temp: float = cfg["base_temp"]
    pop_scale: float = cfg["population_scale"]

    hotspots = []
    for h in raw:
        hid = h["hotspot_id"]
        rng = _seeded_rng(city, hid)

        # Normalise ML centroid into [0,1] then project into city bounds
        lat_norm = (h["centroid_lat"] - ml_lat_min) / ml_lat_span
        lng_norm = (h["centroid_lon"] - ml_lng_min) / ml_lng_span
        lat = city_lat_min + lat_norm * (city_lat_max - city_lat_min)
        lng = city_lng_min + lng_norm * (city_lng_max - city_lng_min)

        # Add small jitter so points don't all land on a perfect grid
        lat += rng.uniform(-0.003, 0.003)
        lng += rng.uniform(-0.003, 0.003)

        # Scale ML LST to city climate
        temp = round(base_temp - 47.0 + h["mean_lst_c"] + rng.uniform(-0.8, 0.8), 1)
        temp = max(30.0, min(52.0, temp))

        level = _temp_to_level(temp, base_temp)
        lc = LEVEL_CONFIG[level]
        lulc = h.get("dominant_lulc", "built_up")
        intervention = _intervention_for_zone(level, lulc, rng)
        cost = _cost_for_intervention(intervention, rng)
        cooling = _cooling_impact(level, intervention, rng)
        t_min, t_max = _timeline_weeks(intervention)
        population = round(rng.uniform(8, 45) * 1000 * pop_scale / 1000)  # in K

        hotspots.append({
            "id": hid,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "temp": temp,
            "riskScore": min(100, round(h["severity_score"] * 2.5)),
            "level": level,
            "population": population,
            "color": lc["color"],
            "fillOpacity": lc["fillOpacity"],
            "radius": lc["radius"],
            # Enriched fields
            "lulc": lulc,
            "areaKm2": h["area_km2"],
            "meanExcessC": h["mean_excess_c"],
            "maxLstC": round(base_temp - 47.0 + h["max_lst_c"], 1),
            "dominantDriver": DOMINANT_DRIVER.get(lulc, "Urban heat island effect"),
            "landUse": LAND_USE_BREAKDOWN.get(lulc, LAND_USE_BREAKDOWN["built_up"]),
            "intervention": intervention,
            "interventionCostCrore": cost,
            "coolingImpactC": cooling,
            "timelineWeeksMin": t_min,
            "timelineWeeksMax": t_max,
            "peopleProtected": round(population * rng.uniform(0.6, 0.9)),
            "riskScoreChange": round(cooling * 8),
        })

    return hotspots


def get_scenarios() -> list[dict]:
    raw = _load_json("scenario_comparison.json")
    # Ensure all expected keys are present
    out = []
    for s in raw:
        out.append({
            "intervention": s.get("intervention", ""),
            "label": s.get("label", s.get("intervention", "")),
            "n_cells_treated": s.get("n_cells_treated", 0),
            "mean_reduction_c": round(float(s.get("mean_reduction_c", 0)), 3),
            "max_reduction_c": round(float(s.get("max_reduction_c", 0)), 3),
            "baseline_mean_lst": round(float(s.get("baseline_mean_lst", 0)), 2),
            "scenario_mean_lst": round(float(s.get("scenario_mean_lst", 0)), 2),
        })
    return out


def get_optimization_result() -> dict:
    return _load_json("optimization_result.json")


def get_model_metrics() -> dict:
    return _load_json("model_metrics.json")


def run_optimization(city: str, budget: float) -> dict:
    """
    Greedy budget-constrained optimizer.
    Re-reads hotspot list, picks highest-risk zones first, assigns the best
    intervention per zone, accumulates spend until budget is exhausted.
    """
    hotspots = get_hotspots(city)
    budget_units = budget * 0.5  # slider 0-100 → ₹0-50M; divide by cost unit

    # Sort by risk descending
    sorted_hs = sorted(hotspots, key=lambda h: h["riskScore"], reverse=True)

    spent = 0.0
    placements = []
    intervention_mix: dict[str, int] = {}
    total_reduction = 0.0

    for h in sorted_hs:
        cost = h["interventionCostCrore"]
        if spent + cost > budget_units:
            continue
        spent += cost
        total_reduction += h["coolingImpactC"]
        itype = h["intervention"]
        intervention_mix[itype] = intervention_mix.get(itype, 0) + 1
        placements.append({
            "hotspot_id": h["id"],
            "lat": h["lat"],
            "lng": h["lng"],
            "intervention": itype,
            "intervention_label": itype.replace("_", " ").title(),
            "predicted_reduction_c": h["coolingImpactC"],
            "cost": cost,
            "people_protected": h["peopleProtected"],
        })

    return {
        "city": city,
        "budget": budget,
        "budget_used": round(spent, 1),
        "zones_treated": len(placements),
        "total_predicted_reduction_c": round(total_reduction, 2),
        "mean_hotspot_reduction_c": round(total_reduction / max(len(placements), 1), 3),
        "intervention_mix": intervention_mix,
        "placements": placements,
    }


def get_intervention_catalogue() -> list[dict]:
    return [
        {
            "id": "water_retention_pond",
            "name": "Water Retention Pond",
            "description": "Engineered wetland that retains stormwater and cools surrounding air through evapotranspiration.",
            "cost_range_crore": [12.0, 25.0],
            "cooling_effect_c": [2.5, 5.0],
            "implementation_weeks": [16, 36],
            "co_benefits": ["Flood control", "Biodiversity habitat", "Groundwater recharge"],
            "best_for": ["extreme", "high"],
            "icon": "💧",
        },
        {
            "id": "tree_canopy_corridor",
            "name": "Tree Canopy Corridor",
            "description": "Continuous tree cover along streets and transit corridors providing shade and evaporative cooling.",
            "cost_range_crore": [4.0, 10.0],
            "cooling_effect_c": [1.5, 3.5],
            "implementation_weeks": [4, 12],
            "co_benefits": ["Air quality", "Carbon sequestration", "Pedestrian comfort"],
            "best_for": ["extreme", "high", "moderate"],
            "icon": "🌳",
        },
        {
            "id": "cool_roof",
            "name": "Cool / High-Albedo Roof",
            "description": "Reflective roof coatings or materials that reduce solar heat gain in dense built-up zones.",
            "cost_range_crore": [3.0, 8.0],
            "cooling_effect_c": [0.8, 2.0],
            "implementation_weeks": [2, 6],
            "co_benefits": ["Building energy savings", "Indoor comfort"],
            "best_for": ["high", "moderate"],
            "icon": "🏠",
        },
        {
            "id": "permeable_pavement",
            "name": "Permeable Pavement",
            "description": "Porous paving systems that allow water infiltration, reducing surface temperature and runoff.",
            "cost_range_crore": [5.0, 12.0],
            "cooling_effect_c": [0.5, 1.5],
            "implementation_weeks": [4, 10],
            "co_benefits": ["Flood mitigation", "Groundwater recharge", "Reduced urban runoff"],
            "best_for": ["moderate", "safe"],
            "icon": "🪨",
        },
        {
            "id": "misting_station",
            "name": "Misting Station",
            "description": "High-pressure water misting at key pedestrian nodes for immediate local cooling.",
            "cost_range_crore": [2.0, 6.0],
            "cooling_effect_c": [2.0, 4.0],
            "implementation_weeks": [1, 4],
            "co_benefits": ["Immediate relief", "Low infrastructure requirement"],
            "best_for": ["extreme"],
            "icon": "💨",
        },
        {
            "id": "green_wall",
            "name": "Green Wall / Vertical Garden",
            "description": "Vegetation panels on building facades that insulate and cool through transpiration.",
            "cost_range_crore": [6.0, 15.0],
            "cooling_effect_c": [1.0, 2.5],
            "implementation_weeks": [6, 16],
            "co_benefits": ["Air quality", "Noise reduction", "Biodiversity"],
            "best_for": ["extreme", "high"],
            "icon": "🌿",
        },
        {
            "id": "urban_park",
            "name": "Urban Park / Green Space",
            "description": "Large green open space that acts as a cooling island for the surrounding neighbourhood.",
            "cost_range_crore": [15.0, 40.0],
            "cooling_effect_c": [3.0, 6.0],
            "implementation_weeks": [20, 52],
            "co_benefits": ["Mental health", "Biodiversity", "Recreation", "Flood buffer"],
            "best_for": ["extreme", "high", "moderate"],
            "icon": "🌱",
        },
        {
            "id": "reflective_pavement",
            "name": "Reflective / Cool Pavement",
            "description": "Light-coloured or coated road surfaces that reflect solar radiation and reduce road-surface temperatures.",
            "cost_range_crore": [3.0, 7.0],
            "cooling_effect_c": [0.4, 1.0],
            "implementation_weeks": [2, 8],
            "co_benefits": ["Reduced glare", "Urban albedo increase"],
            "best_for": ["moderate", "safe"],
            "icon": "🛣️",
        },
    ]


def get_intervention_plan(city: str, budget: float) -> dict:
    """
    Returns a structured intervention planner for a city:
    - Per-zone recommendations with cost, timeline, impact
    - Budget allocation breakdown
    - Phased implementation timeline (3 phases)
    - Cost vs impact curve
    """
    hotspots = get_hotspots(city)
    catalogue = {c["id"]: c for c in get_intervention_catalogue()}

    # Sort by risk score descending for priority
    priority_zones = sorted(hotspots, key=lambda h: h["riskScore"], reverse=True)

    budget_inr = budget * 0.5  # ₹M

    # Build per-zone plan
    zone_plans = []
    for h in priority_zones[:20]:  # top 20 zones
        cat = catalogue.get(h["intervention"], {})
        zone_plans.append({
            "zoneId": h["id"],
            "lat": h["lat"],
            "lng": h["lng"],
            "level": h["level"],
            "riskScore": h["riskScore"],
            "currentTemp": h["temp"],
            "population": h["population"],
            "intervention": h["intervention"],
            "interventionName": cat.get("name", h["intervention"].replace("_", " ").title()),
            "interventionIcon": cat.get("icon", "⚙️"),
            "costCrore": h["interventionCostCrore"],
            "coolingImpactC": h["coolingImpactC"],
            "timelineWeeksMin": h["timelineWeeksMin"],
            "timelineWeeksMax": h["timelineWeeksMax"],
            "peopleProtected": h["peopleProtected"],
            "riskScoreChange": h["riskScoreChange"],
            "dominantDriver": h["dominantDriver"],
            "lulc": h["lulc"],
            "coBenefits": cat.get("co_benefits", []),
            "streetDesc": f"Zone {h['id']} — {h['lulc'].replace('_',' ').title()} area near coordinates ({h['lat']:.4f}°N, {h['lng']:.4f}°E)",
        })

    # Budget allocation by intervention type
    allocation: dict[str, float] = {}
    for z in zone_plans:
        itype = z["intervention"]
        allocation[itype] = round(allocation.get(itype, 0) + z["costCrore"], 1)

    # Phased plan (greedy cost budget)
    phases = _build_phases(zone_plans)

    # Cost vs impact curve (sample at 10 budget points)
    curve = []
    sorted_z = sorted(zone_plans, key=lambda z: z["coolingImpactC"] / max(z["costCrore"], 0.1), reverse=True)
    cum_cost = 0.0
    cum_cooling = 0.0
    for z in sorted_z:
        cum_cost += z["costCrore"]
        cum_cooling += z["coolingImpactC"]
        curve.append({"budget": round(cum_cost, 1), "coolingC": round(cum_cooling, 2)})

    return {
        "city": city,
        "budgetMRs": budget_inr,
        "totalZones": len(hotspots),
        "zonePlans": zone_plans,
        "budgetAllocation": allocation,
        "phases": phases,
        "costImpactCurve": curve,
    }


def _build_phases(zone_plans: list[dict]) -> list[dict]:
    """Split zones into 3 phases based on implementation time and risk."""
    phase_defs = [
        {"label": "Phase 1", "period": "0–3 months",   "max_weeks": 12,  "description": "Quick wins — high impact, fast deployment"},
        {"label": "Phase 2", "period": "3–9 months",   "max_weeks": 36,  "description": "Medium-term infrastructure upgrades"},
        {"label": "Phase 3", "period": "9–18 months",  "max_weeks": 999, "description": "Long-term structural transformation"},
    ]

    phases = []
    for ph in phase_defs:
        zones = [
            z for z in zone_plans
            if z["timelineWeeksMin"] <= ph["max_weeks"]
        ]
        # De-duplicate across phases by taking only zones not yet assigned
        assigned_ids = {z["zoneId"] for p in phases for z in p["zones"]}
        zones = [z for z in zones if z["zoneId"] not in assigned_ids]

        total_cost = round(sum(z["costCrore"] for z in zones), 1)
        total_cooling = round(sum(z["coolingImpactC"] for z in zones), 2)
        total_pop = sum(z["peopleProtected"] for z in zones)

        phases.append({
            **ph,
            "zones": zones,
            "totalCostCrore": total_cost,
            "totalCoolingC": total_cooling,
            "totalPeopleProtected": total_pop,
            "zoneCount": len(zones),
        })

    return phases
