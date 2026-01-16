"use client";

import { Flame, Scale, Target, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PredictionResponse } from "@/types/prediction";

interface PredictionResultProps {
  prediction: PredictionResponse;
  imagePreview: string | null;
  onReset: () => void;
}

export function PredictionResult({
  prediction,
  imagePreview,
  onReset,
}: PredictionResultProps) {
  const confidencePercent = Math.round(prediction.confidence * 100);
  
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      {/* Result Header */}
      <div className="bg-primary/10 rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">Detected Food</p>
        <h2 className="text-2xl font-bold capitalize mt-1">
          {prediction.class_name}
        </h2>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">
            {confidencePercent}% confident
          </span>
        </div>
      </div>

      {/* Image with Mask Overlay */}
      <div className="relative rounded-xl overflow-hidden">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Analyzed food"
            className="w-full h-48 object-cover"
          />
        )}
        {prediction.mask_base64 && (
          <img
            src={`data:image/png;base64,${prediction.mask_base64}`}
            alt="Segmentation mask"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
      </div>

      {/* Nutrition Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">Calories</span>
          </div>
          <p className="text-3xl font-bold mt-2">
            {Math.round(prediction.estimated_calories)}
          </p>
          <p className="text-xs text-muted-foreground">kcal</p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Scale className="w-5 h-5" />
            <span className="text-sm font-medium">Weight</span>
          </div>
          <p className="text-3xl font-bold mt-2">
            {Math.round(prediction.estimated_weight_grams)}
          </p>
          <p className="text-xs text-muted-foreground">grams</p>
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="p-4 bg-muted/50 rounded-xl space-y-2">
        <h3 className="font-semibold text-sm">Calculation</h3>
        <p className="text-sm text-muted-foreground">
          {prediction.estimated_weight_grams}g × {Math.round(prediction.estimated_calories / prediction.estimated_weight_grams * 100)} kcal/100g ={" "}
          <span className="font-semibold text-foreground">
            {Math.round(prediction.estimated_calories)} kcal
          </span>
        </p>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Confidence Level</span>
          <span className="font-medium">{confidencePercent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Reset Button */}
      <Button onClick={onReset} variant="outline" className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" />
        Scan Another Food
      </Button>
    </div>
  );
}
