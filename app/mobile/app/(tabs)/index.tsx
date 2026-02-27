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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useUser } from '@/contexts/UserContext';
import { useTranslation, TranslationKey } from '@/i18n';
import {
  getMealsForDate,
  deleteMeal,
  updateMeal,
  logMeal,
  MealEntry,
  MealType,
  getExercisesForDate,
  deleteExercise,
  logExercise,
  ExerciseEntry,
  recordMealLog,
} from '../../src/services/firestoreService';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  FOOD_DATABASE,
  FoodInfo,
  FoodUnit,
  searchFoods,
  getFoodByKey,
  calculateCalories,
  calculateWeightGrams,
  getUnitLabel,
  getUnitPlaceholder,
} from '../../src/constants/foodDatabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────────────────────────

const MEAL_SECTIONS: { key: MealType; label: string; icon: string; color: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı', icon: '🌅', color: '#f59e0b' },
  { key: 'lunch', label: 'Öğle Yemeği', icon: '☀️', color: '#f97316' },
  { key: 'dinner', label: 'Akşam Yemeği', icon: '🌆', color: '#8b5cf6' },
  { key: 'snack', label: 'Aperatifler / Diğer', icon: '🍿', color: '#06b6d4' },
];

const EXERCISE_CATEGORIES: { category: string; emoji: string; exercises: { name: string; calPer30: number }[] }[] = [
  { category: 'Kardiyo', emoji: '🏃', exercises: [
    { name: 'Yürüyüş', calPer30: 120 },
    { name: 'Koşu', calPer30: 300 },
    { name: 'Bisiklet', calPer30: 250 },
    { name: 'Yüzme', calPer30: 280 },
    { name: 'İp Atlama', calPer30: 340 },
    { name: 'Merdiven Çıkma', calPer30: 220 },
    { name: 'Eliptik', calPer30: 260 },
    { name: 'Dans', calPer30: 200 },
  ]},
  { category: 'Güç / Vücut Geliştirme', emoji: '💪', exercises: [
    { name: 'Güç / Vücut Geliştirme', calPer30: 180 },
  ]},
  { category: 'Spor', emoji: '⚽', exercises: [
    { name: 'Futbol', calPer30: 260 },
    { name: 'Basketbol', calPer30: 280 },
    { name: 'Tenis', calPer30: 240 },
    { name: 'Voleybol', calPer30: 180 },
    { name: 'Masa Tenisi', calPer30: 140 },
    { name: 'Badminton', calPer30: 200 },
  ]},
  { category: 'Esneklik & Denge', emoji: '🧘', exercises: [
    { name: 'Yoga', calPer30: 90 },
    { name: 'Pilates', calPer30: 130 },
    { name: 'Esneme', calPer30: 70 },
  ]},
  { category: 'Günlük Aktiviteler', emoji: '🏠', exercises: [
    { name: 'Ev Temizliği', calPer30: 110 },
    { name: 'Bahçe İşleri', calPer30: 150 },
    { name: 'Merdiven İnip Çıkma', calPer30: 200 },
  ]},
];

// Flat lookup for calorie calculation
const ALL_EXERCISES = EXERCISE_CATEGORIES.flatMap(c => c.exercises);

// ─── Date helpers ───────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isSameDay(d1: Date, d2: Date): boolean {
  return formatDateKey(d1) === formatDateKey(d2);
}

function getDayNames(lang: string): string[] {
  return lang === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
}

function getMonthNames(lang: string): string[] {
  return lang === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
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
  const { t, lang } = useTranslation();
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
  const [manualAmount, setManualAmount] = useState('');
  const [manualUnit, setManualUnit] = useState<FoodUnit>('gram');
  const [selectedFood, setSelectedFood] = useState<FoodInfo | null>(null);
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false);

  // Exercise modal state
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseCalories, setExerciseCalories] = useState('');
  const [expandedExerciseCategory, setExpandedExerciseCategory] = useState<string | null>(null);

  const calendarRef = useRef<FlatList>(null);

  // ─── Computed meal calorie ────────────────────────────────────────
  const manualCaloriesComputed = useMemo(() => {
    const amount = parseFloat(manualAmount) || 0;
    if (!selectedFood || amount <= 0) return 0;
    return calculateCalories(selectedFood, amount, manualUnit);
  }, [selectedFood, manualAmount, manualUnit]);

  const foodSuggestions = useMemo(() => {
    return searchFoods(manualFoodName, 8);
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
    Alert.alert(t('common.delete'), t('home.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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

  // ─── Swipe-to-delete (instant, no confirm) ──────────────────────
  const handleSwipeDelete = async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      setMeals(prev => prev.filter(m => m.id !== mealId));
    } catch (err) {
      console.error('Swipe delete error:', err);
    }
  };

  // ─── Quantity +/- adjustment ──────────────────────────────────────
  const handleAdjustQuantity = async (meal: MealEntry, delta: number) => {
    if (!meal.id) return;
    
    const foodInfo = meal.foodKey ? getFoodByKey(meal.foodKey) : null;
    const currentQty = meal.quantity ?? 1;
    const unit = (meal.unit as FoodUnit) ?? 'gram';
    
    // If decreasing at minimum → delete the item entirely
    if (delta < 0) {
      const atMinimum =
        (unit === 'gram' && currentQty <= 50) ||
        (unit === 'ml' && currentQty <= 50) ||
        (unit === 'kase' && currentQty <= 0.5) ||
        (unit === 'adet' && currentQty <= 1) ||
        (unit === 'porsiyon' && currentQty <= 1) ||
        (unit === 'kucuk' && currentQty <= 1) ||
        (unit === 'buyuk' && currentQty <= 1);
      
      if (atMinimum) {
        try {
          await deleteMeal(meal.id);
          setMeals(prev => prev.filter(m => m.id !== meal.id));
        } catch (err) {
          console.error('Delete at minimum error:', err);
        }
        return;
      }
    }
    
    let newQty: number;
    if (unit === 'gram') {
      newQty = Math.max(50, currentQty + delta * 50); // +/- 50g
    } else if (unit === 'ml') {
      newQty = Math.max(50, currentQty + delta * 50); // +/- 50ml
    } else if (unit === 'kase') {
      newQty = Math.max(0.5, currentQty + delta * 0.5); // +/- 0.5 kase
    } else {
      // adet
      newQty = Math.max(1, currentQty + delta); // +/- 1 adet
    }
    
    let newCal: number;
    let newWeight: number;
    if (foodInfo) {
      newCal = calculateCalories(foodInfo, newQty, unit);
      newWeight = calculateWeightGrams(foodInfo, newQty, unit);
    } else {
      // Fallback: proportional adjustment
      const ratio = currentQty > 0 ? newQty / currentQty : 1;
      newCal = Math.round(meal.calories * ratio);
      newWeight = Math.round(meal.weight * ratio);
    }
    
    const updates = {
      quantity: newQty,
      calories: newCal,
      weight: newWeight,
      protein: Math.round(newCal * 0.25 / 4),
      carbs: Math.round(newCal * 0.45 / 4),
      fat: Math.round(newCal * 0.30 / 9),
    };
    
    try {
      await updateMeal(meal.id, updates);
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, ...updates } : m));
    } catch (err) {
      console.error('Quantity update error:', err);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    Alert.alert(t('common.delete'), t('home.deleteExerciseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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
    const amount = parseFloat(manualAmount) || 0;
    if (amount <= 0) {
      Alert.alert('Hata', `Lütfen miktar girin (${getUnitLabel(manualUnit)}).`);
      return;
    }
    
    let cal: number;
    let weight: number;
    
    if (selectedFood) {
      cal = calculateCalories(selectedFood, amount, manualUnit);
      weight = calculateWeightGrams(selectedFood, amount, manualUnit);
    } else {
      // Fallback for unknown foods: assume 1.5 kcal/g, treat as gram
      weight = Math.round(amount);
      cal = Math.round(1.5 * weight);
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
        quantity: amount,
        unit: manualUnit,
        foodKey: selectedFood?.key,
      });
      setMeals(prev => [{
        id, uid: profile.uid!, date: formatDateKey(selectedDate),
        mealType: manualMealType, foodName: manualFoodName.trim(),
        calories: cal, protein: Math.round(cal * 0.25 / 4),
        carbs: Math.round(cal * 0.45 / 4), fat: Math.round(cal * 0.30 / 9),
        weight, quantity: amount, unit: manualUnit, foodKey: selectedFood?.key,
      }, ...prev]);

      // Record meal for streak tracking
      try {
        await recordMealLog(profile.uid);
      } catch (e) {
        console.warn('recordMealLog failed:', e);
      }

      setShowManualModal(false);
      setManualFoodName('');
      setManualAmount('');
      setSelectedFood(null);
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
    setManualAmount('');
    setSelectedFood(null);
    setManualUnit('gram');
    setShowFoodSuggestions(false);
    setShowManualModal(true);
  };

  // ─── Calendar strip ───────────────────────────────────────────────
  const calendarDays = getCalendarDays(today);
  const dayNames = getDayNames(lang);
  const monthNames = getMonthNames(lang);

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
            <Text style={styles.greeting}>{t('home.greeting', { name: profile.name ?? (lang === 'en' ? 'User' : 'Kullanıcı') })}</Text>
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
              <Text style={styles.caloryItemLabel}>{t('home.consumed')}</Text>
            </View>
            <View style={styles.caloryDivider} />
            <View style={styles.caloryItem}>
              <Text style={[styles.caloryItemValue, { color: Colors.primary[500] }]}>{dailyTarget}</Text>
              <Text style={styles.caloryItemLabel}>{t('home.target')}</Text>
            </View>
            <View style={styles.caloryDivider} />
            <View style={styles.caloryItem}>
              <Text style={[styles.caloryItemValue, { color: Colors.accent.orange }]}>{burnedCalories}</Text>
              <Text style={styles.caloryItemLabel}>{t('home.burned')}</Text>
            </View>
            <View style={styles.caloryDivider} />
            <View style={styles.caloryItem}>
              <Text style={[styles.caloryItemValue, { color: remainingCalories > 0 ? Colors.primary[600] : Colors.error }]}>
                {remainingCalories}
              </Text>
              <Text style={styles.caloryItemLabel}>{t('home.remaining')}</Text>
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
            <Text style={styles.dietPlanBtnText}>{t('home.dietSuggestion')}</Text>
            <Text style={styles.dietPlanBtnSub}>{t('home.personalPlan')}</Text>
          </View>
          <Text style={{ fontSize: 16, color: Colors.text.light }}>›</Text>
        </TouchableOpacity>

        {isLoading && !dataLoaded ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>{t('home.dataLoading')}</Text>
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
                        <Text style={styles.mealSectionTitle}>{t(`home.${section.key}` as TranslationKey)}</Text>
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
                    <Text style={styles.emptyMealText}>{t('home.notAdded')}</Text>
                  ) : (
                    sectionMeals.map((meal) => (
                      <Swipeable
                        key={meal.id}
                        renderRightActions={() => (
                          <View style={styles.swipeDeleteAction}>
                            <Text style={styles.swipeDeleteEmoji}>🗑️</Text>
                            <Text style={styles.swipeDeleteText}>{t('common.delete')}</Text>
                          </View>
                        )}
                        renderLeftActions={() => (
                          <View style={styles.swipeDeleteAction}>
                            <Text style={styles.swipeDeleteEmoji}>🗑️</Text>
                            <Text style={styles.swipeDeleteText}>{t('common.delete')}</Text>
                          </View>
                        )}
                        onSwipeableOpen={() => meal.id && handleSwipeDelete(meal.id)}
                        friction={2}
                        rightThreshold={60}
                        leftThreshold={60}
                        overshootLeft={false}
                        overshootRight={false}
                      >
                      <View style={[styles.mealItem, { backgroundColor: Colors.surface }]}>
                        <TouchableOpacity
                          style={styles.mealItemLeft}
                          onPress={() => router.push({
                            pathname: '/food-detail',
                            params: {
                              foodName: meal.foodName,
                              foodKey: meal.foodKey ?? '',
                              calories: String(meal.calories),
                              weight: String(meal.weight),
                              quantity: String(meal.quantity ?? ''),
                              unit: meal.unit ?? '',
                              protein: String(meal.protein ?? 0),
                              carbs: String(meal.carbs ?? 0),
                              fat: String(meal.fat ?? 0),
                            },
                          })}
                          onLongPress={() => meal.id && handleDeleteMeal(meal.id)}
                        >
                          <Text style={styles.mealItemName}>{meal.foodName}</Text>
                          <Text style={styles.mealItemDetail}>
                            {meal.quantity && meal.unit
                              ? `${meal.quantity} ${getUnitLabel(meal.unit as FoodUnit)} • `
                              : meal.weight > 0 ? `${meal.weight}g • ` : ''}
                            {meal.calories} kcal
                          </Text>
                        </TouchableOpacity>
                        {/* +/- buttons */}
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => handleAdjustQuantity(meal, -1)}
                          >
                            <Text style={styles.quantityBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.mealItemCalories}>{meal.calories}</Text>
                          <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => handleAdjustQuantity(meal, 1)}
                          >
                            <Text style={styles.quantityBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      </Swipeable>
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
                    <Text style={styles.mealSectionTitle}>{t('home.exercise')}</Text>
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
                  <Text style={styles.addBtnText}>+ {t('common.add')}</Text>
                </TouchableOpacity>
              </View>

              {exercises.length === 0 ? (
                <Text style={styles.emptyMealText}>{t('home.exerciseNotAdded')}</Text>
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
            <Text style={styles.footer}>{t('home.swipeHint')}</Text>
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
            <Text style={styles.modalTitle}>{t('home.addFood')}</Text>
            <Text style={styles.modalSubtitle}>
              {MEAL_SECTIONS.find(s => s.key === manualMealType)?.icon}{' '}
              {MEAL_SECTIONS.find(s => s.key === manualMealType)?.label}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Yemek adı (ör: mercimek çorbası, döner, baklava)"
              placeholderTextColor={Colors.text.light}
              value={manualFoodName}
              onChangeText={(text) => {
                setManualFoodName(text);
                setShowFoodSuggestions(true);
                // Auto-detect food from database
                const results = searchFoods(text, 1);
                if (results.length > 0 && results[0].displayName.toLowerCase() === text.toLowerCase()) {
                  setSelectedFood(results[0]);
                  setManualUnit(results[0].unit);
                  setManualAmount(String(results[0].defaultPortion));
                }
              }}
            />

            {/* Food suggestions from 201 classes */}
            {showFoodSuggestions && foodSuggestions.length > 0 && (
              <ScrollView style={styles.suggestionsContainer} nestedScrollEnabled>
                {foodSuggestions.map((food) => (
                  <TouchableOpacity
                    key={food.key}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setManualFoodName(food.displayName);
                      setSelectedFood(food);
                      setManualUnit(food.unit);
                      setManualAmount(String(food.defaultPortion));
                      setShowFoodSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionEmoji}>{food.emoji}</Text>
                    <Text style={styles.suggestionText}>{food.displayName}</Text>
                    <Text style={styles.suggestionKcal}>{food.kcalPer100g} kcal/100g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Unit selector (for foods with altUnits like soups) */}
            {selectedFood && selectedFood.altUnits && selectedFood.altUnits.length > 0 && (
              <View style={styles.unitSelector}>
                <Text style={styles.unitSelectorLabel}>Birim:</Text>
                {[selectedFood.unit, ...selectedFood.altUnits].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitChip,
                      manualUnit === u && styles.unitChipActive,
                    ]}
                    onPress={() => {
                      setManualUnit(u);
                      // Reset amount to default for unit
                      if (u === 'kase') setManualAmount(String(selectedFood.defaultPortion));
                      else if (u === 'ml') setManualAmount(String(selectedFood.portionGrams));
                      else if (u === 'kucuk' || u === 'buyuk') setManualAmount(String(selectedFood.defaultPortion));
                      else if (u === 'porsiyon') setManualAmount('1');
                    }}
                  >
                    <Text style={[
                      styles.unitChipText,
                      manualUnit === u && styles.unitChipTextActive,
                    ]}>
                      {getUnitLabel(u)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Amount input */}
            <TextInput
              style={styles.input}
              placeholder={selectedFood ? getUnitPlaceholder(manualUnit) : 'Porsiyon (gram)'}
              placeholderTextColor={Colors.text.light}
              keyboardType="numeric"
              value={manualAmount}
              onChangeText={setManualAmount}
            />

            {/* Selected food unit info */}
            {selectedFood && (
              <View style={styles.unitInfoRow}>
                <Text style={styles.unitInfoEmoji}>{selectedFood.emoji}</Text>
                <Text style={styles.unitInfoText}>
                  {manualUnit === 'adet' ? `1 adet = ~${selectedFood.portionGrams}g` :
                   manualUnit === 'kucuk' ? `1 küçük = ~${selectedFood.sizes?.kucuk ?? Math.round(selectedFood.portionGrams * 0.75)}g` :
                   manualUnit === 'buyuk' ? `1 büyük = ~${selectedFood.sizes?.buyuk ?? Math.round(selectedFood.portionGrams * 1.3)}g` :
                   manualUnit === 'porsiyon' ? `1 porsiyon = ~${selectedFood.unit === 'gram' || selectedFood.unit === 'ml' ? selectedFood.defaultPortion : selectedFood.defaultPortion * selectedFood.portionGrams}g` :
                   manualUnit === 'kase' ? `1 kase = ~${selectedFood.portionGrams}ml` :
                   manualUnit === 'ml' ? '1 ml ≈ 1g' :
                   `${selectedFood.kcalPer100g} kcal/100g`}
                </Text>
              </View>
            )}

            {/* Auto-calculated calorie display */}
            <View style={styles.calorieDisplay}>
              <Text style={styles.calorieDisplayLabel}>Tahmini Kalori:</Text>
              <Text style={styles.calorieDisplayValue}>
                {manualCaloriesComputed > 0
                  ? `${manualCaloriesComputed} kcal`
                  : selectedFood
                    ? 'Miktar girin'
                    : 'Yemek seçin'}
              </Text>
              {selectedFood && manualCaloriesComputed > 0 && (
                <Text style={styles.calorieDisplayHint}>
                  ({parseFloat(manualAmount) || 0} {getUnitLabel(manualUnit)} = ~{selectedFood ? calculateWeightGrams(selectedFood, parseFloat(manualAmount) || 0, manualUnit) : 0}g)
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
            <Text style={styles.modalTitle}>{t('home.addExercise')}</Text>

            {/* Categorized exercise picker */}
            <ScrollView style={{ maxHeight: 220, marginBottom: 8 }} nestedScrollEnabled>
              {EXERCISE_CATEGORIES.map((cat) => (
                <View key={cat.category}>
                  <TouchableOpacity
                    style={[styles.exerciseCategoryHeader, expandedExerciseCategory === cat.category && styles.exerciseCategoryHeaderActive]}
                    onPress={() => setExpandedExerciseCategory(expandedExerciseCategory === cat.category ? null : cat.category)}
                  >
                    <Text style={styles.exerciseCategoryTitle}>{cat.emoji} {cat.category}</Text>
                    <Text style={styles.exerciseCategoryArrow}>{expandedExerciseCategory === cat.category ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {expandedExerciseCategory === cat.category && (
                    <View style={styles.exerciseCategoryBody}>
                      {cat.exercises.map((ex) => (
                        <TouchableOpacity
                          key={ex.name}
                          style={[styles.exerciseChip, exerciseName === ex.name && styles.exerciseChipActive]}
                          onPress={() => {
                            setExerciseName(ex.name);
                            const dur = parseInt(exerciseDuration) || 30;
                            setExerciseCalories(String(Math.round(ex.calPer30 * dur / 30)));
                          }}
                        >
                          <Text style={[styles.exerciseChipText, exerciseName === ex.name && styles.exerciseChipTextActive]}>
                            {ex.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
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
                const found = ALL_EXERCISES.find(e => e.name === exerciseName);
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
  exerciseCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    marginBottom: 4,
  },
  exerciseCategoryHeaderActive: {
    backgroundColor: Colors.primary[50],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  exerciseCategoryTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  exerciseCategoryArrow: {
    fontSize: 10,
    color: Colors.text.light,
  },
  exerciseCategoryBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: Colors.neutral[50],
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    marginBottom: 6,
  },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    marginRight: 0,
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
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  suggestionEmoji: {
    fontSize: 20,
    marginRight: 8,
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
  // Unit selector
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 8,
  },
  unitSelectorLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginRight: 4,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.neutral[300],
    backgroundColor: Colors.surface,
  },
  unitChipActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  unitChipText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  unitChipTextActive: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  // Unit info row
  unitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  unitInfoEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  unitInfoText: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    fontStyle: 'italic',
  },
  // Quantity controls on meal items
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary[700],
  },

  // Swipe delete action
  swipeDeleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 0,
    paddingHorizontal: 8,
  },
  swipeDeleteEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
