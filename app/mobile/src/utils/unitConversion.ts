/**
 * Unit Conversion Utilities for Nutrino App
 * ──────────────────────────────────────────
 * All data is STORED in metric (kg / cm / grams).
 * Conversions happen ONLY at the UI display/input layer.
 */

export type UnitSystem = 'metric' | 'imperial';

// ─── Weight: kg ↔ lbs ────────────────────────────────────────────────────────

/** Convert kg to lbs, rounded to 1 decimal */
export const kgToLbs = (kg: number): number =>
  Math.round(kg * 2.20462 * 10) / 10;

/** Convert lbs to kg, rounded to 1 decimal */
export const lbsToKg = (lbs: number): number =>
  Math.round((lbs / 2.20462) * 10) / 10;

// ─── Height: cm ↔ ft + inches ───────────────────────────────────────────────

/** Convert cm to { ft, inches } */
export const cmToFtIn = (cm: number): { ft: number; inches: number } => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle rounding edge: 12 inches → carry 1 ft
  if (inches === 12) return { ft: ft + 1, inches: 0 };
  return { ft, inches };
};

/** Convert ft + inches to cm, rounded to nearest integer */
export const ftInToCm = (ft: number, inches: number): number =>
  Math.round((ft * 12 + inches) * 2.54);

// ─── Food weight: grams ↔ oz ─────────────────────────────────────────────────

/** Convert grams to oz, rounded to 1 decimal */
export const gramsToOz = (g: number): number =>
  Math.round(g * 0.035274 * 10) / 10;

/** Convert oz to grams, rounded to integer */
export const ozToGrams = (oz: number): number =>
  Math.round(oz / 0.035274);

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Format a weight (stored in kg) for display.
 * @param kg - weight in kilograms
 * @param system - 'metric' → "70 kg" | 'imperial' → "154.3 lbs"
 */
export const formatWeight = (kg: number, system: UnitSystem): string =>
  system === 'imperial' ? `${kgToLbs(kg)} lbs` : `${kg} kg`;

/**
 * Format height (stored in cm) for display.
 * @param cm - height in centimetres
 * @param system - 'metric' → "175 cm" | 'imperial' → "5'9""
 */
export const formatHeight = (cm: number, system: UnitSystem): string => {
  if (system === 'imperial') {
    const { ft, inches } = cmToFtIn(cm);
    return `${ft}'${inches}"`;
  }
  return `${cm} cm`;
};

/**
 * Format food portion weight (stored in grams) for display.
 * @param grams - weight in grams
 * @param system - 'metric' → "250g" | 'imperial' → "8.8 oz"
 */
export const formatFoodWeight = (grams: number, system: UnitSystem): string =>
  system === 'imperial' ? `${gramsToOz(grams)} oz` : `${grams}g`;

/**
 * Parse a weight input string to kg (metric storage).
 * @param value - string number entered by user
 * @param system - the unit system the user is entering in
 */
export const parseWeightToKg = (value: string, system: UnitSystem): number => {
  const num = parseFloat(value.replace(',', '.')) || 0;
  return system === 'imperial' ? lbsToKg(num) : num;
};

/**
 * Get the unit label for weight input.
 */
export const weightUnitLabel = (system: UnitSystem): string =>
  system === 'imperial' ? 'lbs' : 'kg';

/**
 * Get the unit label for height input.
 */
export const heightUnitLabel = (system: UnitSystem): string =>
  system === 'imperial' ? 'ft / in' : 'cm';

/**
 * Display a weight value in the user's preferred unit (without unit suffix).
 * @param kg - weight in kilograms
 * @param system
 */
export const weightValueForDisplay = (kg: number, system: UnitSystem): string =>
  system === 'imperial' ? String(kgToLbs(kg)) : String(kg);

/**
 * Parse height input to cm for metric storage.
 * In metric: single number (cm).
 * In imperial: two numbers (ft + inches).
 */
export const parseHeightToCm = (ft: number, inches: number, system: UnitSystem): number => {
  if (system === 'imperial') return ftInToCm(ft, inches);
  // In metric mode, 'ft' param is actually the cm value
  return ft;
};
