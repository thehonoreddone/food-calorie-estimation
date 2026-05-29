"""Prediction router - handles image upload and food prediction"""
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from PIL import Image
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address

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

import re
from urllib.parse import urlparse

router = APIRouter()
security = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)


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



@router.post("/predict/", response_model=PredictionResponse)
@limiter.limit(settings.RATE_LIMIT_PREDICT)
async def predict_food(
    request: Request,
    file: UploadFile = File(..., description="Food image to analyze"),
    language: Optional[str] = Form(default="tr", description="ISO language code for localized food name (e.g. 'en', 'tr', 'de')"),
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
    
    # Sanitize language input
    safe_language = (language or "tr").lower().strip()[:5]
    
    logger.info(f"Processing image: {file.filename} ({image.size[0]}x{image.size[1]}) [lang={safe_language}]")
    
    # Run prediction
    try:
        result = await prediction_service.predict(image, include_mask=True, language=safe_language)
        
        # Save to history if user is authenticated
        if user_id:
            try:
                prediction_data = {
                    "food_class": result.class_name,
                    "confidence": result.confidence,
                    "weight_grams": result.estimated_weight_grams,
                    "calories": result.estimated_calories,
                    "calories_min": getattr(result, 'calories_min', None),
                    "calories_max": getattr(result, 'calories_max', None),
                    "warnings": []
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
    Only public HTTP/HTTPS URLs are accepted (no file://, localhost, or private IPs).
    """
    import httpx
    
    # ── SSRF Protection ──
    parsed = urlparse(request.image_url)
    # Block non-HTTP schemes
    if parsed.scheme not in ('http', 'https'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only HTTP/HTTPS URLs are allowed",
        )
    # Block private/internal IPs and localhost
    hostname = parsed.hostname or ''
    BLOCKED_HOSTS = re.compile(
        r'^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.0\.0\.0|\[::1\])'
    )
    if BLOCKED_HOSTS.match(hostname):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Private/internal URLs are not allowed",
        )
    
    # Check if model is loaded
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded yet. Please try again shortly.",
        )
    
    try:
        # Download image
        async with httpx.AsyncClient() as client:
            response = await client.get(request.image_url, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
        
        # Validate content type
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL does not point to a valid image",
            )
        
        # Check size (10MB max)
        if len(response.content) > settings.MAX_UPLOAD_SIZE:
            raise FileTooLargeException(settings.MAX_UPLOAD_SIZE // (1024 * 1024))
        
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
    except (HTTPException, FileTooLargeException):
        raise
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
