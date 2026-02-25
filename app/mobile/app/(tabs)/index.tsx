import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import {
  getMealsForDate,
  deleteMeal,
  logMeal,
  MealEntry,
  MealType,
  getExercisesForDate,
  deleteExercise,
  logExercise,
  ExerciseEntry,
} from '../../src/services/firestoreService';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Food calorie database (kcal per gram) ──────────────────────────────────
const FOOD_KCAL_PER_GRAM: Record<string, number> = {
  "apple_pie": 2.37, "baby_back_ribs": 2.9, "baklava": 4.3, "beef_carpaccio": 1.5,
  "beef_tartare": 1.5, "beet_salad": 0.6, "beignets": 3.5, "bibimbap": 1.3,
  "bread_pudding": 2.5, "breakfast_burrito": 1.8, "bruschetta": 1.5, "caesar_salad": 1.2,
  "cannoli": 3.2, "caprese_salad": 1.5, "carrot_cake": 3.1, "ceviche": 0.9,
  "cheese_plate": 3.5, "cheesecake": 3.2, "chicken_curry": 1.5, "chicken_quesadilla": 2.2,
  "chicken_wings": 2.5, "chocolate_cake": 3.7, "chocolate_mousse": 2.5, "churros": 3.8,
  "clam_chowder": 0.8, "club_sandwich": 1.8, "crab_cakes": 1.9, "creme_brulee": 2.8,
  "croque_madame": 2.5, "cup_cakes": 3.0, "deviled_eggs": 1.9, "donuts": 4.0,
  "dumplings": 1.6, "edamame": 1.2, "eggs_benedict": 2.2, "escargots": 1.8,
  "falafel": 2.8, "filet_mignon": 2.7, "fish_and_chips": 2.4, "foie_gras": 4.6,
  "french_fries": 3.1, "french_onion_soup": 0.5, "french_toast": 2.2,
  "fried_calamari": 2.0, "fried_rice": 1.6, "frozen_yogurt": 1.2, "garlic_bread": 3.5,
  "gnocchi": 1.3, "greek_salad": 0.9, "grilled_cheese_sandwich": 2.8,
  "grilled_salmon": 2.0, "guacamole": 1.6, "gyoza": 1.8, "hamburger": 2.5,
  "hot_and_sour_soup": 0.4, "hot_dog": 2.9, "huevos_rancheros": 1.4, "hummus": 1.7,
  "ice_cream": 2.1, "lasagna": 1.7, "lobster_bisque": 1.0, "lobster_roll_sandwich": 1.9,
  "macaroni_and_cheese": 2.0, "macarons": 4.0, "miso_soup": 0.2, "mussels": 1.0,
  "nachos": 2.8, "omelette": 1.6, "onion_rings": 3.2, "oysters": 0.7,
  "pad_thai": 1.4, "paella": 1.4, "pancakes": 2.3, "panna_cotta": 2.5,
  "peking_duck": 2.5, "pho": 0.4, "pizza": 2.7, "pork_chop": 2.5, "poutine": 2.0,
  "prime_rib": 2.9, "pulled_pork_sandwich": 2.0, "ramen": 0.9, "ravioli": 1.5,
  "red_velvet_cake": 3.5, "risotto": 1.3, "samosa": 2.6, "sashimi": 1.3,
  "scallops": 1.0, "seaweed_salad": 0.7, "shrimp_and_grits": 1.2,
  "spaghetti_bolognese": 1.3, "spaghetti_carbonara": 1.6, "spring_rolls": 2.2,
  "steak": 2.5, "strawberry_shortcake": 2.4, "sushi": 1.4, "tacos": 1.8,
  "takoyaki": 1.8, "tiramisu": 2.9, "tuna_tartare": 1.2, "waffles": 3.0,
  // Turkish foods
  "çay": 0.01, "cay": 0.01, "tea": 0.01, "coffee": 0.02, "türk kahvesi": 0.1,
  "turk_kahvesi": 0.1, "espresso": 0.03, "ayran": 0.4, "milk": 0.6,
  "orange_juice": 0.45, "water": 0.0, "soup": 0.4, "lokma": 3.8, "sarma": 1.2,
  "dolma": 1.4, "köfte": 2.5, "kofte": 2.5, "lahmacun": 2.2, "pide": 2.0,
  "börek": 3.0, "borek": 3.0, "künefe": 3.5, "kunefe": 3.5, "simit": 2.8,
  "menemen": 1.2, "mercimek çorbası": 0.6, "mercimek_corbasi": 0.6, "iskender": 2.0,
  "döner": 2.2, "doner": 2.2, "adana kebap": 2.3, "adana_kebab": 2.3,
  "urfa kebap": 2.3, "urfa_kebab": 2.3,
  // General
  "candy": 3.8, "egg_tart": 2.8, "chocolate": 5.46, "biscuit": 4.6, "popcorn": 3.87,
  "pudding": 1.3, "bread": 2.65, "cake": 3.47, "pancake": 2.27, "pastry": 3.8,
  "peach": 0.39, "pear": 0.57, "strawberry": 0.32, "apple": 0.52, "grape": 0.69,
  "orange": 0.47, "kiwi": 0.61, "watermelon": 0.3, "banana": 0.89, "cherry": 0.5,
  "blueberry": 0.57, "raspberry": 0.52, "mango": 0.6, "pineapple": 0.5,
  "bean": 0.31, "pea": 0.81, "lentil": 1.16, "peanut": 5.67, "cashew": 5.53,
  "walnut": 6.54, "almond": 5.79, "hazelnut": 6.28, "pistachio": 5.6,
  "rice": 1.3, "beef": 2.5, "pork": 2.42, "chicken": 2.39, "ham": 1.45,
  "duck": 3.37, "fish": 2.06, "shrimp": 0.99, "seafood": 1.2, "vegetable": 0.25,
  "lettuce": 0.14, "spinach": 0.23, "broccoli": 0.34, "pasta": 1.31, "noodles": 1.38,
  "egg": 1.55, "yogurt": 0.59, "cheese": 4.02, "butter": 7.17, "honey": 3.04,
  "pilav": 1.3, "salata": 0.6, "tavuk": 2.39, "et": 2.5, "balık": 2.06,
  "makarna": 1.31, "çorba": 0.4, "ekmek": 2.65, "yumurta": 1.55, "peynir": 4.02,
  "süt": 0.42, "yoğurt": 0.59, "tereyağı": 7.17, "bal": 3.04, "reçel": 2.78,
  "patates kızartması": 3.1, "kuru fasulye": 1.2, "nohut": 1.6, "bulgur": 3.42,
  "pirinç": 1.3, "sebze": 0.25, "meyve": 0.5, "kabak": 0.26, "domates": 0.18,
  "salatalık": 0.15, "biber": 0.31, "soğan": 0.4, "havuç": 0.41, "mantar": 0.22,
  "mısır": 0.96, "patates": 0.77, "tost": 2.5, "sandviç": 2.5, "hamburger_tr": 2.95,
  "tantuni": 2.0, "çiğ köfte": 1.5, "gözleme": 2.2, "karnıyarık": 1.3,
  "imam bayıldı": 1.1, "mantı": 1.8, "pilav üstü döner": 2.0,
};

// Turkish display names for food database
const FOOD_DISPLAY_NAMES: Record<string, string> = {
  "apple_pie": "Elmalı Turta", "baklava": "Baklava", "bibimbap": "Bibimbap",
  "caesar_salad": "Sezar Salata", "cheesecake": "Cheesecake", "chicken_curry": "Tavuk Köri",
  "chicken_wings": "Tavuk Kanat", "chocolate_cake": "Çikolatalı Kek",
  "churros": "Churros", "donuts": "Donut", "falafel": "Falafel",
  "french_fries": "Patates Kızartması", "fried_rice": "Kızarmış Pilav",
  "greek_salad": "Yunan Salatası", "hamburger": "Hamburger", "hot_dog": "Sosisli",
  "ice_cream": "Dondurma", "lasagna": "Lazanya", "nachos": "Nachos",
  "omelette": "Omlet", "pad_thai": "Pad Thai", "pancakes": "Pankek",
  "pizza": "Pizza", "ramen": "Ramen", "risotto": "Risotto",
  "spaghetti_bolognese": "Bolonez Makarna", "steak": "Biftek", "sushi": "Suşi",
  "tacos": "Taco", "tiramisu": "Tiramisu", "waffles": "Waffle",
  "çay": "Çay", "coffee": "Kahve", "türk kahvesi": "Türk Kahvesi",
  "ayran": "Ayran", "lokma": "Lokma", "sarma": "Sarma", "dolma": "Dolma",
  "köfte": "Köfte", "lahmacun": "Lahmacun", "pide": "Pide",
  "börek": "Börek", "künefe": "Künefe", "simit": "Simit", "menemen": "Menemen",
  "mercimek çorbası": "Mercimek Çorbası", "iskender": "İskender",
  "döner": "Döner", "adana kebap": "Adana Kebap", "urfa kebap": "Urfa Kebap",
  "rice": "Pilav", "chicken": "Tavuk", "beef": "Et", "fish": "Balık",
  "pasta": "Makarna", "bread": "Ekmek", "egg": "Yumurta", "cheese": "Peynir",
  "yogurt": "Yoğurt", "honey": "Bal", "banana": "Muz", "apple": "Elma",
  "orange": "Portakal", "strawberry": "Çilek", "watermelon": "Karpuz",
  "grape": "Üzüm", "cherry": "Kiraz", "pear": "Armut", "peach": "Şeftali",
  "mango": "Mango", "pineapple": "Ananas", "kiwi": "Kivi",
  "spinach": "Ispanak", "broccoli": "Brokoli", "lettuce": "Marul",
  "pilav": "Pilav", "salata": "Salata", "tavuk": "Tavuk", "et": "Et",
  "balık": "Balık", "makarna": "Makarna", "çorba": "Çorba", "ekmek": "Ekmek",
  "yumurta": "Yumurta", "peynir": "Peynir", "süt": "Süt", "yoğurt": "Yoğurt",
  "tereyağı": "Tereyağı", "bal": "Bal", "reçel": "Reçel",
  "patates kızartması": "Patates Kızartması", "kuru fasulye": "Kuru Fasulye",
  "nohut": "Nohut", "bulgur": "Bulgur", "pirinç": "Pirinç",
  "sebze": "Sebze", "meyve": "Meyve", "salatalık": "Salatalık",
  "domates": "Domates", "biber": "Biber", "soğan": "Soğan", "havuç": "Havuç",
  "mantar": "Mantar", "mısır": "Mısır", "patates": "Patates",
  "tost": "Tost", "sandviç": "Sandviç", "tantuni": "Tantuni",
  "çiğ köfte": "Çiğ Köfte", "gözleme": "Gözleme", "karnıyarık": "Karnıyarık",
  "imam bayıldı": "İmam Bayıldı", "mantı": "Mantı",
  "pilav üstü döner": "Pilav Üstü Döner",
  "chocolate": "Çikolata", "candy": "Şeker", "popcorn": "Patlamış Mısır",
  "pudding": "Puding", "cake": "Kek", "pastry": "Pasta/Börek",
  "walnut": "Ceviz", "hazelnut": "Fındık", "almond": "Badem",
  "pistachio": "Antep Fıstığı", "peanut": "Yer Fıstığı",
};

/** Return kcal/g for a food name (case-insensitive fuzzy match) */
function findFoodKcal(name: string): { key: string; kcalPerGram: number } | null {
  const lower = name.toLowerCase().trim();
  if (!lower) return null;
  // Direct match
  if (FOOD_KCAL_PER_GRAM[lower] !== undefined) {
    return { key: lower, kcalPerGram: FOOD_KCAL_PER_GRAM[lower] };
  }
  // Partial match (food key contains input or input contains food key)
  const entries = Object.entries(FOOD_KCAL_PER_GRAM);
  for (const [key, val] of entries) {
    const keyNorm = key.replace(/_/g, ' ').toLowerCase();
    if (keyNorm.includes(lower) || lower.includes(keyNorm)) {
      return { key, kcalPerGram: val };
    }
  }
  return null;
}

/** Get food suggestions for autocomplete */
function getFoodSuggestions(query: string): { key: string; display: string; kcalPerGram: number }[] {
  const lower = query.toLowerCase().trim();
  if (!lower || lower.length < 2) return [];
  const results: { key: string; display: string; kcalPerGram: number }[] = [];
  for (const [key, val] of Object.entries(FOOD_KCAL_PER_GRAM)) {
    const keyNorm = key.replace(/_/g, ' ').toLowerCase();
    const display = FOOD_DISPLAY_NAMES[key] ?? key.replace(/_/g, ' ');
    if (keyNorm.includes(lower) || display.toLowerCase().includes(lower)) {
      // Avoid duplicates (same display)
      if (!results.find(r => r.display === display)) {
        results.push({ key, display, kcalPerGram: val });
      }
    }
    if (results.length >= 8) break;
  }
  return results;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MEAL_SECTIONS: { key: MealType; label: string; icon: string; color: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı', icon: '🌅', color: '#f59e0b' },
  { key: 'lunch', label: 'Öğle Yemeği', icon: '☀️', color: '#f97316' },
  { key: 'dinner', label: 'Akşam Yemeği', icon: '🌆', color: '#8b5cf6' },
  { key: 'snack', label: 'Aperatifler / Diğer', icon: '🍿', color: '#06b6d4' },
];

const COMMON_EXERCISES = [
  { name: 'Yürüyüş', calPer30: 120 },
  { name: 'Koşu', calPer30: 300 },
  { name: 'Bisiklet', calPer30: 250 },
  { name: 'Yüzme', calPer30: 280 },
  { name: 'Yoga', calPer30: 90 },
  { name: 'Ağırlık', calPer30: 180 },
];

// ─── Date helpers ───────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isSameDay(d1: Date, d2: Date): boolean {
  return formatDateKey(d1) === formatDateKey(d2);
}

function getDayNames(): string[] {
  return ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
}

function getMonthNames(): string[] {
  return ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
}

function getCalendarDays(centerDate: Date): Date[] {
  const days: Date[] = [];
  for (let i = -7; i <= 7; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HomeTab() {
  const { profile, calculateDailyCalories } = useUser();
  const today = new Date();

  // State
  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Manual entry modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMealType, setManualMealType] = useState<MealType>('lunch');
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualWeight, setManualWeight] = useState('');
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false);
  const [selectedFoodKcal, setSelectedFoodKcal] = useState<number | null>(null);

  // Exercise modal state
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseCalories, setExerciseCalories] = useState('');

  const calendarRef = useRef<FlatList>(null);

  // ─── Computed meal calorie ────────────────────────────────────────
  const manualCaloriesComputed = useMemo(() => {
    const w = parseInt(manualWeight) || 0;
    if (!selectedFoodKcal || w <= 0) return 0;
    return Math.round(selectedFoodKcal * w);
  }, [selectedFoodKcal, manualWeight]);

  const foodSuggestions = useMemo(() => {
    return getFoodSuggestions(manualFoodName);
  }, [manualFoodName]);

  // ─── Load data ──────────────────────────────────────────────────────
  const loadData = useCallback(async (date: Date) => {
    if (!profile.uid) return;
    setIsLoading(true);
    try {
      const dateKey = formatDateKey(date);
      const [mealData, exerciseData] = await Promise.all([
        getMealsForDate(profile.uid, dateKey),
        getExercisesForDate(profile.uid, dateKey),
      ]);
      setMeals(mealData);
      setExercises(exerciseData);
    } catch (err) {
      console.error('Error loading day data:', err);
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
    }
  }, [profile.uid]);

  // Load on first render + date change
  const lastLoadedDate = useRef<string>('');
  const dateKey = formatDateKey(selectedDate);
  if (dateKey !== lastLoadedDate.current && profile.uid) {
    lastLoadedDate.current = dateKey;
    loadData(selectedDate);
  }

  // ─── Calculations ──────────────────────────────────────────────────
  const dailyTarget = calculateDailyCalories();
  const consumedCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const burnedCalories = exercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
  const netCalories = consumedCalories - burnedCalories;
  const calorieProgress = dailyTarget > 0 ? Math.min(consumedCalories / dailyTarget, 1) : 0;
  const remainingCalories = Math.max(0, dailyTarget - consumedCalories + burnedCalories);

  const getMealsForType = (type: MealType) => meals.filter(m => m.mealType === type);
  const getMealTypeCalories = (type: MealType) =>
    getMealsForType(type).reduce((sum, m) => sum + m.calories, 0);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert('Sil', 'Bu kaydı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal(mealId);
            setMeals(prev => prev.filter(m => m.id !== mealId));
          } catch (err) {
            console.error('Delete error:', err);
          }
        },
      },
    ]);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    Alert.alert('Sil', 'Bu egzersizi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(exerciseId);
            setExercises(prev => prev.filter(e => e.id !== exerciseId));
          } catch (err) {
            console.error('Delete error:', err);
          }
        },
      },
    ]);
  };

  const handleManualAdd = async () => {
    if (!profile.uid || !manualFoodName.trim()) {
      Alert.alert('Hata', 'Yemek adı girmelisiniz.');
      return;
    }
    const weight = parseInt(manualWeight) || 0;
    if (weight <= 0) {
      Alert.alert('Hata', 'Lütfen porsiyon ağırlığını (gram) girin.');
      return;
    }
    // Auto-calc calories from food database
    let cal = manualCaloriesComputed;
    if (cal <= 0) {
      // Fallback: try finding kcal/g for the entered food name
      const found = findFoodKcal(manualFoodName);
      if (found) {
        cal = Math.round(found.kcalPerGram * weight);
      } else {
        // Use default 1.5 kcal/g if food not found
        cal = Math.round(1.5 * weight);
      }
    }
    try {
      const id = await logMeal(profile.uid, {
        date: formatDateKey(selectedDate),
        mealType: manualMealType,
        foodName: manualFoodName.trim(),
        calories: cal,
        protein: Math.round(cal * 0.25 / 4),
        carbs: Math.round(cal * 0.45 / 4),
        fat: Math.round(cal * 0.30 / 9),
        weight,
      });
      setMeals(prev => [{ id, uid: profile.uid!, date: formatDateKey(selectedDate), mealType: manualMealType, foodName: manualFoodName.trim(), calories: cal, protein: Math.round(cal * 0.25 / 4), carbs: Math.round(cal * 0.45 / 4), fat: Math.round(cal * 0.30 / 9), weight }, ...prev]);
      setShowManualModal(false);
      setManualFoodName('');
      setManualWeight('');
      setSelectedFoodKcal(null);
    } catch (err) {
      console.error('Manual add error:', err);
      Alert.alert('Hata', 'Kayıt eklenemedi.');
    }
  };

  const handleAddExercise = async () => {
    if (!profile.uid || !exerciseName.trim()) {
      Alert.alert('Hata', 'Egzersiz adı girmelisiniz.');
      return;
    }
    const duration = parseInt(exerciseDuration) || 30;
    const cal = parseInt(exerciseCalories) || 0;
    try {
      const id = await logExercise(profile.uid, {
        date: formatDateKey(selectedDate),
        name: exerciseName.trim(),
        duration,
        caloriesBurned: cal,
      });
      setExercises(prev => [{ id, uid: profile.uid!, date: formatDateKey(selectedDate), name: exerciseName.trim(), duration, caloriesBurned: cal }, ...prev]);
      setShowExerciseModal(false);
      setExerciseName('');
      setExerciseDuration('');
      setExerciseCalories('');
    } catch (err) {
      console.error('Exercise add error:', err);
      Alert.alert('Hata', 'Egzersiz eklenemedi.');
    }
  };

  const openManualModal = (mealType: MealType) => {
    setManualMealType(mealType);
    setManualFoodName('');
    setManualWeight('');
    setSelectedFoodKcal(null);
    setShowFoodSuggestions(false);
    setShowManualModal(true);
  };

  // ─── Calendar strip ───────────────────────────────────────────────
  const calendarDays = getCalendarDays(today);
  const dayNames = getDayNames();
  const monthNames = getMonthNames();

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[500], Colors.primary[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Merhaba, {profile.name ?? 'Kullanıcı'}! 👋</Text>
            <Text style={styles.headerSubtitle}>
              {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
            </Text>
          </View>
        </View>

        {/* Calendar Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarStrip}
        >
          {calendarDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  isSelected && styles.calendarDaySelected,
                  isToday && !isSelected && styles.calendarDayToday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.calendarDayName,
                    isSelected && styles.calendarDayTextActive,
                  ]}
                >
                  {dayNames[day.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.calendarDayNumber,
                    isSelected && styles.calendarDayTextActive,
                  ]}
                >
                  {day.getDate()}
                </Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Calorie Summary Card */}
        <View style={[styles.calorySummaryCard, Shadows.md]}>
          <View style={styles.caloryRow}>
            <View style={styles.caloryItem}>
              <Text style={styles.caloryItemValue}>{consumedCalories}</Text>
              <Text style={styles.caloryItemLabel}>Alınan</Text>
            </View>
            <View style={styles.caloryDivider} />
            <View style={styles.caloryItem}>
              <Text style={[styles.caloryItemValue, { color: Colors.primary[500] }]}>{dailyTarget}</Text>
              <Text style={styles.caloryItemLabel}>Hedef</Text>
            </View>
            <View style={styles.caloryDivider} />
            <View style={styles.caloryItem}>
              <Text style={[styles.caloryItemValue, { color: Colors.accent.orange }]}>{burnedCalories}</Text>
              <Text style={styles.caloryItemLabel}>Yakılan</Text>
            </View>
            <View style={styles.caloryDivider} />
            <View style={styles.caloryItem}>
              <Text style={[styles.caloryItemValue, { color: remainingCalories > 0 ? Colors.primary[600] : Colors.error }]}>
                {remainingCalories}
              </Text>
              <Text style={styles.caloryItemLabel}>Kalan</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${calorieProgress * 100}%`,
                  backgroundColor:
                    calorieProgress > 1 ? Colors.error : calorieProgress > 0.8 ? Colors.warning : Colors.primary[500],
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {consumedCalories} / {dailyTarget} kcal ({Math.round(calorieProgress * 100)}%)
          </Text>
        </View>

        {/* Diet Plan & Weekly Report shortcut */}
        <TouchableOpacity
          style={[styles.dietPlanBtn, Shadows.sm]}
          onPress={() => router.push('/diet-recommendation')}
          activeOpacity={0.8}
        >
          <Text style={styles.dietPlanBtnIcon}>🥗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dietPlanBtnText}>Diyet Önerisi & Haftalık Rapor</Text>
            <Text style={styles.dietPlanBtnSub}>Kişisel yemek planı ve analiz</Text>
          </View>
          <Text style={{ fontSize: 16, color: Colors.text.light }}>›</Text>
        </TouchableOpacity>

        {isLoading && !dataLoaded ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
          </View>
        ) : (
          <>
            {/* Meal Sections */}
            {MEAL_SECTIONS.map((section) => {
              const sectionMeals = getMealsForType(section.key);
              const sectionCalories = getMealTypeCalories(section.key);

              return (
                <View key={section.key} style={[styles.mealSection, Shadows.sm]}>
                  <View style={styles.mealSectionHeader}>
                    <View style={styles.mealSectionLeft}>
                      <Text style={styles.mealSectionIcon}>{section.icon}</Text>
                      <View>
                        <Text style={styles.mealSectionTitle}>{section.label}</Text>
                        {sectionCalories > 0 && (
                          <Text style={styles.mealSectionCal}>{sectionCalories} kcal</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.mealSectionActions}>
                      <TouchableOpacity
                        style={styles.addBtnSmall}
                        onPress={() => openManualModal(section.key)}
                      >
                        <Text style={styles.addBtnSmallText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: section.color }]}
                        onPress={() => router.push('/(tabs)/scan')}
                      >
                        <Text style={styles.addBtnText}>+ 📸</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {sectionMeals.length === 0 ? (
                    <Text style={styles.emptyMealText}>Henüz eklenmedi</Text>
                  ) : (
                    sectionMeals.map((meal) => (
                      <TouchableOpacity
                        key={meal.id}
                        style={styles.mealItem}
                        onLongPress={() => meal.id && handleDeleteMeal(meal.id)}
                      >
                        <View style={styles.mealItemLeft}>
                          <Text style={styles.mealItemName}>{meal.foodName}</Text>
                          <Text style={styles.mealItemDetail}>
                            {meal.weight > 0 ? `${meal.weight}g • ` : ''}{meal.calories} kcal
                          </Text>
                        </View>
                        <Text style={styles.mealItemCalories}>{meal.calories}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              );
            })}

            {/* Exercise Section */}
            <View style={[styles.mealSection, Shadows.sm]}>
              <View style={styles.mealSectionHeader}>
                <View style={styles.mealSectionLeft}>
                  <Text style={styles.mealSectionIcon}>🏃</Text>
                  <View>
                    <Text style={styles.mealSectionTitle}>Egzersiz</Text>
                    {burnedCalories > 0 && (
                      <Text style={[styles.mealSectionCal, { color: Colors.accent.orange }]}>
                        -{burnedCalories} kcal
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: '#8b5cf6' }]}
                  onPress={() => setShowExerciseModal(true)}
                >
                  <Text style={styles.addBtnText}>+ Ekle</Text>
                </TouchableOpacity>
              </View>

              {exercises.length === 0 ? (
                <Text style={styles.emptyMealText}>Henüz egzersiz eklenmedi</Text>
              ) : (
                exercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.mealItem}
                    onLongPress={() => ex.id && handleDeleteExercise(ex.id)}
                  >
                    <View style={styles.mealItemLeft}>
                      <Text style={styles.mealItemName}>{ex.name}</Text>
                      <Text style={styles.mealItemDetail}>{ex.duration} dk</Text>
                    </View>
                    <Text style={[styles.mealItemCalories, { color: Colors.accent.orange }]}>
                      -{ex.caloriesBurned}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Bottom info */}
            <Text style={styles.footer}>Silmek için bir kayda uzun basın</Text>
          </>
        )}
      </ScrollView>

      {/* ─── Bottom Calorie Bar ──────────────────────────────────────── */}
      <View style={[styles.bottomBar, Shadows.lg]}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomBarItem}>
            <Text style={styles.bottomBarIcon}>🔥</Text>
            <Text style={styles.bottomBarValue}>{consumedCalories}</Text>
            <Text style={styles.bottomBarLabel}>kcal</Text>
          </View>
          <View style={styles.bottomBarCenter}>
            <Text style={styles.bottomBarSlash}>/</Text>
          </View>
          <View style={styles.bottomBarItem}>
            <Text style={styles.bottomBarIcon}>🎯</Text>
            <Text style={[styles.bottomBarValue, { color: Colors.primary[500] }]}>{dailyTarget}</Text>
            <Text style={styles.bottomBarLabel}>hedef</Text>
          </View>
        </View>
      </View>

      {/* ─── Manual Add Modal ────────────────────────────────────────── */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manuel Yemek Ekle</Text>
            <Text style={styles.modalSubtitle}>
              {MEAL_SECTIONS.find(s => s.key === manualMealType)?.icon}{' '}
              {MEAL_SECTIONS.find(s => s.key === manualMealType)?.label}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Yemek adı (ör: pizza, döner, pilav)"
              placeholderTextColor={Colors.text.light}
              value={manualFoodName}
              onChangeText={(text) => {
                setManualFoodName(text);
                setShowFoodSuggestions(true);
                // Auto-detect kcal/g
                const found = findFoodKcal(text);
                if (found) {
                  setSelectedFoodKcal(found.kcalPerGram);
                } else {
                  setSelectedFoodKcal(null);
                }
              }}
            />

            {/* Food suggestions */}
            {showFoodSuggestions && foodSuggestions.length > 0 && (
              <ScrollView style={styles.suggestionsContainer} nestedScrollEnabled>
                {foodSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setManualFoodName(item.display);
                      setSelectedFoodKcal(item.kcalPerGram);
                      setShowFoodSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item.display}</Text>
                    <Text style={styles.suggestionKcal}>{item.kcalPerGram} kcal/g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={styles.input}
              placeholder="Porsiyon ağırlığı (gram)"
              placeholderTextColor={Colors.text.light}
              keyboardType="numeric"
              value={manualWeight}
              onChangeText={setManualWeight}
            />

            {/* Auto-calculated calorie display */}
            <View style={styles.calorieDisplay}>
              <Text style={styles.calorieDisplayLabel}>Tahmini Kalori:</Text>
              <Text style={styles.calorieDisplayValue}>
                {manualCaloriesComputed > 0
                  ? `${manualCaloriesComputed} kcal`
                  : selectedFoodKcal
                    ? 'Gram girin'
                    : 'Yemek seçin'}
              </Text>
              {selectedFoodKcal !== null && (
                <Text style={styles.calorieDisplayHint}>
                  ({selectedFoodKcal} kcal/g)
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleManualAdd}>
                <Text style={styles.modalConfirmText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Exercise Modal ──────────────────────────────────────────── */}
      <Modal visible={showExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Egzersiz Ekle</Text>

            {/* Quick exercise picks */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseChips}>
              {COMMON_EXERCISES.map((ex) => (
                <TouchableOpacity
                  key={ex.name}
                  style={[
                    styles.exerciseChip,
                    exerciseName === ex.name && styles.exerciseChipActive,
                  ]}
                  onPress={() => {
                    setExerciseName(ex.name);
                    const dur = parseInt(exerciseDuration) || 30;
                    setExerciseCalories(String(Math.round(ex.calPer30 * dur / 30)));
                  }}
                >
                  <Text
                    style={[
                      styles.exerciseChipText,
                      exerciseName === ex.name && styles.exerciseChipTextActive,
                    ]}
                  >
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Egzersiz adı"
              placeholderTextColor={Colors.text.light}
              value={exerciseName}
              onChangeText={setExerciseName}
            />
            <TextInput
              style={styles.input}
              placeholder="Süre (dakika)"
              placeholderTextColor={Colors.text.light}
              keyboardType="numeric"
              value={exerciseDuration}
              onChangeText={(val) => {
                setExerciseDuration(val);
                // Auto-calc calories if common exercise selected
                const found = COMMON_EXERCISES.find(e => e.name === exerciseName);
                if (found) {
                  const dur = parseInt(val) || 30;
                  setExerciseCalories(String(Math.round(found.calPer30 * dur / 30)));
                }
              }}
            />
            <TextInput
              style={[styles.input, { backgroundColor: Colors.neutral[100], color: Colors.text.secondary }]}
              placeholder="Yakılan kalori (kcal)"
              placeholderTextColor={Colors.text.light}
              keyboardType="numeric"
              value={exerciseCalories}
              editable={false}
            />
            {!exerciseCalories && (
              <Text style={{ fontSize: 11, color: Colors.text.light, marginTop: -4, marginBottom: 8, paddingHorizontal: 4 }}>
                Egzersiz türü ve süre seçin, kalori otomatik hesaplanır
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowExerciseModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddExercise}>
                <Text style={styles.modalConfirmText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Calendar strip
  calendarStrip: {
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  calendarDay: {
    width: 48,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  calendarDaySelected: {
    backgroundColor: '#fff',
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  calendarDayName: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  calendarDayNumber: {
    fontSize: FontSize.lg,
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
  },
  calendarDayTextActive: {
    color: Colors.primary[700],
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
    marginTop: 2,
  },
  todayDotActive: {
    backgroundColor: Colors.primary[500],
  },
  // Content
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  // Calorie summary
  calorySummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  caloryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  caloryItem: {
    flex: 1,
    alignItems: 'center',
  },
  caloryItemValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  caloryItemLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  caloryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  // Meal sections
  mealSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mealSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mealSectionIcon: {
    fontSize: 24,
  },
  mealSectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  mealSectionCal: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  mealSectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  addBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  addBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnSmallText: {
    fontSize: 18,
  },
  emptyMealText: {
    color: Colors.text.light,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  // Meal items
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  mealItemLeft: {
    flex: 1,
  },
  mealItemName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  mealItemDetail: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  mealItemCalories: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.text.light,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bottomBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomBarCenter: {
    paddingHorizontal: 4,
  },
  bottomBarSlash: {
    fontSize: FontSize.xl,
    color: Colors.text.light,
    fontWeight: '300',
  },
  bottomBarIcon: {
    fontSize: 16,
  },
  bottomBarValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  bottomBarLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: FontSize.base,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.base,
  },
  // Exercise chips
  exerciseChips: {
    marginBottom: Spacing.md,
    maxHeight: 44,
  },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    marginRight: 8,
  },
  exerciseChipActive: {
    backgroundColor: Colors.primary[500],
  },
  exerciseChipText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  exerciseChipTextActive: {
    color: '#fff',
  },
  // Diet plan shortcut
  dietPlanBtn: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[200],
    gap: Spacing.md,
  },
  dietPlanBtnIcon: {
    fontSize: 28,
  },
  dietPlanBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  dietPlanBtnSub: {
    fontSize: FontSize.xs,
    color: Colors.primary[500],
    marginTop: 1,
  },
  // Food suggestions
  suggestionsContainer: {
    maxHeight: 160,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  suggestionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  suggestionKcal: {
    fontSize: FontSize.xs,
    color: Colors.primary[600],
    fontWeight: '500',
    marginLeft: 8,
  },
  // Calorie display
  calorieDisplay: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    alignItems: 'center',
  },
  calorieDisplayLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  calorieDisplayValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary[700],
    marginTop: 4,
  },
  calorieDisplayHint: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    marginTop: 2,
  },
});
