import json
import os
import asyncio
from typing import Dict, List, Any, Optional
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, storage, firestore
from loguru import logger
from app.core.config import settings

class FirebaseConfigService:
    """Service to fetch configuration from Firebase"""
    
    def __init__(self):
        self.bucket = None
        self.db = None
        self._initialize_firebase()
        
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK if not already initialized"""
        try:
            if not firebase_admin._apps:
                cred = None
                
                # Priority 1: JSON string from environment variable (Render Secret Files / env var)
                env_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
                if env_json:
                    import json as _json
                    try:
                        service_info = _json.loads(env_json)
                        cred = credentials.Certificate(service_info)
                        logger.info("Firebase Admin: credentials loaded from FIREBASE_SERVICE_ACCOUNT_JSON env var")
                    except Exception as e:
                        logger.warning(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
                
                # Priority 2: JSON file on disk
                if not cred:
                    cred_path = Path(settings.FIREBASE_CREDENTIALS_PATH)
                    if not cred_path.exists():
                        # Try looking in config folder
                        cred_path = Path("config") / settings.FIREBASE_CREDENTIALS_PATH
                    
                    if cred_path.exists():
                        cred = credentials.Certificate(str(cred_path))
                        logger.info(f"Firebase Admin: credentials loaded from {cred_path}")
                    else:
                        logger.warning(f"Firebase credentials not found at {cred_path}")
                
                if cred:
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': f"{settings.FIREBASE_PROJECT_ID}.firebasestorage.app"
                    })
                    logger.info("Firebase Admin initialized successfully")
            
            try:
                self.bucket = storage.bucket()
                self.db = firestore.client()
            except Exception as e:
                logger.warning(f"Failed to get Firebase clients: {e}")
                
        except Exception as e:
            logger.error(f"Error initializing Firebase: {e}")

    async def get_json_config(self, filename: str) -> Optional[Any]:
        """Fetch a JSON config file from Firebase Storage"""
        if not self.bucket:
            logger.warning("Firebase Storage bucket not available")
            return None
            
        try:
            blob = self.bucket.blob(f"config/{filename}")
            if blob.exists():
                content = blob.download_as_text()
                return json.loads(content)
            else:
                logger.warning(f"Config file {filename} not found in Firebase Storage")
                return None
        except Exception as e:
            logger.error(f"Error fetching {filename} from Firebase: {e}")
            return None

    async def get_class_names(self) -> Optional[List[str]]:
        return await self.get_json_config("class_names.json")

    async def get_densities(self) -> Optional[Dict[str, float]]:
        return await self.get_json_config("densities.json")

    async def get_kcal_per_gram(self) -> Optional[Dict[str, float]]:
        return await self.get_json_config("kcal_per_gram.json")

firebase_config_service = FirebaseConfigService()
