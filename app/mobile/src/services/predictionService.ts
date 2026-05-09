import { apiClient } from "./apiClient";
import { PredictionResponse, ImagePickerResult } from "../types";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

/**
 * Resize image before upload to reduce bandwidth and speed up inference.
 * Max dimension: 1024px (preserves aspect ratio).
 * Compresses to 80% JPEG quality.
 */
async function compressImage(uri: string): Promise<string> {
  try {
    // Get file info to check size
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return uri;

    // If file is already small (<300KB), skip compression
    if (info.size && info.size < 300 * 1024) return uri;

    // Resize to max 1024px width and compress
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  } catch (e) {
    console.warn("[predictionService] Image compression failed, using original:", e);
    return uri;
  }
}

export const predictionService = {
  /**
   * Send image to FastAPI backend for prediction.
   * Images are compressed before upload to reduce bandwidth.
   * 120s timeout for ML inference on mobile networks.
   */
  async predict(image: ImagePickerResult, language: string = 'tr'): Promise<PredictionResponse> {
    const formData = new FormData();
    const imageUri = await compressImage(image.uri);

    if (Platform.OS === "web") {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append("file", blob, image.name || "photo.jpg");
    } else {
      const filePayload = {
        uri: imageUri,
        type: image.type || "image/jpeg",
        name: image.name || "photo.jpg",
      };
      formData.append("file", filePayload as unknown as Blob);
    }

    // Append language so Gemini returns food names in the user's language
    formData.append('language', language);

    const apiResponse = await apiClient.post<PredictionResponse>(
      "/api/v1/predict/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000, // 120s for ML inference on slow networks
      }
    );

    return apiResponse.data;
  },

  /**
   * Health check with 5s timeout (doesn't block UI)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get("/health", { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  },
};

export default predictionService;
