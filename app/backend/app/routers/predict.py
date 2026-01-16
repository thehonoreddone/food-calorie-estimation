"""Prediction router - handles image upload and food prediction"""
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from PIL import Image
from loguru import logger

from app.models.schemas import PredictionResponse, PredictionRequest
from app.services.prediction_service import prediction_service
from app.services.model_service import model_service
from app.services.prediction_history_service import prediction_history_service
from app.routers.auth import get_current_user
from app.core.config import settings
from app.core.exceptions import (
    ModelNotLoadedException,
    ImageProcessingException,
    InvalidFileTypeException,
    FileTooLargeException,
)

router = APIRouter()
security = HTTPBearer(auto_error=False)


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file extension
    if file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise InvalidFileTypeException(settings.ALLOWED_EXTENSIONS)
    
    # Check content type
    if file.content_type:
        if not file.content_type.startswith("image/"):
            raise InvalidFileTypeException(settings.ALLOWED_EXTENSIONS)


async def load_image(file: UploadFile) -> Image.Image:
    """Load and validate image from uploaded file"""
    try:
        contents = await file.read()
        
        # Check file size
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise FileTooLargeException(settings.MAX_UPLOAD_SIZE // (1024 * 1024))
        
        # Open image
        image = Image.open(BytesIO(contents))
        
        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        return image
        
    except Exception as e:
        logger.error(f"Failed to load image: {e}")
        raise ImageProcessingException(str(e))


@router.post("/predict/", response_model=PredictionResponse)
async def predict_food(
    file: UploadFile = File(..., description="Food image to analyze"),
    user_id: Optional[str] = Depends(get_current_user),
):
    """
    Analyze a food image and predict calories.
    
    Upload an image file (JPEG, PNG, WebP) and receive:
    - Detected food class
    - Confidence score
    - Estimated weight in grams
    - Estimated calories
    - Segmentation mask (base64)
    
    If authenticated, the prediction will be saved to history.
    
    **Example:**
    ```
    curl -X POST -F "file=@food.jpg" http://localhost:8000/api/v1/predict/
    ```
    """
    # Check if model is loaded
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded yet. Please try again shortly.",
        )
    
    # Validate file
    validate_file(file)
    
    # Load image and get raw bytes for storage
    contents = await file.read()
    
    # Check file size
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise FileTooLargeException(settings.MAX_UPLOAD_SIZE // (1024 * 1024))
    
    try:
        image = Image.open(BytesIO(contents))
        if image.mode != "RGB":
            image = image.convert("RGB")
    except Exception as e:
        logger.error(f"Failed to load image: {e}")
        raise ImageProcessingException(str(e))
    
    logger.info(f"Processing image: {file.filename} ({image.size[0]}x{image.size[1]})")
    
    # Run prediction
    try:
        result = await prediction_service.predict(image, include_mask=True)
        
        # Save to history if user is authenticated
        if user_id:
            try:
                prediction_data = {
                    "food_class": result.food_class,
                    "confidence": result.confidence,
                    "weight_grams": result.weight_grams,
                    "calories": result.calories,
                    "calories_min": result.calories_min,
                    "calories_max": result.calories_max,
                    "warnings": result.warnings if result.warnings else []
                }
                await prediction_history_service.save_prediction(
                    user_id=user_id,
                    prediction_result=prediction_data,
                    image_data=contents
                )
                logger.info(f"Prediction saved to history for user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to save prediction to history: {e}")
        
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )


@router.post("/predict/url/", response_model=PredictionResponse)
async def predict_from_url(request: PredictionRequest):
    """
    Analyze a food image from URL.
    
    Provide an image URL and receive prediction results.
    """
    import httpx
    
    # Check if model is loaded
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded yet. Please try again shortly.",
        )
    
    try:
        # Download image
        async with httpx.AsyncClient() as client:
            response = await client.get(request.image_url, timeout=30.0)
            response.raise_for_status()
        
        # Load image
        image = Image.open(BytesIO(response.content))
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        logger.info(f"Processing image from URL: {request.image_url[:50]}...")
        
        # Run prediction
        result = await prediction_service.predict(image, include_mask=True)
        return result
        
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to download image: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )


@router.get("/predict/classes")
async def get_available_classes():
    """
    Get list of all food classes the model can detect.
    """
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded yet.",
        )
    
    return {
        "classes": model_service.class_names,
        "count": len(model_service.class_names),
    }
