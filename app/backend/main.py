"""
Food Calorie Estimation Backend
FastAPI + YOLO Segmentation Pipeline
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from app.core.config import settings
from app.routers import predict, foods, health
from app.routers.auth import router as auth_router
from app.routers.history import router as history_router
from app.services.model_service import model_service
from app.services.calorie_service import calorie_service
from app.services.prediction_service import prediction_service


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting Food Calorie Estimation API...")
    
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


# Create FastAPI app
app = FastAPI(
    title="Food Calorie Estimation API",
    description="AI-powered food recognition, segmentation, and calorie estimation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
