"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/predict/ImageUploader";
import { PredictionResult } from "@/components/predict/PredictionResult";
import { predictionService } from "@/services/predictionService";
import { PredictionResponse } from "@/types/prediction";
import toast from "react-hot-toast";

export default function PredictPage() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setPrediction(null);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePredict = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    setLoading(true);
    try {
      const result = await predictionService.predict(selectedImage);
      setPrediction(result);
      toast.success("Prediction complete!");
    } catch (error) {
      toast.error("Failed to analyze image. Please try again.");
      console.error("Prediction error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrediction(null);
  };

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
          <div>
            <h1 className="text-xl font-bold">Scan Food</h1>
            <p className="text-xs opacity-80">Upload an image to analyze</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Image Upload Section */}
        {!prediction && (
          <ImageUploader
            onImageSelect={handleImageSelect}
            imagePreview={imagePreview}
            onPredict={handlePredict}
            loading={loading}
            hasImage={!!selectedImage}
          />
        )}

        {/* Prediction Result */}
        {prediction && (
          <PredictionResult
            prediction={prediction}
            imagePreview={imagePreview}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
