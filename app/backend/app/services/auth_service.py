"""
Firebase Authentication Service
Handles user registration, login, and token verification
"""
from typing import Optional, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import auth, firestore
from loguru import logger
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """User registration model"""
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response model"""
    uid: str
    email: str
    display_name: Optional[str] = None
    email_verified: bool = False
    created_at: Optional[str] = None


class AuthService:
    """Firebase Authentication Service"""
    
    def __init__(self):
        self.db = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Firestore client"""
        try:
            if firebase_admin._apps:
                self.db = firestore.client()
                logger.info("AuthService: Firestore client initialized")
        except Exception as e:
            logger.error(f"AuthService initialization error: {e}")
    
    async def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """
        Create a new user in Firebase Auth
        """
        try:
            # Create user in Firebase Auth
            user = auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.display_name or user_data.email.split('@')[0]
            )
            
            # Create user document in Firestore
            if self.db:
                user_doc = {
                    "uid": user.uid,
                    "email": user.email,
                    "display_name": user.display_name,
                    "created_at": datetime.utcnow().isoformat(),
                    "total_predictions": 0,
                    "total_calories_tracked": 0
                }
                self.db.collection("users").document(user.uid).set(user_doc)
            
            # Generate custom token for frontend
            custom_token = auth.create_custom_token(user.uid)
            
            logger.info(f"User created: {user.email}")
            
            return {
                "success": True,
                "user": {
                    "uid": user.uid,
                    "email": user.email,
                    "display_name": user.display_name
                },
                "token": custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token
            }
            
        except auth.EmailAlreadyExistsError:
            logger.warning(f"Email already exists: {user_data.email}")
            return {"success": False, "error": "Email already exists"}
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return {"success": False, "error": str(e)}
    
    async def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Firebase ID token
        """
        try:
            decoded_token = auth.verify_id_token(id_token)
            return {
                "uid": decoded_token["uid"],
                "email": decoded_token.get("email"),
                "email_verified": decoded_token.get("email_verified", False)
            }
        except auth.InvalidIdTokenError:
            logger.warning("Invalid ID token")
            return None
        except auth.ExpiredIdTokenError:
            logger.warning("Expired ID token")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    async def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        """
        Get user information by UID
        """
        try:
            user = auth.get_user(uid)
            
            # Get additional data from Firestore
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.display_name,
                "email_verified": user.email_verified,
                "created_at": user.user_metadata.creation_timestamp
            }
            
            if self.db:
                doc = self.db.collection("users").document(uid).get()
                if doc.exists:
                    firestore_data = doc.to_dict()
                    user_data.update({
                        "total_predictions": firestore_data.get("total_predictions", 0),
                        "total_calories_tracked": firestore_data.get("total_calories_tracked", 0)
                    })
            
            return user_data
            
        except auth.UserNotFoundError:
            logger.warning(f"User not found: {uid}")
            return None
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    async def delete_user(self, uid: str) -> bool:
        """
        Delete a user
        """
        try:
            auth.delete_user(uid)
            
            # Delete from Firestore
            if self.db:
                self.db.collection("users").document(uid).delete()
            
            logger.info(f"User deleted: {uid}")
            return True
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False
    
    async def login_user(self, login_data: UserLogin) -> Optional[Dict[str, Any]]:
        """
        Login user - Get user by email and create custom token
        
        Note: Firebase Admin SDK doesn't support password verification directly.
        This method returns user info for email that exists and creates a custom token.
        For full password auth, use Firebase Client SDK on frontend.
        """
        try:
            # Get user by email
            user = auth.get_user_by_email(login_data.email)
            
            # Generate custom token
            custom_token = auth.create_custom_token(user.uid)
            
            # Get Firestore data
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.display_name,
                "created_at": None
            }
            
            if self.db:
                doc = self.db.collection("users").document(user.uid).get()
                if doc.exists:
                    firestore_data = doc.to_dict()
                    user_data["created_at"] = firestore_data.get("created_at")
            
            user_data["custom_token"] = custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token
            
            logger.info(f"User login: {user.email}")
            return user_data
            
        except auth.UserNotFoundError:
            logger.warning(f"User not found for login: {login_data.email}")
            return None
        except Exception as e:
            logger.error(f"Login error: {e}")
            return None


# Singleton instance
auth_service = AuthService()
