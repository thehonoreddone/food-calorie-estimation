"""Food repository implementation using Firestore"""
from typing import List, Optional
from datetime import datetime
import uuid
from loguru import logger

from app.domain.entities import FoodEntity, FoodType
from app.domain.interfaces import IFoodRepository


class InMemoryFoodRepository(IFoodRepository):
    """In-memory food repository for development"""
    
    def __init__(self):
        self._foods: dict[str, FoodEntity] = {}
        self._initialize_default_foods()
    
    def _initialize_default_foods(self) -> None:
        """Initialize with some default foods"""
        default_foods = [
            FoodEntity(
                id="1",
                class_name="pizza",
                calories_per_100g=266,
                default_portion_grams=200,
                density_g_per_cm3=0.9,
            ),
            FoodEntity(
                id="2",
                class_name="burger",
                calories_per_100g=295,
                default_portion_grams=250,
                density_g_per_cm3=0.85,
            ),
            FoodEntity(
                id="3",
                class_name="salad",
                calories_per_100g=20,
                default_portion_grams=150,
                density_g_per_cm3=0.3,
            ),
            FoodEntity(
                id="4",
                class_name="pasta",
                calories_per_100g=131,
                default_portion_grams=200,
                density_g_per_cm3=0.8,
            ),
            FoodEntity(
                id="5",
                class_name="rice",
                calories_per_100g=130,
                default_portion_grams=180,
                density_g_per_cm3=0.9,
            ),
        ]
        
        for food in default_foods:
            self._foods[food.id] = food
    
    async def get_all(self) -> List[FoodEntity]:
        return list(self._foods.values())
    
    async def get_by_id(self, food_id: str) -> Optional[FoodEntity]:
        return self._foods.get(food_id)
    
    async def get_by_class_name(self, class_name: str) -> Optional[FoodEntity]:
        for food in self._foods.values():
            if food.class_name.lower() == class_name.lower():
                return food
        return None
    
    async def create(self, food: FoodEntity) -> FoodEntity:
        food.id = str(uuid.uuid4())
        food.created_at = datetime.now()
        food.updated_at = datetime.now()
        self._foods[food.id] = food
        return food
    
    async def update(
        self, food_id: str, food: FoodEntity
    ) -> Optional[FoodEntity]:
        if food_id not in self._foods:
            return None
        
        existing = self._foods[food_id]
        existing.class_name = food.class_name or existing.class_name
        existing.calories_per_100g = food.calories_per_100g or existing.calories_per_100g
        existing.default_portion_grams = food.default_portion_grams or existing.default_portion_grams
        existing.image_url = food.image_url or existing.image_url
        existing.updated_at = datetime.now()
        
        return existing
    
    async def delete(self, food_id: str) -> bool:
        if food_id in self._foods:
            del self._foods[food_id]
            return True
        return False


class FirestoreFoodRepository(IFoodRepository):
    """Firestore-based food repository"""
    
    def __init__(self):
        self._db = None
        self._collection_name = "foods"
    
    def _get_db(self):
        """Lazy-load Firestore client"""
        if self._db is None:
            try:
                import firebase_admin
                from firebase_admin import credentials, firestore
                
                # Initialize if not already done
                if not firebase_admin._apps:
                    cred = credentials.Certificate("firebase-credentials.json")
                    firebase_admin.initialize_app(cred)
                
                self._db = firestore.client()
            except Exception as e:
                logger.error(f"Failed to initialize Firestore: {e}")
                raise
        return self._db
    
    async def get_all(self) -> List[FoodEntity]:
        db = self._get_db()
        docs = db.collection(self._collection_name).stream()
        
        foods = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            foods.append(self._dict_to_entity(data))
        
        return foods
    
    async def get_by_id(self, food_id: str) -> Optional[FoodEntity]:
        db = self._get_db()
        doc = db.collection(self._collection_name).document(food_id).get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        data["id"] = doc.id
        return self._dict_to_entity(data)
    
    async def get_by_class_name(self, class_name: str) -> Optional[FoodEntity]:
        db = self._get_db()
        docs = (
            db.collection(self._collection_name)
            .where("class_name", "==", class_name)
            .limit(1)
            .stream()
        )
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return self._dict_to_entity(data)
        
        return None
    
    async def create(self, food: FoodEntity) -> FoodEntity:
        db = self._get_db()
        
        data = self._entity_to_dict(food)
        data["created_at"] = datetime.now()
        data["updated_at"] = datetime.now()
        
        doc_ref = db.collection(self._collection_name).add(data)
        food.id = doc_ref[1].id
        food.created_at = data["created_at"]
        food.updated_at = data["updated_at"]
        
        return food
    
    async def update(
        self, food_id: str, food: FoodEntity
    ) -> Optional[FoodEntity]:
        db = self._get_db()
        doc_ref = db.collection(self._collection_name).document(food_id)
        
        if not doc_ref.get().exists:
            return None
        
        data = self._entity_to_dict(food)
        data["updated_at"] = datetime.now()
        
        doc_ref.update(data)
        
        return await self.get_by_id(food_id)
    
    async def delete(self, food_id: str) -> bool:
        db = self._get_db()
        doc_ref = db.collection(self._collection_name).document(food_id)
        
        if not doc_ref.get().exists:
            return False
        
        doc_ref.delete()
        return True
    
    def _entity_to_dict(self, entity: FoodEntity) -> dict:
        return {
            "class_name": entity.class_name,
            "calories_per_100g": entity.calories_per_100g,
            "default_portion_grams": entity.default_portion_grams,
            "image_url": entity.image_url,
            "food_type": entity.food_type.value if entity.food_type else "solid",
            "density_g_per_cm3": entity.density_g_per_cm3,
        }
    
    def _dict_to_entity(self, data: dict) -> FoodEntity:
        return FoodEntity(
            id=data.get("id", ""),
            class_name=data.get("class_name", ""),
            calories_per_100g=data.get("calories_per_100g", 100),
            default_portion_grams=data.get("default_portion_grams", 100),
            image_url=data.get("image_url"),
            food_type=FoodType(data.get("food_type", "solid")),
            density_g_per_cm3=data.get("density_g_per_cm3", 0.85),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


# Use in-memory repository by default, switch to Firestore in production
food_repository = InMemoryFoodRepository()
