from fastapi import APIRouter, HTTPException
from services.ml_data import get_intervention_catalogue, get_intervention_plan

router = APIRouter(prefix="/api/interventions", tags=["interventions"])


@router.get("/catalogue")
def intervention_catalogue():
    """Full catalogue of available intervention types."""
    return {"catalogue": get_intervention_catalogue()}


@router.get("/plan/{city}")
def intervention_plan(city: str, budget: float = 65.0):
    """
    Detailed intervention plan for a city at a given budget (slider 0-100).
    Returns per-zone plans, budget allocation breakdown, phased timeline,
    and cost vs impact curve.
    """
    try:
        return get_intervention_plan(city, budget)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
