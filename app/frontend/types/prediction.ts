export interface PredictionResponse {
  class_name: string;
  confidence: number;
  estimated_weight_grams: number;
  estimated_calories: number;
  mask_base64?: string;
}

export interface PredictionHistory {
  id: string;
  prediction: PredictionResponse;
  image_url: string;
  created_at: string;
}
