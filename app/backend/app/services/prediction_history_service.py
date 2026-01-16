"""
Prediction History Service
Stores and retrieves user prediction history from Firestore
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import base64
import firebase_admin
from firebase_admin import firestore, storage
from loguru import logger


class PredictionHistoryService:
    """Service to manage prediction history in Firestore"""
    
    def __init__(self):
        self.db = None
        self.bucket = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Firebase clients"""
        try:
            if firebase_admin._apps:
                self.db = firestore.client()
                try:
                    self.bucket = storage.bucket()
                except:
                    pass
                logger.info("PredictionHistoryService: Firestore client initialized")
        except Exception as e:
            logger.error(f"PredictionHistoryService initialization error: {e}")
    
    async def save_prediction(
        self,
        user_id: str,
        prediction_result: Dict[str, Any],
        image_data: Optional[bytes] = None
    ) -> Optional[str]:
        """
        Save a prediction result to Firestore
        
        Args:
            user_id: User's Firebase UID
            prediction_result: The prediction result dict
            image_data: Optional image bytes to store
        
        Returns:
            Prediction ID if successful, None otherwise
        """
        if not self.db:
            logger.warning("Firestore not available")
            return None
        
        try:
            prediction_id = str(uuid.uuid4())
            
            # Upload image to Storage if provided
            image_url = None
            if image_data and self.bucket:
                try:
                    blob_path = f"predictions/{user_id}/{prediction_id}.jpg"
                    blob = self.bucket.blob(blob_path)
                    blob.upload_from_string(image_data, content_type="image/jpeg")
                    blob.make_public()
                    image_url = blob.public_url
                except Exception as e:
                    logger.warning(f"Failed to upload image: {e}")
            
            # Prepare prediction document
            prediction_doc = {
                "id": prediction_id,
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "timestamp": firestore.SERVER_TIMESTAMP,
                
                # Prediction results
                "food_class": prediction_result.get("food_class", "unknown"),
                "confidence": prediction_result.get("confidence", 0),
                "weight_grams": prediction_result.get("weight_grams", 0),
                "calories": prediction_result.get("calories", 0),
                "calories_min": prediction_result.get("calories_min", 0),
                "calories_max": prediction_result.get("calories_max", 0),
                
                # Additional data
                "image_url": image_url,
                "segmentation_mask": None,  # Don't store large base64 data
                "warnings": prediction_result.get("warnings", []),
                
                # Metadata
                "model_version": "1.0",
                "processing_time_ms": prediction_result.get("processing_time_ms", 0)
            }
            
            # Save to Firestore
            self.db.collection("predictions").document(prediction_id).set(prediction_doc)
            
            # Update user stats
            user_ref = self.db.collection("users").document(user_id)
            user_ref.update({
                "total_predictions": firestore.Increment(1),
                "total_calories_tracked": firestore.Increment(prediction_result.get("calories", 0)),
                "last_prediction_at": datetime.utcnow().isoformat()
            })
            
            logger.info(f"Prediction saved: {prediction_id} for user {user_id}")
            return prediction_id
            
        except Exception as e:
            logger.error(f"Error saving prediction: {e}")
            return None
    
    async def get_user_predictions(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get user's prediction history
        
        Args:
            user_id: User's Firebase UID
            limit: Maximum number of results
            offset: Offset for pagination
        
        Returns:
            List of prediction documents
        """
        if not self.db:
            logger.warning("Firestore not available")
            return []
        
        try:
            query = (
                self.db.collection("predictions")
                .where("user_id", "==", user_id)
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .offset(offset)
            )
            
            docs = query.stream()
            predictions = []
            
            for doc in docs:
                data = doc.to_dict()
                # Remove server timestamp (not serializable)
                if "timestamp" in data:
                    del data["timestamp"]
                predictions.append(data)
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error getting predictions: {e}")
            return []
    
    async def get_prediction(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single prediction by ID
        """
        if not self.db:
            return None
        
        try:
            doc = self.db.collection("predictions").document(prediction_id).get()
            if doc.exists:
                data = doc.to_dict()
                if "timestamp" in data:
                    del data["timestamp"]
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting prediction: {e}")
            return None
    
    async def delete_prediction(self, prediction_id: str, user_id: str) -> bool:
        """
        Delete a prediction (only if owned by user)
        """
        if not self.db:
            return False
        
        try:
            doc_ref = self.db.collection("predictions").document(prediction_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return False
            
            data = doc.to_dict()
            if data.get("user_id") != user_id:
                logger.warning(f"User {user_id} tried to delete prediction {prediction_id} owned by {data.get('user_id')}")
                return False
            
            # Delete image from storage if exists
            if self.bucket and data.get("image_url"):
                try:
                    blob_path = f"predictions/{user_id}/{prediction_id}.jpg"
                    blob = self.bucket.blob(blob_path)
                    blob.delete()
                except:
                    pass
            
            # Delete document
            doc_ref.delete()
            
            # Update user stats
            calories = data.get("calories", 0)
            user_ref = self.db.collection("users").document(user_id)
            user_ref.update({
                "total_predictions": firestore.Increment(-1),
                "total_calories_tracked": firestore.Increment(-calories)
            })
            
            logger.info(f"Prediction deleted: {prediction_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting prediction: {e}")
            return False
    
    async def get_daily_summary(self, user_id: str, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get daily summary for a user
        
        Args:
            user_id: User's Firebase UID
            date: Date string (YYYY-MM-DD), defaults to today
        
        Returns:
            Summary dict with total calories, predictions count, etc.
        """
        if not self.db:
            return {"total_calories": 0, "predictions_count": 0, "foods": []}
        
        try:
            if not date:
                date = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Query predictions for the day
            start_date = f"{date}T00:00:00"
            end_date = f"{date}T23:59:59"
            
            query = (
                self.db.collection("predictions")
                .where("user_id", "==", user_id)
                .where("created_at", ">=", start_date)
                .where("created_at", "<=", end_date)
            )
            
            docs = query.stream()
            
            total_calories = 0
            predictions_count = 0
            foods = []
            
            for doc in docs:
                data = doc.to_dict()
                total_calories += data.get("calories", 0)
                predictions_count += 1
                foods.append({
                    "id": data.get("id"),
                    "food_class": data.get("food_class"),
                    "calories": data.get("calories"),
                    "created_at": data.get("created_at")
                })
            
            return {
                "date": date,
                "total_calories": total_calories,
                "predictions_count": predictions_count,
                "foods": foods
            }
            
        except Exception as e:
            logger.error(f"Error getting daily summary: {e}")
            return {"total_calories": 0, "predictions_count": 0, "foods": []}


# Singleton instance
prediction_history_service = PredictionHistoryService()
