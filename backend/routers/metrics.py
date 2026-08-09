from fastapi import APIRouter, HTTPException
from services.ml_data import get_model_metrics

router = APIRouter(prefix="/api/model-metrics", tags=["metrics"])


@router.get("")
def model_metrics():
    try:
        return get_model_metrics()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
