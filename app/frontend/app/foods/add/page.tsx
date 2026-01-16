"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FoodForm } from "@/components/foods/FoodForm";

export default function AddFoodPage() {
  const router = useRouter();

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
          <h1 className="text-xl font-bold">Add New Food</h1>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 p-4">
        <FoodForm mode="create" />
      </div>
    </div>
  );
}
