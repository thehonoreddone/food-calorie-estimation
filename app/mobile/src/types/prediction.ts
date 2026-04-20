export interface Macros {
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
  fiber: number;     // grams
}

export interface PredictionResponse {
  class_name: string;
  confidence: number;
  estimated_weight_grams: number;
  estimated_calories: number;
  calories_min?: number;
  calories_max?: number;
  mask_base64?: string;
  source?: "model" | "gemini" | "hybrid" | "barcode";
  macros?: Macros;
  food_name_tr?: string;
  food_name_local?: string;  // Food name in the user's requested language
  description?: string;
}

export interface PredictionHistory {
  id: string;
  prediction: PredictionResponse;
  image_url: string;
  created_at: string;
}

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
}
