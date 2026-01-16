export interface FoodItem {
  id: string;
  class_name: string;
  calories_per_100g: number;
  default_portion_grams: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFoodInput {
  class_name: string;
  calories_per_100g: number;
  default_portion_grams: number;
  image_url?: string;
}

export interface UpdateFoodInput {
  class_name?: string;
  calories_per_100g?: number;
  default_portion_grams?: number;
  image_url?: string;
}

export interface FoodFilters {
  search?: string;
  minCalories?: number;
  maxCalories?: number;
}
