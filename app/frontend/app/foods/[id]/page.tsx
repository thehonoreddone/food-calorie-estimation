"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Flame, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FoodItem } from "@/types/food";
import { foodService } from "@/services/foodService";
import { useFoodStore } from "@/state/foodStore";
import toast from "react-hot-toast";
import Image from "next/image";

export default function FoodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { deleteFood } = useFoodStore();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);

  const foodId = params.id as string;

  useEffect(() => {
    const loadFood = async () => {
      try {
        const data = await foodService.getFoodById(foodId);
        setFood(data);
      } catch (error) {
        toast.error("Failed to load food details");
        router.push("/foods");
      } finally {
        setLoading(false);
      }
    };

    loadFood();
  }, [foodId, router]);

  const handleDelete = async () => {
    if (!food) return;
    
    if (confirm("Are you sure you want to delete this food?")) {
      try {
        await deleteFood(food.id);
        toast.success("Food deleted successfully");
        router.push("/foods");
      } catch (error) {
        toast.error("Failed to delete food");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!food) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">Food not found</p>
        <Button onClick={() => router.push("/foods")} className="mt-4">
          Back to Foods
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with Image */}
      <div className="relative h-64 bg-muted">
        {food.image_url ? (
          <Image
            src={food.image_url}
            alt={food.class_name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">
            🍽️
          </div>
        )}
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white safe-top"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 safe-top">
          <button
            onClick={() => router.push(`/foods/${food.id}/edit`)}
            className="p-2 bg-black/50 rounded-full text-white"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-red-500/80 rounded-full text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 -mt-6 bg-background rounded-t-3xl relative">
        {/* Title */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold capitalize">{food.class_name}</h1>
          <p className="text-muted-foreground">Food Class</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Flame className="w-5 h-5" />
              <span className="text-sm font-medium">Calories</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {food.calories_per_100g}
            </p>
            <p className="text-xs text-muted-foreground">per 100g</p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Scale className="w-5 h-5" />
              <span className="text-sm font-medium">Portion</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {food.default_portion_grams}g
            </p>
            <p className="text-xs text-muted-foreground">default serving</p>
          </div>
        </div>

        {/* Calculated Calories */}
        <div className="p-4 bg-primary/10 rounded-xl">
          <h3 className="font-semibold text-primary">Per Default Serving</h3>
          <p className="text-3xl font-bold mt-2">
            {Math.round((food.calories_per_100g * food.default_portion_grams) / 100)} kcal
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Based on {food.default_portion_grams}g portion
          </p>
        </div>

        {/* Metadata */}
        <div className="p-4 bg-muted/50 rounded-xl space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-sm">{food.id}</span>
          </div>
          {food.created_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-sm">
                {new Date(food.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
