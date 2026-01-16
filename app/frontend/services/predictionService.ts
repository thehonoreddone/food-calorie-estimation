import { apiClient } from "./apiClient";
import { PredictionResponse } from "@/types/prediction";

export const predictionService = {
  /**
   * Send image to FastAPI backend for prediction
   */
  async predict(imageFile: File): Promise<PredictionResponse> {
    const formData = new FormData();
    formData.append("file", imageFile);

    const response = await apiClient.post<PredictionResponse>(
      "/api/v1/predict/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  /**
   * Get prediction by URL (for already uploaded images)
   */
  async predictFromUrl(imageUrl: string): Promise<PredictionResponse> {
    const response = await apiClient.post<PredictionResponse>(
      "/api/v1/predict/url/",
      { image_url: imageUrl }
    );

    return response.data;
  },

  /**
   * Health check for the prediction API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get("/health");
      return response.status === 200;
    } catch {
      return false;
    }
  },
};
