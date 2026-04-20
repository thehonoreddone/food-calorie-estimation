/**
 * Barcode / OpenFoodFacts Service
 * ─────────────────────────────────
 * Looks up a barcode via the Open Food Facts API (free, no key needed).
 * Returns a normalized NutritionResult so it can feed directly into
 * the same result UI used by the AI scanner.
 *
 * API docs: https://world.openfoodfacts.org/data
 */

import { PredictionResponse } from '../types/prediction';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarcodeResult {
  found: boolean;
  barcode: string;
  productName: string;
  brand: string;
  imageFront?: string;
  servingSizeG: number;         // grams per serving (default 100g)
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  ingredients?: string;
}

// ─── OFF Response shape (partial) ─────────────────────────────────────────────

interface OFFProduct {
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  serving_size?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    energy_100g?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
  ingredients_text?: string;
}

interface OFFResponse {
  status: number;        // 1 = found, 0 = not found
  product?: OFFProduct;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a serving size string like "30 g" → grams number */
function parseServingGrams(raw?: string): number {
  if (!raw) return 100;
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  if (match) return parseFloat(match[1].replace(',', '.'));
  return 100;
}

/** Convert kcal/100g for a given gram amount */
function scaleNutrient(per100g: number, grams: number): number {
  return Math.round((per100g * grams) / 100);
}

// ─── Service ──────────────────────────────────────────────────────────────────

const OFF_BASE = 'https://world.openfoodfacts.org/api/v3/product';

export const barcodeService = {
  /**
   * Fetch product info from Open Food Facts.
   * Returns null if not found or on network error.
   */
  async lookup(barcode: string): Promise<BarcodeResult | null> {
    try {
      const url = `${OFF_BASE}/${barcode}.json?fields=product_name,brands,image_front_url,serving_size,nutriments,ingredients_text`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) return null;

      const json: OFFResponse = await resp.json();
      if (json.status !== 1 || !json.product) return null;

      const p = json.product;
      const n = p.nutriments ?? {};

      // kcal/100g — try 'energy-kcal_100g' first, then 'energy-kcal', then derive from kJ
      const cal100 =
        n['energy-kcal_100g'] ??
        n['energy-kcal'] ??
        (n.energy_100g ? n.energy_100g / 4.184 : 0);

      return {
        found: true,
        barcode,
        productName:    p.product_name  || 'Bilinmeyen Ürün',
        brand:          p.brands        || '',
        imageFront:     p.image_front_url,
        servingSizeG:   parseServingGrams(p.serving_size),
        caloriesPer100g: Math.round(cal100),
        proteinPer100g:  Math.round(n.proteins_100g ?? 0),
        carbsPer100g:    Math.round(n.carbohydrates_100g ?? 0),
        fatPer100g:      Math.round(n.fat_100g ?? 0),
        fiberPer100g:    Math.round(n.fiber_100g ?? 0),
        ingredients:    p.ingredients_text,
      };
    } catch (err) {
      console.warn('[barcodeService] lookup failed:', err);
      return null;
    }
  },

  /**
   * Convert a BarcodeResult into a PredictionResponse so it can be displayed
   * by the same result UI used for camera-based AI scans.
   * @param result  BarcodeResult from lookup()
   * @param grams   Portion size in grams (default = product's serving size)
   */
  toPrediction(result: BarcodeResult, grams?: number): PredictionResponse {
    const g = grams ?? result.servingSizeG;
    return {
      class_name:              result.productName.toLowerCase().replace(/ /g, '_'),
      confidence:              1.0,                  // we trust the barcode DB
      estimated_weight_grams:  g,
      estimated_calories:      scaleNutrient(result.caloriesPer100g, g),
      calories_min:            undefined,
      calories_max:            undefined,
      source:                  'barcode' as any,
      food_name_tr:            result.productName,
      food_name_local:         result.productName,   // already in product's language
      macros: {
        protein: scaleNutrient(result.proteinPer100g, g),
        carbs:   scaleNutrient(result.carbsPer100g,   g),
        fat:     scaleNutrient(result.fatPer100g,     g),
        fiber:   scaleNutrient(result.fiberPer100g,   g),
      },
    };
  },
};

export default barcodeService;
