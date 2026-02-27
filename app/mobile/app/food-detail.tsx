import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { getFoodByKey, FoodInfo, calculateCalories, calculateWeightGrams } from '../src/constants/foodDatabase';

// ─── Nutrition calculation helpers (per serving) ────────────────────────────

function getNutritionData(food: FoodInfo | undefined, calories: number, weight: number) {
  // If food is in our database, calculate precise values
  if (food) {
    const kcalPer100g = food.kcalPer100g;
    const ratio = weight / 100;

    // Approximate macro ratios based on food category
    let proteinPct = 0.20, carbPct = 0.50, fatPct = 0.30;
    switch (food.category) {
      case 'meal':
        proteinPct = 0.25; carbPct = 0.45; fatPct = 0.30;
        break;
      case 'soup':
        proteinPct = 0.15; carbPct = 0.55; fatPct = 0.30;
        break;
      case 'fruit':
        proteinPct = 0.05; carbPct = 0.85; fatPct = 0.10;
        break;
      case 'vegetable':
        proteinPct = 0.15; carbPct = 0.70; fatPct = 0.15;
        break;
      case 'dessert':
        proteinPct = 0.08; carbPct = 0.55; fatPct = 0.37;
        break;
      case 'drink':
        proteinPct = 0.10; carbPct = 0.80; fatPct = 0.10;
        break;
      case 'snack':
        proteinPct = 0.12; carbPct = 0.50; fatPct = 0.38;
        break;
      case 'bread':
        proteinPct = 0.12; carbPct = 0.60; fatPct = 0.28;
        break;
      case 'salad':
        proteinPct = 0.15; carbPct = 0.55; fatPct = 0.30;
        break;
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

    return {
      energyKj,
      calories,
      fat,
      saturatedFat,
      monoFat,
      polyFat,
      carbs,
      sugar,
      fiber,
      protein,
      sodium,
      cholesterol,
      potassium,
      portionLabel: `${weight}g`,
    };
  }

  // Fallback for unknown foods
  const protein = Math.round((calories * 0.25) / 4 * 100) / 100;
  const carbs = Math.round((calories * 0.45) / 4 * 100) / 100;
  const fat = Math.round((calories * 0.30) / 9 * 100) / 100;

  return {
    energyKj: Math.round(calories * 4.184),
    calories,
    fat,
    saturatedFat: Math.round(fat * 0.35 * 100) / 100,
    monoFat: Math.round(fat * 0.4 * 100) / 100,
    polyFat: Math.round(fat * 0.15 * 100) / 100,
    carbs,
    sugar: Math.round(carbs * 0.3 * 100) / 100,
    fiber: 0,
    protein,
    sodium: Math.round(weight * 1.5) || 100,
    cholesterol: Math.round(weight * 0.5) || 50,
    potassium: Math.round(weight * 1.8) || 150,
    portionLabel: weight > 0 ? `${weight}g` : '-',
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FoodDetailScreen() {
  const params = useLocalSearchParams<{
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
  const calories = parseInt(params.calories ?? '0', 10);
  const weight = parseInt(params.weight ?? '0', 10);
  const quantity = parseFloat(params.quantity ?? '1');
  const unit = params.unit ?? 'gram';

  const food = foodKey ? getFoodByKey(foodKey) : undefined;
  const nutrition = getNutritionData(food, calories, weight);

  const dailyPct = Math.round((calories / 2000) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{foodName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Macro Summary Grid */}
      <View style={styles.macroGrid}>
        <View style={[styles.macroCell, { backgroundColor: '#1a1a2e' }]}>
          <Text style={styles.macroCellLabel}>Kalori</Text>
          <Text style={styles.macroCellValue}>{calories} ({dailyPct}%)</Text>
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
      <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Beslenme Değeri</Text>

          <View style={styles.portionRow}>
            <Text style={styles.portionLabel}>Porsiyon</Text>
            <Text style={styles.portionValue}>
              {quantity} {unit === 'adet' ? 'adet' : unit === 'kase' ? 'kase' : unit === 'ml' ? 'ml' : 'gram'}
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFull, { width: `${Math.min(dailyPct, 100)}%` }]} />
          </View>

          <Text style={styles.perServingLabel}>porsiyon başı</Text>

          <View style={styles.dividerOrange} />

          {/* Energy */}
          <NutritionRow label="Enerji" value={`${nutrition.energyKj} kJ`} bold />
          <NutritionRowSub value={`${calories} kcal`} />

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
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#161616',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
  },
  macroCell: {
    width: '50%',
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#222',
  },
  macroCellLabel: {
    fontSize: FontSize.sm,
    color: '#999',
    marginBottom: 4,
  },
  macroCellValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#fff',
  },
  detailScroll: {
    flex: 1,
  },
  detailCard: {
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  detailTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.lg,
  },
  portionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  portionLabel: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  portionValue: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFull: {
    height: '100%',
    backgroundColor: '#888',
    borderRadius: 4,
  },
  perServingLabel: {
    fontSize: FontSize.sm,
    color: '#999',
    textAlign: 'right',
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  dividerOrange: {
    height: 2,
    backgroundColor: '#d97706',
    marginVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: Spacing.xs,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  nutritionLabel: {
    fontSize: FontSize.base,
    color: '#ccc',
  },
  nutritionValue: {
    fontSize: FontSize.base,
    color: '#fff',
  },
  nutritionBold: {
    fontWeight: '800',
    color: '#fff',
  },
  nutritionSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: Spacing.xl,
  },
  nutritionSubLabel: {
    fontSize: FontSize.sm,
    color: '#999',
  },
  nutritionSubValue: {
    fontSize: FontSize.sm,
    color: '#ccc',
  },
});
