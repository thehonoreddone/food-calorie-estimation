"use client";

import { Suspense } from "react";
import { FoodList } from "@/components/foods/FoodList";
import { FoodListSkeleton } from "@/components/foods/FoodListSkeleton";
import { AddFoodButton } from "@/components/foods/AddFoodButton";
import { Search } from "lucide-react";
import { useFoodStore } from "@/state/foodStore";

export default function FoodsPage() {
  const { searchQuery, setSearchQuery } = useFoodStore();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 safe-top sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-3">Food Database</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </header>

      {/* Food List */}
      <div className="flex-1 p-4">
        <Suspense fallback={<FoodListSkeleton />}>
          <FoodList />
        </Suspense>
      </div>

      {/* Add Food FAB */}
      <AddFoodButton />
    </div>
  );
}
