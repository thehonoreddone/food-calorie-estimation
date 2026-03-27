"""Health check router with detailed system diagnostics"""
import sys
import platform
from datetime import datetime

from fastapi import APIRouter

from app.models.schemas import HealthResponse
from app.services.model_service import model_service
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status, model loading state, and system info.
    """
    # Memory usage
    try:
        import psutil
        process = psutil.Process()
        memory_mb = process.memory_info().rss / (1024 * 1024)
    except (ImportError, Exception):
        memory_mb = None

    # GPU info
    gpu_available = False
    try:
        import torch
        gpu_available = torch.cuda.is_available()
    except ImportError:
        pass

    return HealthResponse(
        status="healthy" if model_service.is_loaded() else "degraded",
        version="1.0.0",
        environment=settings.APP_ENV,
        models_loaded=model_service.is_loaded(),
        model_classes=len(model_service.class_names) if model_service.is_loaded() else 0,
        gpu_available=gpu_available,
        memory_usage_mb=round(memory_mb, 1) if memory_mb else None,
        python_version=platform.python_version(),
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
