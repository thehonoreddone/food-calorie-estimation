/**
 * Diyet Öneri Sistemi
 * Kullanıcının hedefi, diyet tercihleri ve profil bilgilerine göre
 * günlük yemek önerileri ve haftalık analiz raporu üretir.
 * 201-sınıf FOOD_DATABASE'den beslenme verisi çeker.
 */

import { Goal, ActivityLevel, DietPreference } from '../contexts/UserContext';
import {
  FOOD_DATABASE,
  FoodInfo,
  calculateCalories,
  calculateWeightGrams,
  getUnitLabel,
} from '../constants/foodDatabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MealRecommendation {
  name: string;
  calories: number;
  protein: number; // gram
  carbs: number;   // gram
  fat: number;     // gram
  portion: string; // e.g. "200g", "1 adet"
  emoji: string;
  foodKey?: string; // FOOD_DATABASE key for tracking
}

export interface DailyMealPlan {
  breakfast: MealRecommendation[];
  lunch: MealRecommendation[];
  dinner: MealRecommendation[];
  snack: MealRecommendation[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface WeeklySummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalBurned: number;
  daysTracked: number;
  calorieGoal: number;
  goalAchievedDays: number;
  trend: 'under' | 'on_track' | 'over';
  tips: string[];
}

// ─── Macro Estimation by Category ───────────────────────────────────────────
// Since FOOD_DATABASE only has kcalPer100g, we estimate macro split by category

type MacroProfile = { proteinRatio: number; carbRatio: number; fatRatio: number };

const MACRO_PROFILES: Record<FoodInfo['category'], MacroProfile> = {
  meal:      { proteinRatio: 0.30, carbRatio: 0.40, fatRatio: 0.30 },
  soup:      { proteinRatio: 0.15, carbRatio: 0.55, fatRatio: 0.30 },
  drink:     { proteinRatio: 0.15, carbRatio: 0.70, fatRatio: 0.15 },
  fruit:     { proteinRatio: 0.05, carbRatio: 0.90, fatRatio: 0.05 },
  vegetable: { proteinRatio: 0.20, carbRatio: 0.65, fatRatio: 0.15 },
  dessert:   { proteinRatio: 0.05, carbRatio: 0.55, fatRatio: 0.40 },
  snack:     { proteinRatio: 0.15, carbRatio: 0.45, fatRatio: 0.40 },
  bread:     { proteinRatio: 0.10, carbRatio: 0.55, fatRatio: 0.35 },
  salad:     { proteinRatio: 0.15, carbRatio: 0.55, fatRatio: 0.30 },
};

function estimateMacros(food: FoodInfo, calories: number): { protein: number; carbs: number; fat: number } {
  const profile = MACRO_PROFILES[food.category];
  // protein & carbs = 4 kcal/g, fat = 9 kcal/g
  const proteinCals = calories * profile.proteinRatio;
  const carbsCals = calories * profile.carbRatio;
  const fatCals = calories * profile.fatRatio;
  return {
    protein: Math.round(proteinCals / 4),
    carbs: Math.round(carbsCals / 4),
    fat: Math.round(fatCals / 9),
  };
}

// ─── Meal Type Pools from FOOD_DATABASE ─────────────────────────────────────
// Categorize 201 classes into breakfast / lunch / dinner / snack pools

// Keys that are appropriate for breakfast
const BREAKFAST_KEYS = new Set([
  'menemen', 'omlet', 'sucuklu-yumurta', 'haslanmis-yumurta', 'ekmek', 'sandvic',
  'simit', 'pogaca', 'peynirli-borek', 'su-boregi', 'kiymali-borek',
  'cay', 'turk-kahvesi', 'sahlep', 'ayran', 'yogurt',
  'siyah-zeytin', 'yesil-zeytin', 'domates', 'salatalik', 'havuc',
  'pancakes', 'waffles', 'french_toast', 'eggs_benedict', 'breakfast_burrito',
  'croque_madame', 'grilled_cheese_sandwich',
]);

// Categories that belong in lunch/dinner
const MAIN_MEAL_CATEGORIES = new Set<FoodInfo['category']>(['meal', 'soup', 'salad']);

// Snack-worthy categories
const SNACK_CATEGORIES = new Set<FoodInfo['category']>(['fruit', 'snack', 'dessert', 'drink']);

function getBreakfastPool(): FoodInfo[] {
  return FOOD_DATABASE.filter(f =>
    BREAKFAST_KEYS.has(f.key) ||
    (f.category === 'bread') ||
    (f.category === 'drink')
  );
}

function getLunchPool(): FoodInfo[] {
  return FOOD_DATABASE.filter(f =>
    MAIN_MEAL_CATEGORIES.has(f.category) && !BREAKFAST_KEYS.has(f.key)
  );
}

function getDinnerPool(): FoodInfo[] {
  // Dinner = main meals + soups + vegetables
  return FOOD_DATABASE.filter(f =>
    f.category === 'meal' || f.category === 'soup' || f.category === 'vegetable' || f.category === 'salad'
  ).filter(f => !BREAKFAST_KEYS.has(f.key));
}

function getSnackPool(): FoodInfo[] {
  return FOOD_DATABASE.filter(f =>
    SNACK_CATEGORIES.has(f.category) ||
    f.category === 'vegetable' // veggies can be snacks too
  );
}

// ─── Vegetarian / Vegan Filters ─────────────────────────────────────────────

const MEAT_KEYWORDS = [
  'kebap', 'kofte', 'köfte', 'doner', 'döner', 'tavuk', 'chicken', 'et-sote',
  'iskender', 'kokorec', 'tantuni', 'sucuk', 'sote', 'kaburga', 'beef', 'pork',
  'steak', 'biftek', 'filet', 'pirzola', 'ribs', 'pulled_pork', 'hot_dog',
  'hamburger', 'lahmacun', 'kiymali', 'karniyarik', 'mumbar', 'mantı', 'manti',
  'balık', 'balik', 'salmon', 'somon', 'hamsi', 'levrek', 'cipura',
  'midye', 'mussels', 'lobster', 'crab', 'shrimp', 'karides', 'tuna',
  'sashimi', 'fish', 'duck', 'peking', 'escargots', 'oysters', 'scallops',
  'ceviche', 'gyoza', 'dumplings', 'carpaccio', 'tartare', 'foie_gras',
];

const DAIRY_KEYWORDS = [
  'peynir', 'cheese', 'yogurt', 'yoğurt', 'ayran', 'cacık', 'sahlep',
  'süt', 'kaşar', 'tereyağ', 'ricotta', 'mozzarella',
];

function filterByDiet(foods: FoodInfo[], diet: DietPreference): FoodInfo[] {
  if (diet === 'standard') return foods;

  const excluded = diet === 'vegan'
    ? [...MEAT_KEYWORDS, ...DAIRY_KEYWORDS]
    : diet === 'vegetarian'
      ? MEAT_KEYWORDS
      : [];

  if (excluded.length === 0) return foods;

  return foods.filter(f => {
    const name = (f.key + ' ' + f.displayName).toLowerCase();
    return !excluded.some(kw => name.includes(kw.toLowerCase()));
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function foodToRecommendation(food: FoodInfo, portionFactor = 1): MealRecommendation {
  const amount = food.defaultPortion * portionFactor;
  const cal = calculateCalories(food, amount, food.unit);
  const macros = estimateMacros(food, cal);
  const grams = calculateWeightGrams(food, amount, food.unit);

  let portion: string;
  if (food.unit === 'adet') {
    portion = `${Math.round(amount * 10) / 10} adet (~${grams}g)`;
  } else if (food.unit === 'kase') {
    portion = `${Math.round(amount * 10) / 10} kase (~${grams}ml)`;
  } else if (food.unit === 'ml') {
    portion = `${Math.round(amount)}ml`;
  } else {
    portion = `${Math.round(amount)}g`;
  }

  return {
    name: food.displayName,
    calories: cal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    portion,
    emoji: food.emoji,
    foodKey: food.key,
  };
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function adjustRecommendationCalories(rec: MealRecommendation, factor: number): MealRecommendation {
  return {
    ...rec,
    calories: Math.round(rec.calories * factor),
    protein: Math.round(rec.protein * factor),
    carbs: Math.round(rec.carbs * factor),
    fat: Math.round(rec.fat * factor),
    portion: factor < 0.85 ? `${rec.portion} (küçük)` : factor > 1.15 ? `${rec.portion} (büyük)` : rec.portion,
  };
}

// ─── Recommendation Engine ──────────────────────────────────────────────────

/**
 * Generate a daily meal plan based on user profile using FOOD_DATABASE
 */
export function generateDailyPlan(params: {
  dailyCalorieTarget: number;
  goal: Goal;
  diet: DietPreference;
}): DailyMealPlan {
  const { dailyCalorieTarget, goal, diet } = params;

  // Calorie distribution: breakfast 25%, lunch 35%, dinner 30%, snack 10%
  const breakfastTarget = dailyCalorieTarget * 0.25;
  const lunchTarget = dailyCalorieTarget * 0.35;
  const dinnerTarget = dailyCalorieTarget * 0.30;
  const snackTarget = dailyCalorieTarget * 0.10;

  // Build pools filtered by diet
  const breakfastPool = filterByDiet(getBreakfastPool(), diet);
  const lunchPool = filterByDiet(getLunchPool(), diet);
  const dinnerPool = filterByDiet(getDinnerPool(), diet);
  const snackPool = filterByDiet(getSnackPool(), diet);

  // Pick items and scale to target calories
  const pickAndScale = (pool: FoodInfo[], target: number, count: number): MealRecommendation[] => {
    const picks = pickRandom(pool, count);
    if (picks.length === 0) return [];

    const recs = picks.map(f => foodToRecommendation(f));
    const totalCal = recs.reduce((s, r) => s + r.calories, 0);
    if (totalCal === 0) return recs;

    const factor = target / totalCal;
    return recs.map(r => adjustRecommendationCalories(r, factor));
  };

  // Breakfast: 2 items (e.g. a food + a drink)
  const breakfast = pickAndScale(breakfastPool, breakfastTarget, 2);
  // Lunch: 2 items (main + side/soup)
  const lunch = pickAndScale(lunchPool, lunchTarget, 2);
  // Dinner: 2 items
  const dinner = pickAndScale(dinnerPool, dinnerTarget, 2);
  // Snack: 1 item
  const snack = pickAndScale(snackPool, snackTarget, 1);

  const all = [...breakfast, ...lunch, ...dinner, ...snack];

  return {
    breakfast,
    lunch,
    dinner,
    snack,
    totalCalories: all.reduce((s, m) => s + m.calories, 0),
    totalProtein: all.reduce((s, m) => s + m.protein, 0),
    totalCarbs: all.reduce((s, m) => s + m.carbs, 0),
    totalFat: all.reduce((s, m) => s + m.fat, 0),
  };
}

/**
 * Generate weekly summary analysis
 */
export function generateWeeklySummary(params: {
  dailyData: { calories: number; burned: number; protein: number; carbs: number; fat: number }[];
  calorieGoal: number;
  goal: Goal;
}): WeeklySummary {
  const { dailyData, calorieGoal, goal } = params;
  const daysTracked = dailyData.length;

  if (daysTracked === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      totalBurned: 0,
      daysTracked: 0,
      calorieGoal,
      goalAchievedDays: 0,
      trend: 'under',
      tips: ['Yemek kayıtlarınız henüz yok. Hemen kayıt eklemeye başlayın!'],
    };
  }

  const avgCalories = Math.round(dailyData.reduce((s, d) => s + d.calories, 0) / daysTracked);
  const avgProtein = Math.round(dailyData.reduce((s, d) => s + d.protein, 0) / daysTracked);
  const avgCarbs = Math.round(dailyData.reduce((s, d) => s + d.carbs, 0) / daysTracked);
  const avgFat = Math.round(dailyData.reduce((s, d) => s + d.fat, 0) / daysTracked);
  const totalBurned = dailyData.reduce((s, d) => s + d.burned, 0);

  // Goal achieved: within ±15% of target
  const goalAchievedDays = dailyData.filter(d => {
    const ratio = d.calories / calorieGoal;
    return ratio >= 0.85 && ratio <= 1.15;
  }).length;

  // Determine trend
  let trend: 'under' | 'on_track' | 'over' = 'on_track';
  const avgRatio = avgCalories / calorieGoal;
  if (avgRatio < 0.85) trend = 'under';
  else if (avgRatio > 1.15) trend = 'over';

  // Generate tips
  const tips: string[] = [];

  if (goal === 'lose') {
    if (trend === 'over') {
      tips.push('Kalori hedefinin üzerindesiniz. Porsiyon kontrolüne dikkat edin.');
      tips.push('Akşam atıştırmalıklarını azaltmayı deneyin.');
    } else if (trend === 'under') {
      tips.push('Çok az kalori alıyorsunuz. Metabolizmanızı yavaşlatmamak için yeterli yiyin.');
      tips.push('Sağlıklı atıştırmalıklar ekleyin (meyve, yoğurt).');
    } else {
      tips.push('Harika gidiyorsunuz! Hedefinize uygun besleniyorsunuz. 🎉');
    }
  } else if (goal === 'gain') {
    if (trend === 'under') {
      tips.push('Kilo almak için daha fazla kalori almanız gerekiyor.');
      tips.push('Protein ağırlıklı atıştırmalıklar ekleyin.');
    } else if (trend === 'over') {
      tips.push('Fazla kalori alıyorsunuz. Sağlıklı kaynaklardan kalori almaya dikkat edin.');
    } else {
      tips.push('Hedefinize uygun ilerliyorsunuz! Protein alımınızı yüksek tutun. 💪');
    }
  } else {
    if (trend === 'on_track') {
      tips.push('Mevcut kilomuzu korumak için doğru yoldasınız! ⚖️');
    } else {
      tips.push(`Günlük kalori hedefinize biraz daha yaklaşmaya çalışın (${calorieGoal} kcal).`);
    }
  }

  if (avgProtein < 50) {
    tips.push('Protein alımınız düşük. Yumurta, tavuk veya baklagiller eklemeyi deneyin.');
  }

  if (totalBurned > 0) {
    tips.push(`Bu hafta toplam ${totalBurned} kcal egzersizle yaktınız. 🏃`);
  } else {
    tips.push('Bu hafta egzersiz kaydınız yok. Günde 30 dk yürüyüş bile fark yaratır!');
  }

  return {
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    totalBurned,
    daysTracked,
    calorieGoal,
    goalAchievedDays,
    trend,
    tips,
  };
}
