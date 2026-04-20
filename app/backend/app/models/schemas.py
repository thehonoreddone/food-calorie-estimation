"""Pydantic models for API requests and responses"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ============== Prediction Models ==============

class PredictionRequest(BaseModel):
    """Request model for URL-based prediction"""
    image_url: str = Field(..., description="URL of the image to analyze")


class PredictionResponse(BaseModel):
    """Response model for food prediction"""
    class_name: str = Field(..., description="Predicted food class name")
    confidence: float = Field(..., ge=0, le=1, description="Prediction confidence (0-1)")
    estimated_weight_grams: float = Field(..., ge=0, description="Estimated portion weight in grams")
    estimated_calories: float = Field(..., ge=0, description="Estimated calories")
    calories_min: Optional[float] = Field(None, ge=0, description="Min estimated calories")
    calories_max: Optional[float] = Field(None, ge=0, description="Max estimated calories")
    mask_base64: Optional[str] = Field(None, description="Base64-encoded segmentation mask")
    source: Optional[str] = Field(None, description="Prediction source: model, gemini, hybrid")
    macros: Optional[Dict[str, float]] = Field(None, description="Macronutrients: protein_g, carbs_g, fat_g, fiber_g")
    food_name_tr: Optional[str] = Field(None, description="Turkish food name")
    food_name_local: Optional[str] = Field(None, description="Food name in the user's requested language")
    description: Optional[str] = Field(None, description="Brief food description in the user's language")
    
    class Config:
        json_schema_extra = {
            "example": {
                "class_name": "pizza",
                "confidence": 0.92,
                "estimated_weight_grams": 150,
                "estimated_calories": 285,
                "mask_base64": "iVBORw0KGgo...",
            }
        }


class SegmentationResult(BaseModel):
    """Segmentation result for a single food item"""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    mask_base64: Optional[str] = None
    area_pixels: int = 0


class DetailedPredictionResponse(BaseModel):
    """Detailed prediction response with multiple segments"""
    primary_class: str
    segments: List[SegmentationResult]
    total_calories: float
    total_weight_grams: float
    processing_time_ms: float


# ============== Food Models ==============

class FoodBase(BaseModel):
    """Base food model"""
    class_name: str = Field(..., min_length=1, max_length=100)
    calories_per_100g: float = Field(..., ge=0, le=1000)
    default_portion_grams: float = Field(default=100, ge=0, le=2000)
    image_url: Optional[str] = None


class FoodCreate(FoodBase):
    """Model for creating a new food"""
    pass


class FoodUpdate(BaseModel):
    """Model for updating a food"""
    class_name: Optional[str] = Field(None, min_length=1, max_length=100)
    calories_per_100g: Optional[float] = Field(None, ge=0, le=1000)
    default_portion_grams: Optional[float] = Field(None, ge=0, le=2000)
    image_url: Optional[str] = None


class FoodResponse(FoodBase):
    """Food response model"""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class FoodListResponse(BaseModel):
    """Paginated food list response"""
    items: List[FoodResponse]
    total: int
    page: int = 1
    page_size: int = 50


# ============== Health Models ==============

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "healthy"
    version: str
    environment: str = "development"
    models_loaded: bool
    model_classes: int = 0
    gpu_available: bool = False
    memory_usage_mb: Optional[float] = None
    python_version: Optional[str] = None
    timestamp: datetime
