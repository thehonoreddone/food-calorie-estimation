import { apiClient } from "./apiClient";
import { PredictionResponse, ImagePickerResult } from "../types";
import { Platform } from "react-native";

export interface SegmentationResult {
  segmented_image_url: string;
  mask_url?: string;
}

export const predictionService = {
  /**
   * Send image to FastAPI backend for prediction
   * 60s timeout for ML inference
   */
  async predict(image: ImagePickerResult): Promise<PredictionResponse> {
    const formData = new FormData();
    
    if (Platform.OS === "web") {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      formData.append("file", blob, image.name || "photo.jpg");
    } else {
      const filePayload = {
        uri: image.uri,
        type: image.type || "image/jpeg",
        name: image.name || "photo.jpg",
      };
      formData.append("file", filePayload as unknown as Blob);
    }

    const apiResponse = await apiClient.post<PredictionResponse>(
      "/api/v1/predict/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60s for ML inference
      }
    );

    return apiResponse.data;
  },

  /**
   * Optional segmentation step before classification.
   * Backend should return URL of background-removed image.
   */
  async segment(image: ImagePickerResult): Promise<SegmentationResult> {
    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      formData.append("file", blob, image.name || "photo.jpg");
    } else {
      const filePayload = {
        uri: image.uri,
        type: image.type || "image/jpeg",
        name: image.name || "photo.jpg",
      };
      formData.append("file", filePayload as unknown as Blob);
    }

    const apiResponse = await apiClient.post<SegmentationResult>(
      "/api/v1/segment/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      }
    );

    return apiResponse.data;
  },

  /**
   * Get prediction by URL (for already uploaded / segmented images)
   */
  async predictFromUrl(imageUrl: string): Promise<PredictionResponse> {
    const response = await apiClient.post<PredictionResponse>(
      "/api/v1/predict/url/",
      { image_url: imageUrl }
    );

    return response.data;
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
