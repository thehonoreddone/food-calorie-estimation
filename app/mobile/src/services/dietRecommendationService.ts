/**
 * Diyet Öneri Sistemi
 * Kullanıcının hedefi, diyet tercihleri ve profil bilgilerine göre
 * günlük yemek önerileri ve haftalık analiz raporu üretir.
 */

import { Goal, ActivityLevel, DietPreference } from '../contexts/UserContext';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MealRecommendation {
  name: string;
  calories: number;
  protein: number; // gram
  carbs: number;   // gram
  fat: number;     // gram
  portion: string; // e.g. "200g", "1 porsiyon"
  emoji: string;
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

// ─── Meal Database ──────────────────────────────────────────────────────────

const BREAKFAST_OPTIONS: MealRecommendation[] = [
  { name: 'Yulaf ezmesi & meyve', calories: 300, protein: 10, carbs: 50, fat: 6, portion: '200g', emoji: '🥣' },
  { name: 'Menemen', calories: 250, protein: 14, carbs: 8, fat: 18, portion: '200g', emoji: '🍳' },
  { name: 'Peynirli tost', calories: 320, protein: 15, carbs: 30, fat: 16, portion: '1 adet', emoji: '🧀' },
  { name: 'Yumurta & tam buğday ekmek', calories: 280, protein: 16, carbs: 28, fat: 12, portion: '2 yumurta + 1 dilim', emoji: '🥚' },
  { name: 'Simit & peynir & çay', calories: 370, protein: 14, carbs: 55, fat: 10, portion: '1 simit', emoji: '🥯' },
  { name: 'Smoothie bowl', calories: 260, protein: 8, carbs: 45, fat: 5, portion: '300ml', emoji: '🥤' },
  { name: 'Protein pancake', calories: 290, protein: 22, carbs: 35, fat: 8, portion: '3 adet', emoji: '🥞' },
  { name: 'Avokadolu tam buğday tost', calories: 310, protein: 10, carbs: 32, fat: 16, portion: '2 dilim', emoji: '🥑' },
  { name: 'Yoğurt & granola & meyve', calories: 270, protein: 12, carbs: 40, fat: 8, portion: '250g', emoji: '🫐' },
  { name: 'Kaşarlı gözleme', calories: 340, protein: 16, carbs: 38, fat: 14, portion: '1 adet', emoji: '🫓' },
];

const LUNCH_OPTIONS: MealRecommendation[] = [
  { name: 'Izgara tavuk & pilav', calories: 450, protein: 35, carbs: 45, fat: 12, portion: '300g', emoji: '🍗' },
  { name: 'Mercimek çorbası & ekmek', calories: 320, protein: 16, carbs: 48, fat: 6, portion: '1 kase', emoji: '🍲' },
  { name: 'Tavuk salata', calories: 350, protein: 30, carbs: 15, fat: 18, portion: '300g', emoji: '🥗' },
  { name: 'Kuru fasulye & pilav', calories: 420, protein: 18, carbs: 60, fat: 10, portion: '1 porsiyon', emoji: '🫘' },
  { name: 'Izgara balık & sebze', calories: 380, protein: 32, carbs: 20, fat: 16, portion: '250g', emoji: '🐟' },
  { name: 'Zeytinyağlı dolma', calories: 300, protein: 8, carbs: 42, fat: 12, portion: '6 adet', emoji: '🫑' },
  { name: 'Tavuk döner wrap', calories: 430, protein: 28, carbs: 40, fat: 16, portion: '1 adet', emoji: '🌯' },
  { name: 'Makarna (sebzeli)', calories: 400, protein: 14, carbs: 58, fat: 12, portion: '250g', emoji: '🍝' },
  { name: 'Nohutlu pilav', calories: 380, protein: 14, carbs: 55, fat: 10, portion: '300g', emoji: '🍚' },
  { name: 'Etli ekmek', calories: 460, protein: 25, carbs: 48, fat: 18, portion: '1 porsiyon', emoji: '🥖' },
];

const DINNER_OPTIONS: MealRecommendation[] = [
  { name: 'Izgara köfte & salata', calories: 400, protein: 30, carbs: 15, fat: 24, portion: '200g', emoji: '🥩' },
  { name: 'Sebze yemeği & yoğurt', calories: 280, protein: 12, carbs: 35, fat: 10, portion: '300g', emoji: '🥦' },
  { name: 'Fırında tavuk & patates', calories: 420, protein: 35, carbs: 30, fat: 16, portion: '300g', emoji: '🍗' },
  { name: 'Çorba & salata', calories: 250, protein: 10, carbs: 30, fat: 8, portion: '1 porsiyon', emoji: '🍜' },
  { name: 'Karnıyarık', calories: 380, protein: 18, carbs: 28, fat: 22, portion: '2 adet', emoji: '🍆' },
  { name: 'Izgara somon & bulgur', calories: 440, protein: 35, carbs: 35, fat: 16, portion: '250g', emoji: '🐠' },
  { name: 'Mantı', calories: 400, protein: 20, carbs: 45, fat: 16, portion: '1 porsiyon', emoji: '🥟' },
  { name: 'Sebzeli omlet', calories: 260, protein: 18, carbs: 8, fat: 18, portion: '3 yumurta', emoji: '🍳' },
  { name: 'Zeytinyağlı fasulye & pilav', calories: 350, protein: 12, carbs: 50, fat: 10, portion: '1 porsiyon', emoji: '🫘' },
  { name: 'Tavuk sote', calories: 370, protein: 30, carbs: 20, fat: 18, portion: '250g', emoji: '🍲' },
];

const SNACK_OPTIONS: MealRecommendation[] = [
  { name: 'Meyve tabağı', calories: 120, protein: 2, carbs: 28, fat: 1, portion: '200g', emoji: '🍎' },
  { name: 'Yoğurt', calories: 100, protein: 8, carbs: 12, fat: 3, portion: '200g', emoji: '🥛' },
  { name: 'Bir avuç badem', calories: 160, protein: 6, carbs: 6, fat: 14, portion: '30g', emoji: '🥜' },
  { name: 'Havuç & humus', calories: 140, protein: 5, carbs: 18, fat: 6, portion: '150g', emoji: '🥕' },
  { name: 'Protein bar', calories: 200, protein: 20, carbs: 22, fat: 6, portion: '1 adet', emoji: '🍫' },
  { name: 'Peynir & ceviz', calories: 180, protein: 10, carbs: 4, fat: 14, portion: '50g', emoji: '🧀' },
  { name: 'Muz & fıstık ezmesi', calories: 220, protein: 6, carbs: 30, fat: 10, portion: '1 muz + 1 çk', emoji: '🍌' },
  { name: 'Ayran', calories: 70, protein: 4, carbs: 6, fat: 3, portion: '300ml', emoji: '🥛' },
  { name: 'Kuru meyve karışımı', calories: 150, protein: 3, carbs: 35, fat: 1, portion: '40g', emoji: '🍇' },
  { name: 'Tam buğday kraker & peynir', calories: 170, protein: 8, carbs: 20, fat: 7, portion: '4 adet', emoji: '🧈' },
];

// Vegetarian-friendly filters
const VEGETARIAN_EXCLUDE_KEYWORDS = ['tavuk', 'et', 'balık', 'köfte', 'döner', 'somon', 'chicken', 'beef', 'fish', 'köfte', 'mantı', 'karnıyarık', 'sote'];
const VEGAN_EXCLUDE_KEYWORDS = [...VEGETARIAN_EXCLUDE_KEYWORDS, 'yumurta', 'peynir', 'yoğurt', 'süt', 'kaşar', 'ayran', 'bal', 'tereyağ'];

// ─── Recommendation Engine ──────────────────────────────────────────────────

function filterByDiet(meals: MealRecommendation[], diet: DietPreference): MealRecommendation[] {
  if (diet === 'standard') return meals;
  const excludes = diet === 'vegan' ? VEGAN_EXCLUDE_KEYWORDS : 
                   diet === 'vegetarian' ? VEGETARIAN_EXCLUDE_KEYWORDS : [];
  if (excludes.length === 0) return meals;
  return meals.filter(m => !excludes.some(kw => m.name.toLowerCase().includes(kw)));
}

function adjustCalories(meal: MealRecommendation, factor: number): MealRecommendation {
  return {
    ...meal,
    calories: Math.round(meal.calories * factor),
    protein: Math.round(meal.protein * factor),
    carbs: Math.round(meal.carbs * factor),
    fat: Math.round(meal.fat * factor),
    portion: factor < 0.85 ? `${meal.portion} (küçük)` : factor > 1.15 ? `${meal.portion} (büyük)` : meal.portion,
  };
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generate a daily meal plan based on user profile
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

  // Filter by diet preference
  const breakfastPool = filterByDiet(BREAKFAST_OPTIONS, diet);
  const lunchPool = filterByDiet(LUNCH_OPTIONS, diet);
  const dinnerPool = filterByDiet(DINNER_OPTIONS, diet);
  const snackPool = filterByDiet(SNACK_OPTIONS, diet);

  // Pick and adjust calories
  const pickAndAdjust = (pool: MealRecommendation[], target: number, count: number): MealRecommendation[] => {
    const picks = pickRandom(pool, Math.min(count, pool.length));
    if (picks.length === 0) return [];
    const avgCal = picks.reduce((sum, p) => sum + p.calories, 0) / picks.length;
    const factor = target / (avgCal * count);
    return picks.map(p => adjustCalories(p, factor));
  };

  const breakfast = pickAndAdjust(breakfastPool, breakfastTarget, 1);
  const lunch = pickAndAdjust(lunchPool, lunchTarget, 1);
  const dinner = pickAndAdjust(dinnerPool, dinnerTarget, 1);
  const snack = pickAndAdjust(snackPool, snackTarget, 1);

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
