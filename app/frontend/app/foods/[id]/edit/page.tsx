"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FoodForm } from "@/components/foods/FoodForm";
import { FoodItem } from "@/types/food";
import { foodService } from "@/services/foodService";
import toast from "react-hot-toast";

export default function EditFoodPage() {
  const params = useParams();
  const router = useRouter();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);

  const foodId = params.id as string;

  useEffect(() => {
    const loadFood = async () => {
      try {
        const data = await foodService.getFoodById(foodId);
        setFood(data);
      } catch (error) {
        toast.error("Failed to load food");
        router.push("/foods");
      } finally {
        setLoading(false);
      }
    };

    loadFood();
  }, [foodId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Edit Food</h1>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 p-4">
        {food && <FoodForm food={food} mode="edit" />}
      </div>
    </div>
  );
}
