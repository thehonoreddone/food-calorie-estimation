"""Foods CRUD router"""
from typing import List

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.schemas import (
    FoodCreate,
    FoodUpdate,
    FoodResponse,
    FoodListResponse,
)
from app.domain.entities import FoodEntity
from app.services.food_repository import food_repository

router = APIRouter()


def entity_to_response(entity: FoodEntity) -> FoodResponse:
    """Convert domain entity to response model"""
    return FoodResponse(
        id=entity.id,
        class_name=entity.class_name,
        calories_per_100g=entity.calories_per_100g,
        default_portion_grams=entity.default_portion_grams,
        image_url=entity.image_url,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


@router.get("/foods/", response_model=FoodListResponse)
async def list_foods(
    page: int = 1,
    page_size: int = 50,
    search: str = None,
):
    """
    List all food items.
    
    Supports pagination and optional search by name.
    """
    foods = await food_repository.get_all()
    
    # Filter by search if provided
    if search:
        search_lower = search.lower()
        foods = [f for f in foods if search_lower in f.class_name.lower()]
    
    # Sort by name
    foods.sort(key=lambda f: f.class_name)
    
    # Paginate
    total = len(foods)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = foods[start:end]
    
    return FoodListResponse(
        items=[entity_to_response(f) for f in paginated],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/foods/{food_id}", response_model=FoodResponse)
async def get_food(food_id: str):
    """
    Get a specific food item by ID.
    """
    food = await food_repository.get_by_id(food_id)
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food with ID '{food_id}' not found",
        )
    
    return entity_to_response(food)


@router.post("/foods/", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
async def create_food(food: FoodCreate):
    """
    Create a new food item.
    """
    # Check if food with same name exists
    existing = await food_repository.get_by_class_name(food.class_name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Food with name '{food.class_name}' already exists",
        )
    
    entity = FoodEntity(
        id="",  # Will be assigned by repository
        class_name=food.class_name,
        calories_per_100g=food.calories_per_100g,
        default_portion_grams=food.default_portion_grams,
        image_url=food.image_url,
    )
    
    created = await food_repository.create(entity)
    logger.info(f"Created food: {created.class_name} (ID: {created.id})")
    
    return entity_to_response(created)


@router.put("/foods/{food_id}", response_model=FoodResponse)
async def update_food(food_id: str, food: FoodUpdate):
    """
    Update an existing food item.
    """
    existing = await food_repository.get_by_id(food_id)
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food with ID '{food_id}' not found",
        )
    
    # Update fields
    if food.class_name is not None:
        existing.class_name = food.class_name
    if food.calories_per_100g is not None:
        existing.calories_per_100g = food.calories_per_100g
    if food.default_portion_grams is not None:
        existing.default_portion_grams = food.default_portion_grams
    if food.image_url is not None:
        existing.image_url = food.image_url
    
    updated = await food_repository.update(food_id, existing)
    logger.info(f"Updated food: {updated.class_name} (ID: {food_id})")
    
    return entity_to_response(updated)


@router.delete("/foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food(food_id: str):
    """
    Delete a food item.
    """
    existing = await food_repository.get_by_id(food_id)
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food with ID '{food_id}' not found",
        )
    
    await food_repository.delete(food_id)
    logger.info(f"Deleted food: {existing.class_name} (ID: {food_id})")
    
    return None
