from fastapi import APIRouter, HTTPException
from services.ml_data import get_cities, get_city_config, get_hotspots

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("")
def list_cities():
    return {"cities": get_cities()}


@router.get("/{city}/config")
def city_config(city: str):
    try:
        return get_city_config(city)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{city}/hotspots")
def city_hotspots(city: str):
    try:
        return {"hotspots": get_hotspots(city)}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/{city}/stats")
def city_stats(city: str):
    """Aggregate city-level statistics derived from hotspots."""
    try:
        hotspots = get_hotspots(city)
    except (KeyError, FileNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    if not hotspots:
        return {}

    total_pop = sum(h["population"] for h in hotspots)
    avg_temp = sum(h["temp"] for h in hotspots) / len(hotspots)
    avg_risk = sum(h["riskScore"] for h in hotspots) / len(hotspots)
    level_dist = {"extreme": 0, "high": 0, "moderate": 0, "safe": 0}
    for h in hotspots:
        level_dist[h["level"]] = level_dist.get(h["level"], 0) + 1

    return {
        "city": city,
        "zonesMapped": len(hotspots),
        "criticalZones": level_dist["extreme"],
        "totalPopulationK": total_pop,
        "avgTemperatureC": round(avg_temp, 1),
        "avgRiskScore": round(avg_risk),
        "levelDistribution": level_dist,
    }
