"""
Food Calorie Estimation Backend
FastAPI + YOLO Segmentation Pipeline
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from loguru import logger
import sys
import io

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import AppException
from app.routers import predict, foods, health
from app.routers.auth import router as auth_router
from app.routers.history import router as history_router
from app.services.model_service import model_service
from app.services.calorie_service import calorie_service
from app.services.prediction_service import prediction_service


# Force UTF-8 output on Windows (prevents UnicodeEncodeError for emojis in loguru)
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Configure loguru
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG" if settings.DEBUG else "INFO",
)
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG",
)


# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting Food Calorie Estimation API...")
    logger.info(f"   Environment: {settings.APP_ENV}")
    
    # Preload ML models
    try:
        await model_service.load_models()
        await calorie_service.initialize()
        
        # Try to load legacy pipeline for better accuracy
        legacy_loaded = await prediction_service.initialize_legacy()
        if legacy_loaded:
            logger.info("✅ Legacy pipeline loaded (EfficientNet + FoodSeg103)")
        else:
            logger.info("📦 Using YOLO-only pipeline")
        
        # Initialize Gemini Vision API fallback
        gemini_loaded = await prediction_service.initialize_gemini()
        if gemini_loaded:
            logger.info("✅ Gemini Vision API fallback enabled")
        else:
            logger.info("📦 Gemini fallback disabled (set GEMINI_API_KEY to enable)")
        
        logger.info("✅ ML models and data loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load ML models or data: {e}")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down API...")


# Create FastAPI app — docs disabled in production
app = FastAPI(
    title="Food Calorie Estimation API",
    description="AI-powered food recognition, segmentation, and calorie estimation",
    version="1.0.0",
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.openapi_url,
    lifespan=lifespan,
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware — no wildcard "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Global exception handler (RFC 7807 style) ──────────────
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Standardized error response for all AppExceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": type(exc).__name__,
            "title": exc.message,
            "status": exc.status_code,
            "detail": exc.message,
            "instance": str(request.url),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions — never leak stack traces in prod"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    detail = str(exc) if not settings.is_production else "An internal error occurred"
    return JSONResponse(
        status_code=500,
        content={
            "type": "InternalServerError",
            "title": "Internal Server Error",
            "status": 500,
            "detail": detail,
            "instance": str(request.url),
        },
    )


# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"])
app.include_router(history_router, prefix="/api/v1", tags=["History"])
app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])
app.include_router(foods.router, prefix="/api/v1", tags=["Foods"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Food Calorie Estimation API",
        "version": "1.0.0",
        "status": "running",
        "docs": settings.docs_url,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
