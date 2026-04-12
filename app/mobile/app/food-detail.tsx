import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  getFoodByKey,
  FoodInfo,
  FoodUnit,
  calculateCalories,
  calculateWeightGrams,
  getUnitLabel,
} from '../src/constants/foodDatabase';
import { updateMeal, deleteMeal } from '../src/services/firestoreService';

// ─── Nutrition calculation helpers (per serving) ────────────────────────────

function getNutritionData(food: FoodInfo | undefined, calories: number, weight: number) {
  if (food) {
    let proteinPct = 0.20, carbPct = 0.50, fatPct = 0.30;
    switch (food.category) {
      case 'meal': proteinPct = 0.25; carbPct = 0.45; fatPct = 0.30; break;
      case 'soup': proteinPct = 0.15; carbPct = 0.55; fatPct = 0.30; break;
      case 'fruit': proteinPct = 0.05; carbPct = 0.85; fatPct = 0.10; break;
      case 'vegetable': proteinPct = 0.15; carbPct = 0.70; fatPct = 0.15; break;
      case 'dessert': proteinPct = 0.08; carbPct = 0.55; fatPct = 0.37; break;
      case 'drink': proteinPct = 0.10; carbPct = 0.80; fatPct = 0.10; break;
      case 'snack': proteinPct = 0.12; carbPct = 0.50; fatPct = 0.38; break;
      case 'bread': proteinPct = 0.12; carbPct = 0.60; fatPct = 0.28; break;
      case 'salad': proteinPct = 0.15; carbPct = 0.55; fatPct = 0.30; break;
    }
    const protein = Math.round((calories * proteinPct) / 4 * 100) / 100;
    const carbs = Math.round((calories * carbPct) / 4 * 100) / 100;
    const fat = Math.round((calories * fatPct) / 9 * 100) / 100;
    const fiber = Math.round(weight * 0.02 * 100) / 100;
    const sugar = Math.round(carbs * 0.3 * 100) / 100;
    const saturatedFat = Math.round(fat * 0.35 * 100) / 100;
    const monoFat = Math.round(fat * 0.4 * 100) / 100;
    const polyFat = Math.round(fat * 0.15 * 100) / 100;
    const sodium = Math.round(weight * 1.5);
    const cholesterol = Math.round(weight * (food.category === 'meal' ? 0.7 : 0.2));
    const potassium = Math.round(weight * 1.8);
    const energyKj = Math.round(calories * 4.184);
    return { energyKj, calories, fat, saturatedFat, monoFat, polyFat, carbs, sugar, fiber, protein, sodium, cholesterol, potassium };
  }
  const protein = Math.round((calories * 0.25) / 4 * 100) / 100;
  const carbs = Math.round((calories * 0.45) / 4 * 100) / 100;
  const fat = Math.round((calories * 0.30) / 9 * 100) / 100;
  return {
    energyKj: Math.round(calories * 4.184), calories, fat,
    saturatedFat: Math.round(fat * 0.35 * 100) / 100, monoFat: Math.round(fat * 0.4 * 100) / 100,
    polyFat: Math.round(fat * 0.15 * 100) / 100, carbs, sugar: Math.round(carbs * 0.3 * 100) / 100,
    fiber: 0, protein, sodium: Math.round(weight * 1.5) || 100,
    cholesterol: Math.round(weight * 0.5) || 50, potassium: Math.round(weight * 1.8) || 150,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FoodDetailScreen() {
  const params = useLocalSearchParams<{
    mealId?: string;
    date?: string;
    foodName: string;
    foodKey?: string;
    calories: string;
    weight: string;
    quantity?: string;
    unit?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  }>();

  const foodName = params.foodName ?? 'Yemek';
  const foodKey = params.foodKey;
  const mealId = params.mealId;
  const originalCalories = parseInt(params.calories ?? '0', 10);
  const originalWeight = parseInt(params.weight ?? '0', 10);
  const originalQuantity = parseFloat(params.quantity ?? '1');
  const originalUnit = (params.unit ?? 'gram') as FoodUnit;

  const food = foodKey ? getFoodByKey(foodKey) : undefined;

  // ─── Edit state ─────────────────────────────────────────────────────
  const [editAmount, setEditAmount] = useState(String(originalQuantity));
  const [editUnit, setEditUnit] = useState<FoodUnit>(originalUnit);
  const [saving, setSaving] = useState(false);

  const editCalories = useMemo(() => {
    const amount = parseFloat(editAmount) || 0;
    if (amount <= 0) return 0;
    if (food) return calculateCalories(food, amount, editUnit);
    // Fallback: proportional to original
    if (originalQuantity > 0) return Math.round(originalCalories * (amount / originalQuantity));
    return originalCalories;
  }, [food, editAmount, editUnit, originalCalories, originalQuantity]);

  const editWeight = useMemo(() => {
    const amount = parseFloat(editAmount) || 0;
    if (food) return calculateWeightGrams(food, amount, editUnit);
    if (originalQuantity > 0) return Math.round(originalWeight * (amount / originalQuantity));
    return Math.round(amount);
  }, [food, editAmount, editUnit, originalWeight, originalQuantity]);

  const nutrition = getNutritionData(food, editCalories, editWeight);
  const dailyPct = Math.round((editCalories / 2000) * 100);

  const availableUnits = useMemo(() => {
    if (!food) return [originalUnit];
    const units: FoodUnit[] = [food.unit];
    if (food.altUnits) units.push(...food.altUnits);
    // Ensure no duplicates
    return [...new Set(units)];
  }, [food, originalUnit]);

  // ─── Save handler ───────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!mealId) { router.back(); return; }
    const amount = parseFloat(editAmount) || 0;
    if (amount <= 0) { Alert.alert('Hata', 'Lütfen geçerli bir miktar girin.'); return; }

    setSaving(true);
    try {
      const updates = {
        quantity: amount,
        unit: editUnit,
        calories: editCalories,
        weight: editWeight,
        protein: Math.round(editCalories * 0.25 / 4),
        carbs: Math.round(editCalories * 0.45 / 4),
        fat: Math.round(editCalories * 0.30 / 9),
      };
      await updateMeal(mealId, updates);
      router.back();
    } catch (e) {
      console.error('Update meal error:', e);
      Alert.alert('Hata', 'Güncellenemedi. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }, [mealId, editAmount, editUnit, editCalories, editWeight]);

  // ─── Delete handler ─────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (!mealId) return;
    Alert.alert('Sil', `"${foodName}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await deleteMeal(mealId);
            router.back();
          } catch (e) {
            console.error('Delete meal error:', e);
            Alert.alert('Hata', 'Silinemedi.');
          }
        },
      },
    ]);
  }, [mealId, foodName]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{foodName}</Text>
        {mealId ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={{ fontSize: 18 }}>🗑️</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* ─── Edit Section (like FatSecret) ─────────────────────────── */}
        {mealId && (
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Yiyeceği Düzenle</Text>

            {/* Amount input with +/- buttons */}
            <View style={styles.editAmountRow}>
              <TouchableOpacity
                style={styles.editPmBtn}
                onPress={() => {
                  const cur = parseFloat(editAmount) || 0;
                  const step = editUnit === 'gram' || editUnit === 'ml' ? 10 : 1;
                  setEditAmount(String(Math.max(step, cur - step)));
                }}
              >
                <Text style={styles.editPmBtnText}>−</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.editAmountInput}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                selectTextOnFocus
              />

              <TouchableOpacity
                style={styles.editPmBtn}
                onPress={() => {
                  const cur = parseFloat(editAmount) || 0;
                  const step = editUnit === 'gram' || editUnit === 'ml' ? 10 : 1;
                  setEditAmount(String(cur + step));
                }}
              >
                <Text style={styles.editPmBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Unit selector */}
            <View style={styles.editUnitRow}>
              {availableUnits.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.editUnitChip, editUnit === u && styles.editUnitChipActive]}
                  onPress={() => setEditUnit(u)}
                >
                  <Text style={[styles.editUnitChipText, editUnit === u && styles.editUnitChipTextActive]}>
                    {getUnitLabel(u)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calculated calories preview */}
            <View style={styles.editCalPreview}>
              <Text style={styles.editCalPreviewLabel}>
                {parseFloat(editAmount) || 0} {getUnitLabel(editUnit)} = {editWeight > 0 ? `~${editWeight}g` : ''}
              </Text>
              <Text style={styles.editCalPreviewVal}>{editCalories} kcal</Text>
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.editSaveBtnText}>KAYDET</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Macro Summary Grid */}
        <View style={styles.macroGrid}>
          <View style={[styles.macroCell, { backgroundColor: '#1a1a2e' }]}>
            <Text style={styles.macroCellLabel}>Kalori</Text>
            <Text style={styles.macroCellValue}>{editCalories} ({dailyPct}%)</Text>
          </View>
          <View style={[styles.macroCell, { backgroundColor: '#1a1a2e' }]}>
            <Text style={styles.macroCellLabel}>Yağ</Text>
            <Text style={styles.macroCellValue}>{nutrition.fat.toFixed(2)}g</Text>
          </View>
          <View style={[styles.macroCell, { backgroundColor: '#1a1a2e' }]}>
            <Text style={styles.macroCellLabel}>Karbonhidrat</Text>
            <Text style={styles.macroCellValue}>{nutrition.carbs.toFixed(2)}g</Text>
          </View>
          <View style={[styles.macroCell, { backgroundColor: '#1a1a2e' }]}>
            <Text style={styles.macroCellLabel}>Protein</Text>
            <Text style={styles.macroCellValue}>{nutrition.protein.toFixed(2)}g</Text>
          </View>
        </View>

        {/* Detailed Nutrition */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Beslenme Değeri</Text>

          <View style={styles.portionRow}>
            <Text style={styles.portionLabel}>Porsiyon</Text>
            <Text style={styles.portionValue}>
              {editWeight > 0 ? `${editWeight} gram` : '-'}
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFull, { width: `${Math.min(dailyPct, 100)}%` }]} />
          </View>

          <Text style={styles.perServingLabel}>porsiyon başı</Text>

          <View style={styles.dividerOrange} />

          {/* Energy */}
          <NutritionRow label="Enerji" value={`${nutrition.energyKj} kJ`} bold />
          <NutritionRowSub value={`${editCalories} kcal`} />

          <View style={styles.dividerOrange} />

          {/* Fat */}
          <NutritionRow label="Yağ" value={`${nutrition.fat.toFixed(2)}g`} bold />
          <NutritionRowSub label="Doymuş Yağ" value={`${nutrition.saturatedFat.toFixed(3)}g`} />
          <NutritionRowSub label="Tekli Doymamış Yağ" value={`${nutrition.monoFat.toFixed(3)}g`} />
          <NutritionRowSub label="Çoklu Doymamış Yağ" value={`${nutrition.polyFat.toFixed(3)}g`} />

          <View style={styles.divider} />

          {/* Carbs */}
          <NutritionRow label="Karbonhidratlar" value={`${nutrition.carbs.toFixed(2)}g`} bold />
          <NutritionRowSub label="Şeker" value={`${nutrition.sugar.toFixed(2)}g`} />

          <View style={styles.divider} />

          {/* Fiber */}
          <NutritionRow label="Fiber" value={`${nutrition.fiber.toFixed(0)}g`} />

          <View style={styles.divider} />

          {/* Protein */}
          <NutritionRow label="Protein" value={`${nutrition.protein.toFixed(2)}g`} bold />

          <View style={styles.divider} />

          {/* Minerals */}
          <NutritionRow label="Sodyum" value={`${nutrition.sodium}mg`} />
          <View style={styles.divider} />
          <NutritionRow label="Kolesterol" value={`${nutrition.cholesterol}mg`} />
          <View style={styles.divider} />
          <NutritionRow label="Potasyum" value={`${nutrition.potassium}mg`} />

          <View style={styles.dividerOrange} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Row Components ──────────────────────────────────────────────────────────

function NutritionRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={[styles.nutritionLabel, bold && styles.nutritionBold]}>{label}</Text>
      <Text style={[styles.nutritionValue, bold && styles.nutritionBold]}>{value}</Text>
    </View>
  );
}

function NutritionRowSub({ label, value }: { label?: string; value: string }) {
  return (
    <View style={styles.nutritionSubRow}>
      {label ? <Text style={styles.nutritionSubLabel}>{label}</Text> : <View style={{ flex: 1 }} />}
      <Text style={styles.nutritionSubValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scrollContainer: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: '#161616',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  deleteBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef444420' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },

  // ─── Edit Section ───
  editSection: {
    backgroundColor: '#1a1a2e', margin: Spacing.md, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: '#2a2a4a',
  },
  editSectionTitle: {
    fontSize: FontSize.base, fontWeight: '700', color: '#ccc', marginBottom: Spacing.md,
  },
  editAmountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md,
  },
  editPmBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a2a4a',
    alignItems: 'center', justifyContent: 'center',
  },
  editPmBtnText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  editAmountInput: {
    flex: 1, backgroundColor: '#22c55e', borderRadius: BorderRadius.md,
    fontSize: FontSize.xl, fontWeight: '800', color: '#fff', textAlign: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  editUnitRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md,
  },
  editUnitChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#444', backgroundColor: '#222',
  },
  editUnitChipActive: { borderColor: '#22c55e', backgroundColor: '#22c55e20' },
  editUnitChipText: { fontSize: FontSize.sm, color: '#999', fontWeight: '600' },
  editUnitChipTextActive: { color: '#22c55e', fontWeight: '700' },
  editCalPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#12122a', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  editCalPreviewLabel: { fontSize: FontSize.sm, color: '#888' },
  editCalPreviewVal: { fontSize: FontSize.lg, fontWeight: '800', color: '#22c55e' },
  editSaveBtn: {
    backgroundColor: '#22c55e', borderRadius: BorderRadius.md, paddingVertical: 14,
    alignItems: 'center',
  },
  editSaveBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: '800', letterSpacing: 1 },

  // ─── Macro Grid ───
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 0 },
  macroCell: {
    width: '50%', paddingVertical: Spacing.lg, alignItems: 'center',
    borderWidth: 0.5, borderColor: '#222',
  },
  macroCellLabel: { fontSize: FontSize.sm, color: '#999', marginBottom: 4 },
  macroCellValue: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff' },

  // ─── Detail ───
  detailCard: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  detailTitle: { fontSize: FontSize['2xl'], fontWeight: '800', color: '#fff', marginBottom: Spacing.lg },
  portionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  portionLabel: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  portionValue: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  progressBarContainer: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.sm },
  progressBarFull: { height: '100%', backgroundColor: '#888', borderRadius: 4 },
  perServingLabel: { fontSize: FontSize.sm, color: '#999', textAlign: 'right', fontWeight: '700', marginBottom: Spacing.sm },
  dividerOrange: { height: 2, backgroundColor: '#d97706', marginVertical: Spacing.sm },
  divider: { height: 1, backgroundColor: '#333', marginVertical: Spacing.xs },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  nutritionLabel: { fontSize: FontSize.base, color: '#ccc' },
  nutritionValue: { fontSize: FontSize.base, color: '#fff' },
  nutritionBold: { fontWeight: '800', color: '#fff' },
  nutritionSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingLeft: Spacing.xl },
  nutritionSubLabel: { fontSize: FontSize.sm, color: '#999' },
  nutritionSubValue: { fontSize: FontSize.sm, color: '#ccc' },
});
