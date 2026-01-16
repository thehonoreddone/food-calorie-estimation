"""
Prediction History Router
Endpoints for managing user prediction history
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger

from app.routers.auth import get_current_user, require_auth
from app.services.prediction_history_service import prediction_history_service


router = APIRouter(prefix="/history", tags=["Prediction History"])


class PredictionSummary(BaseModel):
    id: str
    food_class: str
    calories: float
    weight_grams: float
    confidence: float
    created_at: str
    image_url: Optional[str] = None


class PredictionListResponse(BaseModel):
    success: bool
    predictions: List[Dict[str, Any]]
    total: int


class DailySummaryResponse(BaseModel):
    success: bool
    date: str
    total_calories: float
    predictions_count: int
    foods: List[Dict[str, Any]]


@router.get("/predictions", response_model=PredictionListResponse)
async def get_predictions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(require_auth)
):
    """
    Get user's prediction history
    
    - **limit**: Maximum number of results (1-100)
    - **offset**: Offset for pagination
    """
    try:
        predictions = await prediction_history_service.get_user_predictions(
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        return PredictionListResponse(
            success=True,
            predictions=predictions,
            total=len(predictions)
        )
        
    except Exception as e:
        logger.error(f"Error getting predictions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prediction history"
        )


@router.get("/predictions/{prediction_id}")
async def get_prediction(
    prediction_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Get a single prediction by ID
    """
    try:
        prediction = await prediction_history_service.get_prediction(prediction_id)
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        
        # Check ownership
        if prediction.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return {
            "success": True,
            "prediction": prediction
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prediction"
        )


@router.delete("/predictions/{prediction_id}")
async def delete_prediction(
    prediction_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Delete a prediction
    """
    try:
        result = await prediction_history_service.delete_prediction(
            prediction_id=prediction_id,
            user_id=user_id
        )
        
        if result:
            return {
                "success": True,
                "message": "Prediction deleted"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found or access denied"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prediction"
        )


@router.get("/daily", response_model=DailySummaryResponse)
async def get_daily_summary(
    date: Optional[str] = Query(default=None, description="Date in YYYY-MM-DD format"),
    user_id: str = Depends(require_auth)
):
    """
    Get daily calorie summary
    
    - **date**: Date in YYYY-MM-DD format (defaults to today)
    """
    try:
        summary = await prediction_history_service.get_daily_summary(
            user_id=user_id,
            date=date
        )
        
        return DailySummaryResponse(
            success=True,
            date=summary.get("date", ""),
            total_calories=summary.get("total_calories", 0),
            predictions_count=summary.get("predictions_count", 0),
            foods=summary.get("foods", [])
        )
        
    except Exception as e:
        logger.error(f"Error getting daily summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get daily summary"
        )


@router.get("/stats")
async def get_user_stats(user_id: str = Depends(require_auth)):
    """
    Get user's overall statistics
    """
    try:
        from firebase_admin import firestore
        db = firestore.client()
        
        user_doc = db.collection("users").document(user_id).get()
        
        if user_doc.exists:
            data = user_doc.to_dict()
            return {
                "success": True,
                "stats": {
                    "total_predictions": data.get("total_predictions", 0),
                    "total_calories_tracked": data.get("total_calories_tracked", 0),
                    "last_prediction_at": data.get("last_prediction_at"),
                    "created_at": data.get("created_at")
                }
            }
        else:
            return {
                "success": True,
                "stats": {
                    "total_predictions": 0,
                    "total_calories_tracked": 0,
                    "last_prediction_at": None,
                    "created_at": None
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user stats"
        )
