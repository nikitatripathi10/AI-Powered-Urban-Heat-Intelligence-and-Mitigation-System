from fastapi import APIRouter, HTTPException
from services.ml_data import get_scenarios

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("")
def list_scenarios():
    try:
        return {"scenarios": get_scenarios()}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
