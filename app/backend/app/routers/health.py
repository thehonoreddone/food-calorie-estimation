"""Health check router"""
from datetime import datetime
from fastapi import APIRouter

from app.models.schemas import HealthResponse
from app.services.model_service import model_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status and model loading state.
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        models_loaded=model_service.is_loaded(),
        timestamp=datetime.now(),
    )


@router.get("/ready")
async def readiness_check():
    """
    Readiness check for Kubernetes/container orchestration.
    Returns 200 only when models are loaded.
    """
    if not model_service.is_loaded():
        return {"status": "not_ready", "message": "Models still loading"}
    return {"status": "ready"}


@router.get("/live")
async def liveness_check():
    """
    Liveness check - always returns 200 if service is running.
    """
    return {"status": "alive"}
