import { create } from "zustand";
import { FoodItem, CreateFoodInput, UpdateFoodInput } from "@/types/food";
import { foodService } from "@/services/foodService";

interface FoodState {
  foods: FoodItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  
  // Actions
  fetchFoods: () => Promise<void>;
  addFood: (input: CreateFoodInput) => Promise<FoodItem>;
  updateFood: (id: string, input: UpdateFoodInput) => Promise<FoodItem>;
  deleteFood: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useFoodStore = create<FoodState>((set, get) => ({
  foods: [],
  loading: false,
  error: null,
  searchQuery: "",

  fetchFoods: async () => {
    set({ loading: true, error: null });
    try {
      const foods = await foodService.getAllFoods();
      set({ foods, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch foods",
        loading: false,
      });
    }
  },

  addFood: async (input: CreateFoodInput) => {
    set({ loading: true, error: null });
    try {
      const newFood = await foodService.createFood(input);
      set((state) => ({
        foods: [...state.foods, newFood].sort((a, b) =>
          a.class_name.localeCompare(b.class_name)
        ),
        loading: false,
      }));
      return newFood;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add food",
        loading: false,
      });
      throw error;
    }
  },

  updateFood: async (id: string, input: UpdateFoodInput) => {
    set({ loading: true, error: null });
    try {
      const updatedFood = await foodService.updateFood(id, input);
      set((state) => ({
        foods: state.foods.map((food) =>
          food.id === id ? updatedFood : food
        ),
        loading: false,
      }));
      return updatedFood;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update food",
        loading: false,
      });
      throw error;
    }
  },

  deleteFood: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await foodService.deleteFood(id);
      set((state) => ({
        foods: state.foods.filter((food) => food.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete food",
        loading: false,
      });
      throw error;
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
}));
