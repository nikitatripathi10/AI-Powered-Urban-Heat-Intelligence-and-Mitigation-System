from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.ml_data import get_optimization_result, run_optimization

router = APIRouter(prefix="/api/optimization", tags=["optimization"])


class OptimizationRequest(BaseModel):
    city: str = Field(..., description="City name, e.g. Delhi")
    budget: float = Field(..., ge=0, le=100, description="Budget slider value 0-100")


@router.get("")
def optimization_result():
    """Return the pre-computed optimization result from the ML pipeline."""
    try:
        return get_optimization_result()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/run")
def run_optimization_endpoint(body: OptimizationRequest):
    """Run a live greedy budget-constrained optimizer for the given city & budget."""
    try:
        return run_optimization(body.city, body.budget)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
