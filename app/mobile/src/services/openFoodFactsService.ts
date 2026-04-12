// ─── Open Food Facts API Service ────────────────────────────────────────────
// Free API for food nutrition data - no API key required
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
// ────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'NutrinoApp/1.0 (nutrino-thesis-project)';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  'proteins_100g'?: number;
  'carbohydrates_100g'?: number;
  'fat_100g'?: number;
  'fiber_100g'?: number;
  'sugars_100g'?: number;
  'saturated-fat_100g'?: number;
  'sodium_100g'?: number;
}

export interface OFFProduct {
  product_name?: string;
  product_name_tr?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
  image_front_small_url?: string;
  categories_tags?: string[];
  nutriscore_grade?: string;
}

export interface OFFSearchResult {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

/** Normalized food result from Open Food Facts */
export interface OFFFood {
  name: string;
  brand?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  servingSize?: string;
  servingGrams?: number;
  imageUrl?: string;
  nutriscoreGrade?: string;
}

// ─── Search cache (avoid hitting rate limits) ───────────────────────────────

const searchCache = new Map<string, { results: OFFFood[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Fetch helpers ──────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.warn('[OFF] Fetch failed:', e);
    return null;
  }
}

// ─── Parse serving size to grams ────────────────────────────────────────────

function parseServingGrams(servingSize?: string, servingQty?: number): number | undefined {
  if (servingQty && servingQty > 0) return Math.round(servingQty);
  if (!servingSize) return undefined;
  // Try parsing patterns like "200g", "200 g", "200ml", "1 portion (200g)", etc.
  const match = servingSize.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram)/i);
  if (match) return Math.round(parseFloat(match[1]));
  const mlMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*(?:ml|ML)/i);
  if (mlMatch) return Math.round(parseFloat(mlMatch[1]));
  return undefined;
}

// ─── Normalize product to OFFFood ───────────────────────────────────────────

function normalizeProduct(p: OFFProduct): OFFFood | null {
  const name = p.product_name_tr || p.product_name || p.product_name_en;
  if (!name?.trim()) return null;
  const n = p.nutriments;
  const kcal = n?.['energy-kcal_100g'] ?? n?.['energy-kcal'] ?? 0;
  if (kcal <= 0) return null; // Skip items without calorie data

  return {
    name: name.trim(),
    brand: p.brands?.split(',')[0]?.trim(),
    kcalPer100g: Math.round(kcal),
    proteinPer100g: Math.round((n?.proteins_100g ?? 0) * 10) / 10,
    carbsPer100g: Math.round((n?.carbohydrates_100g ?? 0) * 10) / 10,
    fatPer100g: Math.round((n?.fat_100g ?? 0) * 10) / 10,
    fiberPer100g: Math.round((n?.fiber_100g ?? 0) * 10) / 10,
    servingSize: p.serving_size,
    servingGrams: parseServingGrams(p.serving_size, p.serving_quantity),
    imageUrl: p.image_front_small_url,
    nutriscoreGrade: p.nutriscore_grade,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search foods in Open Food Facts database
 * Rate limited: ~10 req/min - use debounced calls, not search-as-you-type
 */
export async function searchOFF(query: string, maxResults = 10): Promise<OFFFood[]> {
  const key = query.toLowerCase().trim();
  if (!key || key.length < 2) return [];

  // Check cache
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.results;

  // Search with Turkish locale priority, then global
  const encoded = encodeURIComponent(key);
  const fields = 'product_name,product_name_tr,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments,image_front_small_url,categories_tags,nutriscore_grade';
  
  // Try Turkish products first
  const trUrl = `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${maxResults * 2}&fields=${fields}&lc=tr&cc=tr`;
  
  const data = await fetchJSON<OFFSearchResult>(trUrl);
  if (!data?.products) return [];

  const results: OFFFood[] = [];
  for (const p of data.products) {
    const normalized = normalizeProduct(p);
    if (normalized) {
      results.push(normalized);
      if (results.length >= maxResults) break;
    }
  }

  // If too few results, try global search
  if (results.length < 3) {
    const globalUrl = `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${maxResults * 2}&fields=${fields}`;
    const globalData = await fetchJSON<OFFSearchResult>(globalUrl);
    if (globalData?.products) {
      for (const p of globalData.products) {
        const normalized = normalizeProduct(p);
        if (normalized && !results.some(r => r.name === normalized.name && r.brand === normalized.brand)) {
          results.push(normalized);
          if (results.length >= maxResults) break;
        }
      }
    }
  }

  // Cache results
  searchCache.set(key, { results, ts: Date.now() });
  return results;
}

/**
 * Get product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<OFFFood | null> {
  const data = await fetchJSON<{ product?: OFFProduct }>(`${BASE_URL}/api/v2/product/${barcode}?fields=product_name,product_name_tr,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments,image_front_small_url,categories_tags,nutriscore_grade`);
  if (!data?.product) return null;
  return normalizeProduct(data.product);
}

/**
 * Calculate calories from OFF food
 */
export function calculateOFFCalories(food: OFFFood, grams: number): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  const factor = grams / 100;
  return {
    calories: Math.round(food.kcalPer100g * factor),
    protein: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
    fat: Math.round(food.fatPer100g * factor * 10) / 10,
  };
}
