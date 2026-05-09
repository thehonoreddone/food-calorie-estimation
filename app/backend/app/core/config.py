"""Core configuration module"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Environment
    APP_ENV: str = "development"  # development | staging | production
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # CORS — NO wildcard "*" for security
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://10.0.2.2:8000",
    ]
    # Add production domains via env: CORS_ORIGINS=["https://nutrino.app"]
    
    # Rate limiting
    RATE_LIMIT_PREDICT: str = "30/minute"  # Prediction endpoint
    RATE_LIMIT_DEFAULT: str = "120/minute"  # Default endpoints
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # ML Models
    YOLO_MODEL_PATH: str = "models/food_seg_best.pt"
    YOLO_FALLBACK_MODEL: str = "models/food201_seg_best.pt"
    CONFIDENCE_THRESHOLD: float = 0.25
    IOU_THRESHOLD: float = 0.45
    MODEL_DOWNLOAD_URL: str = ""  # Set via env: MODEL_DOWNLOAD_URL=https://drive.google.com/...
    MODEL_FALLBACK_DOWNLOAD_URL: str = ""  # Optional: download URL for fallback model
    
    # Gemini Vision API (fallback classifier)
    GEMINI_API_KEY: str = ""  # Set via env: GEMINI_API_KEY=your_key
    GEMINI_HIGH_CONFIDENCE_THRESHOLD: float = 0.80  # >80%: trust model directly
    GEMINI_CONFIDENCE_THRESHOLD: float = 0.50  # 50-80%: return model + background Gemini; <50%: wait for Gemini
    GEMINI_CACHE_TTL: int = 300  # Gemini result cache TTL in seconds
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"
    FIREBASE_PROJECT_ID: str = "food-calorie-estimation-2e3bd"
    
    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379"
    USE_REDIS: bool = False
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "webp"]
    
    # Paths
    UPLOAD_DIR: str = "uploads"
    MODELS_DIR: str = "models"
    
    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"
    
    @property
    def docs_url(self):
        return None if self.is_production else "/docs"
    
    @property
    def redoc_url(self):
        return None if self.is_production else "/redoc"
    
    @property
    def openapi_url(self):
        return None if self.is_production else "/openapi.json"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.MODELS_DIR, exist_ok=True)
os.makedirs("logs", exist_ok=True)
