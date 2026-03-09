import React, { useState, useCallback, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
} from '../src/services/firestoreService';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  FoodInfo,
  FoodUnit,
  searchFoods,
  getFoodByKey,
  calculateCalories,
  calculateWeightGrams,
  getUnitLabel,
  getUnitPlaceholder,
} from '../src/constants/foodDatabase';

const MEAL_SECTIONS: { key: MealType; label: string; icon: string; color: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı', icon: '🌅', color: '#f59e0b' },
  { key: 'lunch', label: 'Öğle Yemeği', icon: '☀️', color: '#f97316' },
  { key: 'dinner', label: 'Akşam Yemeği', icon: '🌆', color: '#8b5cf6' },
  { key: 'snack', label: 'Aperatifler / Diğer', icon: '🍿', color: '#06b6d4' },
];

const EXERCISE_CATEGORIES: { category: string; emoji: string; exercises: { name: string; calPer30: number }[] }[] = [
  { category: 'Kardiyo', emoji: '🏃', exercises: [
    { name: 'Yürüyüş', calPer30: 120 }, { name: 'Koşu', calPer30: 300 }, { name: 'Bisiklet', calPer30: 250 },
    { name: 'Yüzme', calPer30: 280 }, { name: 'İp Atlama', calPer30: 340 }, { name: 'Merdiven Çıkma', calPer30: 220 },
    { name: 'Eliptik', calPer30: 260 }, { name: 'Dans', calPer30: 200 },
  ]},
  { category: 'Güç / Vücut Geliştirme', emoji: '💪', exercises: [{ name: 'Güç / Vücut Geliştirme', calPer30: 180 }] },
  { category: 'Spor', emoji: '⚽', exercises: [
    { name: 'Futbol', calPer30: 260 }, { name: 'Basketbol', calPer30: 280 }, { name: 'Tenis', calPer30: 240 },
    { name: 'Voleybol', calPer30: 180 }, { name: 'Masa Tenisi', calPer30: 140 }, { name: 'Badminton', calPer30: 200 },
  ]},
  { category: 'Esneklik & Denge', emoji: '🧘', exercises: [
    { name: 'Yoga', calPer30: 90 }, { name: 'Pilates', calPer30: 130 }, { name: 'Esneme', calPer30: 70 },
  ]},
  { category: 'Günlük Aktiviteler', emoji: '🏠', exercises: [
    { name: 'Ev Temizliği', calPer30: 110 }, { name: 'Bahçe İşleri', calPer30: 150 }, { name: 'Merdiven İnip Çıkma', calPer30: 200 },
  ]},
];

const ALL_EXERCISES = EXERCISE_CATEGORIES.flatMap(c => c.exercises);

export default function DayDetailScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const dateKey = params.date ?? new Date().toISOString().split('T')[0];

  const { profile, calculateDailyCalories } = useUser();
  const { t } = useTranslation();

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Manual entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMealType, setManualMealType] = useState<MealType>('lunch');
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualUnit, setManualUnit] = useState<FoodUnit>('gram');
  const [selectedFood, setSelectedFood] = useState<FoodInfo | null>(null);
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false);

  // Exercise modal
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseCalories, setExerciseCalories] = useState('');
  const [expandedExerciseCategory, setExpandedExerciseCategory] = useState<string | null>(null);

  const manualCaloriesComputed = useMemo(() => {
    const amount = parseFloat(manualAmount) || 0;
    if (!selectedFood || amount <= 0) return 0;
    return calculateCalories(selectedFood, amount, manualUnit);
  }, [selectedFood, manualAmount, manualUnit]);

  const foodSuggestions = useMemo(() => searchFoods(manualFoodName, 8), [manualFoodName]);

  // ─── Load ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!profile.uid) return;
    setIsLoading(true);
    try {
      const [ml, ex] = await Promise.all([
        getMealsForDate(profile.uid, dateKey),
        getExercisesForDate(profile.uid, dateKey),
      ]);
      setMeals(ml);
      setExercises(ex);
    } catch (e) { console.error('DayDetail load error:', e); }
    finally { setIsLoading(false); setDataLoaded(true); }
  }, [profile.uid, dateKey]);

  const loadedRef = React.useRef(false);
  if (!loadedRef.current && profile.uid) { loadedRef.current = true; loadData(); }

  // ─── Calculations ──────────────────────────────────────────────────
  const dailyTarget = calculateDailyCalories();
  const consumedCalories = meals.reduce((s, m) => s + m.calories, 0);
  const burnedCalories = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const remainingCalories = Math.max(0, dailyTarget - consumedCalories + burnedCalories);
  const calorieProgress = dailyTarget > 0 ? Math.min(consumedCalories / dailyTarget, 1) : 0;
  const getMealsForType = (type: MealType) => meals.filter(m => m.mealType === type);
  const getMealTypeCalories = (type: MealType) => getMealsForType(type).reduce((s, m) => s + m.calories, 0);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleSwipeDelete = async (id: string) => {
    try { await deleteMeal(id); setMeals(prev => prev.filter(m => m.id !== id)); } catch (e) { console.error(e); }
  };

  const handleDeleteMeal = (id: string) => {
    Alert.alert(t('common.delete'), t('home.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => handleSwipeDelete(id) },
    ]);
  };

  const handleAdjustQuantity = async (meal: MealEntry, delta: number) => {
    if (!meal.id) return;
    const foodInfo = meal.foodKey ? getFoodByKey(meal.foodKey) : null;
    const currentQty = meal.quantity ?? 1;
    const unit = (meal.unit as FoodUnit) ?? 'gram';
    if (delta < 0) {
      const atMin = (unit === 'gram' && currentQty <= 50) || (unit === 'ml' && currentQty <= 50) ||
        (unit === 'kase' && currentQty <= 0.5) || (unit === 'adet' && currentQty <= 1) ||
        (unit === 'porsiyon' && currentQty <= 1) || (unit === 'kucuk' && currentQty <= 1) || (unit === 'buyuk' && currentQty <= 1);
      if (atMin) { try { await deleteMeal(meal.id); setMeals(prev => prev.filter(m => m.id !== meal.id)); } catch {} return; }
    }
    let newQty: number;
    if (unit === 'gram' || unit === 'ml') newQty = Math.max(50, currentQty + delta * 50);
    else if (unit === 'kase') newQty = Math.max(0.5, currentQty + delta * 0.5);
    else newQty = Math.max(1, currentQty + delta);

    let newCal: number, newWeight: number;
    if (foodInfo) { newCal = calculateCalories(foodInfo, newQty, unit); newWeight = calculateWeightGrams(foodInfo, newQty, unit); }
    else { const ratio = currentQty > 0 ? newQty / currentQty : 1; newCal = Math.round(meal.calories * ratio); newWeight = Math.round(meal.weight * ratio); }

    const updates = {
      quantity: newQty, calories: newCal, weight: newWeight,
      protein: Math.round(newCal * 0.25 / 4), carbs: Math.round(newCal * 0.45 / 4), fat: Math.round(newCal * 0.30 / 9),
    };
    try { await updateMeal(meal.id, updates); setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, ...updates } : m)); } catch {}
  };

  const handleDeleteExercise = (id: string) => {
    Alert.alert(t('common.delete'), t('home.deleteExerciseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await deleteExercise(id); setExercises(prev => prev.filter(e => e.id !== id)); } catch {}
      }},
    ]);
  };

  const handleManualAdd = async () => {
    if (!profile.uid || !manualFoodName.trim()) { Alert.alert('Hata', 'Yemek adı girmelisiniz.'); return; }
    const amount = parseFloat(manualAmount) || 0;
    if (amount <= 0) { Alert.alert('Hata', `Lütfen miktar girin (${getUnitLabel(manualUnit)}).`); return; }
    let cal: number, weight: number;
    if (selectedFood) { cal = calculateCalories(selectedFood, amount, manualUnit); weight = calculateWeightGrams(selectedFood, amount, manualUnit); }
    else { weight = Math.round(amount); cal = Math.round(1.5 * weight); }
    try {
      const id = await logMeal(profile.uid, {
        date: dateKey, mealType: manualMealType, foodName: manualFoodName.trim(), calories: cal,
        protein: Math.round(cal * 0.25 / 4), carbs: Math.round(cal * 0.45 / 4), fat: Math.round(cal * 0.30 / 9),
        weight, quantity: amount, unit: manualUnit, foodKey: selectedFood?.key,
      });
      setMeals(prev => [{ id, uid: profile.uid!, date: dateKey, mealType: manualMealType, foodName: manualFoodName.trim(),
        calories: cal, protein: Math.round(cal * 0.25 / 4), carbs: Math.round(cal * 0.45 / 4), fat: Math.round(cal * 0.30 / 9),
        weight, quantity: amount, unit: manualUnit, foodKey: selectedFood?.key }, ...prev]);
      try { await recordMealLog(profile.uid); } catch {}
      setShowManualModal(false); setManualFoodName(''); setManualAmount(''); setSelectedFood(null);
    } catch { Alert.alert('Hata', 'Kayıt eklenemedi.'); }
  };

  const handleAddExercise = async () => {
    if (!profile.uid || !exerciseName.trim()) { Alert.alert('Hata', 'Egzersiz adı girmelisiniz.'); return; }
    const duration = parseInt(exerciseDuration) || 30;
    const cal = parseInt(exerciseCalories) || 0;
    try {
      const id = await logExercise(profile.uid, { date: dateKey, name: exerciseName.trim(), duration, caloriesBurned: cal });
      setExercises(prev => [{ id, uid: profile.uid!, date: dateKey, name: exerciseName.trim(), duration, caloriesBurned: cal }, ...prev]);
      setShowExerciseModal(false); setExerciseName(''); setExerciseDuration(''); setExerciseCalories('');
    } catch { Alert.alert('Hata', 'Egzersiz eklenemedi.'); }
  };

  const openManualModal = (mealType: MealType) => {
    setManualMealType(mealType); setManualFoodName(''); setManualAmount(''); setSelectedFood(null); setManualUnit('gram');
    setShowFoodSuggestions(false); setShowManualModal(true);
  };

  // Date display
  const dp = new Date(dateKey);
  const dateLabel = `${dp.getDate()} ${['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][dp.getMonth()]} ${dp.getFullYear()}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dateLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, Shadows.sm]}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{consumedCalories}</Text>
          <Text style={styles.summaryLbl}>{t('home.consumed')}</Text>
        </View>
        <View style={styles.summaryDiv} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.primary[500] }]}>{dailyTarget}</Text>
          <Text style={styles.summaryLbl}>{t('home.target')}</Text>
        </View>
        <View style={styles.summaryDiv} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.accent.orange }]}>{burnedCalories}</Text>
          <Text style={styles.summaryLbl}>{t('home.burned')}</Text>
        </View>
        <View style={styles.summaryDiv} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: remainingCalories > 0 ? Colors.primary[600] : Colors.error }]}>{remainingCalories}</Text>
          <Text style={styles.summaryLbl}>{t('home.remaining')}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, {
          width: `${calorieProgress * 100}%`,
          backgroundColor: calorieProgress > 1 ? Colors.error : calorieProgress > 0.8 ? Colors.warning : Colors.primary[500],
        }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading && !dataLoaded ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
          </View>
        ) : (
          <>
            {/* Meal Sections */}
            {MEAL_SECTIONS.map((section) => {
              const sectionMeals = getMealsForType(section.key);
              const sectionCal = getMealTypeCalories(section.key);
              return (
                <View key={section.key} style={[styles.mealSection, Shadows.sm]}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealLeft}>
                      <Text style={{ fontSize: 24 }}>{section.icon}</Text>
                      <View>
                        <Text style={styles.mealTitle}>{t(`home.${section.key}` as TranslationKey)}</Text>
                        {sectionCal > 0 && <Text style={styles.mealCal}>{sectionCal} kcal</Text>}
                      </View>
                    </View>
                    <View style={styles.mealActions}>
                      <TouchableOpacity style={styles.addBtnSm} onPress={() => openManualModal(section.key)}>
                        <Text style={{ fontSize: 18 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.addBtn, { backgroundColor: section.color }]}
                        onPress={() => router.push('/(tabs)/scan')}>
                        <Text style={styles.addBtnTxt}>+ 📸</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {sectionMeals.length === 0 ? (
                    <Text style={styles.emptyTxt}>{t('home.notAdded')}</Text>
                  ) : (
                    sectionMeals.map((meal) => (
                      <Swipeable key={meal.id}
                        renderRightActions={() => (
                          <View style={styles.swipeDel}>
                            <Text style={{ fontSize: 20 }}>🗑️</Text>
                            <Text style={styles.swipeDelTxt}>{t('common.delete')}</Text>
                          </View>
                        )}
                        renderLeftActions={() => (
                          <View style={styles.swipeDel}>
                            <Text style={{ fontSize: 20 }}>🗑️</Text>
                            <Text style={styles.swipeDelTxt}>{t('common.delete')}</Text>
                          </View>
                        )}
                        onSwipeableOpen={() => meal.id && handleSwipeDelete(meal.id)}
                        friction={2} rightThreshold={60} leftThreshold={60} overshootLeft={false} overshootRight={false}
                      >
                        <View style={styles.mealItem}>
                          <TouchableOpacity style={{ flex: 1 }}
                            onPress={() => router.push({ pathname: '/food-detail', params: {
                              foodName: meal.foodName, foodKey: meal.foodKey ?? '', calories: String(meal.calories),
                              weight: String(meal.weight), quantity: String(meal.quantity ?? ''), unit: meal.unit ?? '',
                              protein: String(meal.protein ?? 0), carbs: String(meal.carbs ?? 0), fat: String(meal.fat ?? 0),
                            }})}
                            onLongPress={() => meal.id && handleDeleteMeal(meal.id)}
                          >
                            <Text style={styles.mealItemName}>{meal.foodName}</Text>
                            <Text style={styles.mealItemDetail}>
                              {meal.quantity && meal.unit ? `${meal.quantity} ${getUnitLabel(meal.unit as FoodUnit)} • ` : meal.weight > 0 ? `${meal.weight}g • ` : ''}
                              {meal.calories} kcal
                            </Text>
                          </TouchableOpacity>
                          <View style={styles.qtyControls}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAdjustQuantity(meal, -1)}>
                              <Text style={styles.qtyBtnTxt}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.mealItemCal}>{meal.calories}</Text>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAdjustQuantity(meal, 1)}>
                              <Text style={styles.qtyBtnTxt}>+</Text>
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
              <View style={styles.mealHeader}>
                <View style={styles.mealLeft}>
                  <Text style={{ fontSize: 24 }}>🏃</Text>
                  <View>
                    <Text style={styles.mealTitle}>{t('home.exercise')}</Text>
                    {burnedCalories > 0 && <Text style={[styles.mealCal, { color: Colors.accent.orange }]}>-{burnedCalories} kcal</Text>}
                  </View>
                </View>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => setShowExerciseModal(true)}>
                  <Text style={styles.addBtnTxt}>+ {t('common.add')}</Text>
                </TouchableOpacity>
              </View>
              {exercises.length === 0 ? (
                <Text style={styles.emptyTxt}>{t('home.exerciseNotAdded')}</Text>
              ) : (
                exercises.map((ex) => (
                  <TouchableOpacity key={ex.id} style={styles.mealItem} onLongPress={() => ex.id && handleDeleteExercise(ex.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealItemName}>{ex.name}</Text>
                      <Text style={styles.mealItemDetail}>{ex.duration} dk</Text>
                    </View>
                    <Text style={[styles.mealItemCal, { color: Colors.accent.orange }]}>-{ex.caloriesBurned}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <Text style={styles.footer}>{t('home.swipeHint')}</Text>
          </>
        )}
      </ScrollView>

      {/* ─── Manual Add Modal ────────────────────────────────────────── */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('home.addFood')}</Text>
            <Text style={styles.modalSub}>
              {MEAL_SECTIONS.find(s => s.key === manualMealType)?.icon}{' '}
              {MEAL_SECTIONS.find(s => s.key === manualMealType)?.label}
            </Text>

            <TextInput style={styles.input} placeholder="Yemek adı (ör: mercimek çorbası, döner, baklava)"
              placeholderTextColor={Colors.text.light} value={manualFoodName}
              onChangeText={(text) => {
                setManualFoodName(text); setShowFoodSuggestions(true);
                const results = searchFoods(text, 1);
                if (results.length > 0 && results[0].displayName.toLowerCase() === text.toLowerCase()) {
                  setSelectedFood(results[0]); setManualUnit(results[0].unit); setManualAmount(String(results[0].defaultPortion));
                }
              }}
            />

            {showFoodSuggestions && foodSuggestions.length > 0 && (
              <ScrollView style={styles.suggestBox} nestedScrollEnabled>
                {foodSuggestions.map((food) => (
                  <TouchableOpacity key={food.key} style={styles.suggestItem}
                    onPress={() => {
                      setManualFoodName(food.displayName); setSelectedFood(food); setManualUnit(food.unit);
                      setManualAmount(String(food.defaultPortion)); setShowFoodSuggestions(false);
                    }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>{food.emoji}</Text>
                    <Text style={styles.suggestTxt}>{food.displayName}</Text>
                    <Text style={styles.suggestKcal}>{food.kcalPer100g} kcal/100g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedFood && selectedFood.altUnits && selectedFood.altUnits.length > 0 && (
              <View style={styles.unitRow}>
                <Text style={styles.unitLabel}>Birim:</Text>
                {[selectedFood.unit, ...selectedFood.altUnits].map((u) => (
                  <TouchableOpacity key={u} style={[styles.unitChip, manualUnit === u && styles.unitChipActive]}
                    onPress={() => {
                      setManualUnit(u);
                      if (u === 'kase') setManualAmount(String(selectedFood.defaultPortion));
                      else if (u === 'ml') setManualAmount(String(selectedFood.portionGrams));
                      else if (u === 'kucuk' || u === 'buyuk') setManualAmount(String(selectedFood.defaultPortion));
                      else if (u === 'porsiyon') setManualAmount('1');
                    }}>
                    <Text style={[styles.unitChipTxt, manualUnit === u && styles.unitChipTxtActive]}>{getUnitLabel(u)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput style={styles.input}
              placeholder={selectedFood ? getUnitPlaceholder(manualUnit) : 'Porsiyon (gram)'}
              placeholderTextColor={Colors.text.light} keyboardType="numeric" value={manualAmount} onChangeText={setManualAmount}
            />

            {selectedFood && (
              <View style={styles.unitInfoRow}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{selectedFood.emoji}</Text>
                <Text style={styles.unitInfoTxt}>
                  {manualUnit === 'adet' ? `1 adet = ~${selectedFood.portionGrams}g` :
                   manualUnit === 'kucuk' ? `1 küçük = ~${selectedFood.sizes?.kucuk ?? Math.round(selectedFood.portionGrams * 0.75)}g` :
                   manualUnit === 'buyuk' ? `1 büyük = ~${selectedFood.sizes?.buyuk ?? Math.round(selectedFood.portionGrams * 1.3)}g` :
                   manualUnit === 'porsiyon' ? `1 porsiyon = ~${selectedFood.unit === 'gram' || selectedFood.unit === 'ml' ? selectedFood.defaultPortion : selectedFood.defaultPortion * selectedFood.portionGrams}g` :
                   manualUnit === 'kase' ? `1 kase = ~${selectedFood.portionGrams}ml` :
                   manualUnit === 'ml' ? '1 ml ≈ 1g' : `${selectedFood.kcalPer100g} kcal/100g`}
                </Text>
              </View>
            )}

            <View style={styles.calDisplay}>
              <Text style={styles.calDisplayLbl}>Tahmini Kalori:</Text>
              <Text style={styles.calDisplayVal}>
                {manualCaloriesComputed > 0 ? `${manualCaloriesComputed} kcal` : selectedFood ? 'Miktar girin' : 'Yemek seçin'}
              </Text>
              {selectedFood && manualCaloriesComputed > 0 && (
                <Text style={styles.calDisplayHint}>
                  ({parseFloat(manualAmount) || 0} {getUnitLabel(manualUnit)} = ~{calculateWeightGrams(selectedFood, parseFloat(manualAmount) || 0, manualUnit)}g)
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowManualModal(false)}>
                <Text style={styles.modalCancelTxt}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleManualAdd}>
                <Text style={styles.modalConfirmTxt}>Ekle</Text>
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

            <ScrollView style={{ maxHeight: 220, marginBottom: 8 }} nestedScrollEnabled>
              {EXERCISE_CATEGORIES.map((cat) => (
                <View key={cat.category}>
                  <TouchableOpacity
                    style={[styles.exCatHead, expandedExerciseCategory === cat.category && styles.exCatHeadActive]}
                    onPress={() => setExpandedExerciseCategory(expandedExerciseCategory === cat.category ? null : cat.category)}
                  >
                    <Text style={styles.exCatTitle}>{cat.emoji} {cat.category}</Text>
                    <Text style={{ fontSize: 10, color: Colors.text.light }}>{expandedExerciseCategory === cat.category ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {expandedExerciseCategory === cat.category && (
                    <View style={styles.exCatBody}>
                      {cat.exercises.map((ex) => (
                        <TouchableOpacity key={ex.name}
                          style={[styles.exChip, exerciseName === ex.name && styles.exChipActive]}
                          onPress={() => {
                            setExerciseName(ex.name);
                            const dur = parseInt(exerciseDuration) || 30;
                            setExerciseCalories(String(Math.round(ex.calPer30 * dur / 30)));
                          }}>
                          <Text style={[styles.exChipTxt, exerciseName === ex.name && styles.exChipTxtActive]}>{ex.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TextInput style={styles.input} placeholder="Egzersiz adı" placeholderTextColor={Colors.text.light}
              value={exerciseName} onChangeText={setExerciseName} />
            <TextInput style={styles.input} placeholder="Süre (dakika)" placeholderTextColor={Colors.text.light}
              keyboardType="numeric" value={exerciseDuration}
              onChangeText={(v) => {
                setExerciseDuration(v);
                const found = ALL_EXERCISES.find(e => e.name === exerciseName);
                if (found) { const dur = parseInt(v) || 30; setExerciseCalories(String(Math.round(found.calPer30 * dur / 30))); }
              }} />
            <TextInput style={[styles.input, { backgroundColor: Colors.neutral[100], color: Colors.text.secondary }]}
              placeholder="Yakılan kalori (kcal)" placeholderTextColor={Colors.text.light}
              keyboardType="numeric" value={exerciseCalories} editable={false} />
            {!exerciseCalories && (
              <Text style={{ fontSize: 11, color: Colors.text.light, marginTop: -4, marginBottom: 8, paddingHorizontal: 4 }}>
                Egzersiz türü ve süre seçin, kalori otomatik hesaplanır
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowExerciseModal(false)}>
                <Text style={styles.modalCancelTxt}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddExercise}>
                <Text style={styles.modalConfirmTxt}>Ekle</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  summaryBar: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, justifyContent: 'space-between', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  summaryLbl: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  summaryDiv: { width: 1, height: 32, backgroundColor: Colors.border },
  progressBg: { height: 6, backgroundColor: Colors.neutral[200], marginHorizontal: Spacing.lg, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  // Meal sections
  mealSection: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mealTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  mealCal: { fontSize: FontSize.xs, color: Colors.text.secondary, fontWeight: '500' },
  mealActions: { flexDirection: 'row', gap: 8 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md },
  addBtnTxt: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  addBtnSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
  emptyTxt: { color: Colors.text.light, fontSize: FontSize.sm, fontStyle: 'italic', paddingVertical: Spacing.sm },
  mealItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral[100], backgroundColor: Colors.surface },
  mealItemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, textTransform: 'capitalize' },
  mealItemDetail: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 1 },
  mealItemCal: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.primary[700] },
  swipeDel: { backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 80, paddingHorizontal: 8 },
  swipeDelTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.text.light, marginTop: Spacing.xl, marginBottom: Spacing.xl },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing.lg, textAlign: 'center' },
  input: { backgroundColor: Colors.neutral[50], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: FontSize.base, color: Colors.text.primary, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  modalActions: { flexDirection: 'row', marginTop: Spacing.md, gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelTxt: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.base },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary[500], alignItems: 'center' },
  modalConfirmTxt: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },
  // Food suggestions
  suggestBox: { maxHeight: 160, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary[200] },
  suggestItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  suggestTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  suggestKcal: { fontSize: FontSize.xs, color: Colors.primary[600], fontWeight: '500', marginLeft: 8 },
  // Unit selector
  unitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 8 },
  unitLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '600', marginRight: 4 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.neutral[300], backgroundColor: Colors.surface },
  unitChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  unitChipTxt: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  unitChipTxtActive: { color: Colors.primary[700], fontWeight: '700' },
  unitInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 4 },
  unitInfoTxt: { fontSize: FontSize.xs, color: Colors.text.light, fontStyle: 'italic' },
  // Calorie display
  calDisplay: { backgroundColor: Colors.primary[50], borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary[200], alignItems: 'center' },
  calDisplayLbl: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  calDisplayVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary[700], marginTop: 4 },
  calDisplayHint: { fontSize: FontSize.xs, color: Colors.text.light, marginTop: 2 },
  // Exercise categories
  exCatHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.neutral[50], borderRadius: BorderRadius.lg, marginBottom: 4 },
  exCatHeadActive: { backgroundColor: Colors.primary[50], borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  exCatTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  exCatBody: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: Colors.neutral[50], borderBottomLeftRadius: BorderRadius.lg, borderBottomRightRadius: BorderRadius.lg, marginBottom: 6 },
  exChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.neutral[100] },
  exChipActive: { backgroundColor: Colors.primary[500] },
  exChipTxt: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  exChipTxtActive: { color: '#fff' },
});
