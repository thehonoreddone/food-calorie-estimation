"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodItem, CreateFoodInput, UpdateFoodInput } from "@/types/food";
import { useFoodStore } from "@/state/foodStore";
import toast from "react-hot-toast";

interface FoodFormProps {
  food?: FoodItem;
  mode: "create" | "edit";
}

export function FoodForm({ food, mode }: FoodFormProps) {
  const router = useRouter();
  const { addFood, updateFood } = useFoodStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    class_name: food?.class_name || "",
    calories_per_100g: food?.calories_per_100g || 100,
    default_portion_grams: food?.default_portion_grams || 100,
    image_url: food?.image_url || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_name.trim()) {
      toast.error("Please enter a food name");
      return;
    }

    setLoading(true);
    try {
      if (mode === "create") {
        await addFood(formData as CreateFoodInput);
        toast.success("Food added successfully!");
      } else if (food) {
        await updateFood(food.id, formData as UpdateFoodInput);
        toast.success("Food updated successfully!");
      }
      router.push("/foods");
    } catch (error) {
      toast.error(`Failed to ${mode} food`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Food Name */}
      <div className="space-y-2">
        <Label htmlFor="class_name">Food Name *</Label>
        <Input
          id="class_name"
          name="class_name"
          placeholder="e.g., Baklava, Hamburger"
          value={formData.class_name}
          onChange={handleChange}
          required
        />
      </div>

      {/* Calories per 100g */}
      <div className="space-y-2">
        <Label htmlFor="calories_per_100g">Calories per 100g *</Label>
        <Input
          id="calories_per_100g"
          name="calories_per_100g"
          type="number"
          min="0"
          placeholder="150"
          value={formData.calories_per_100g}
          onChange={handleChange}
          required
        />
        <p className="text-xs text-muted-foreground">
          Enter the caloric value per 100 grams
        </p>
      </div>

      {/* Default Portion */}
      <div className="space-y-2">
        <Label htmlFor="default_portion_grams">Default Portion (grams)</Label>
        <Input
          id="default_portion_grams"
          name="default_portion_grams"
          type="number"
          min="0"
          placeholder="100"
          value={formData.default_portion_grams}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground">
          Typical serving size in grams
        </p>
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL (optional)</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          placeholder="https://example.com/food.jpg"
          value={formData.image_url}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      {formData.image_url && (
        <div className="p-4 bg-muted rounded-xl">
          <p className="text-sm text-muted-foreground mb-2">Preview</p>
          <img
            src={formData.image_url}
            alt="Preview"
            className="w-full h-32 object-cover rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <span className="animate-spin">⏳</span>
        ) : mode === "create" ? (
          "Add Food"
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  );
}
