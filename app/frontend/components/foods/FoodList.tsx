"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { useFoodStore } from "@/state/foodStore";
import { cn } from "@/lib/utils";

export function FoodList() {
  const { foods, loading, error, searchQuery, fetchFoods } = useFoodStore();

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const filteredFoods = foods.filter((food) =>
    food.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => fetchFoods()}
          className="mt-4 text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (filteredFoods.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchQuery ? "No foods found matching your search" : "No foods yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredFoods.map((food, index) => (
        <Link
          key={food.id}
          href={`/foods/${food.id}`}
          className={cn(
            "flex items-center justify-between p-4 bg-card rounded-xl border",
            "hover:border-primary transition-colors",
            "animate-in fade-in slide-in-from-bottom-2"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center gap-3">
            {/* Food Icon/Image */}
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-2xl">
              {food.image_url ? (
                <img
                  src={food.image_url}
                  alt={food.class_name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                "🍽️"
              )}
            </div>

            {/* Food Info */}
            <div>
              <h3 className="font-semibold capitalize">{food.class_name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>{food.calories_per_100g} kcal/100g</span>
              </div>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
