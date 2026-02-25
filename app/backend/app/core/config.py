"""Core configuration module"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://172.19.112.1:3000",
        "*",  # Allow all for development
    ]
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # ML Models
    YOLO_MODEL_PATH: str = "models/food201_seg_best.pt"
    YOLO_FALLBACK_MODEL: str = "yolov8n-seg.pt"
    CONFIDENCE_THRESHOLD: float = 0.25
    IOU_THRESHOLD: float = 0.45
    
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
