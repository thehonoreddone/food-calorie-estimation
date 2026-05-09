import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  getMealsForDate,
  getExercisesForDate,
  MealEntry,
} from '../../src/services/firestoreService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReportTab = 'calories' | 'macros' | 'nutrients';

interface DayData {
  label: string;
  dayNum: number;
  calories: number;
  burned: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  meals: MealEntry[];
}

const WEEK_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekRange(weekOffset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday=0
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  if (weekOffset === 0) return { start: monday, end: sunday, label: 'Bu Hafta' };
  if (weekOffset === -1) return { start: monday, end: sunday, label: 'Geçen Hafta' };
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return {
    start: monday,
    end: sunday,
    label: `${monday.getDate()} ${months[monday.getMonth()]} - ${sunday.getDate()} ${months[sunday.getMonth()]}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsTab() {
  const { profile, calculateDailyCalories } = useUser();
  const dailyTarget = calculateDailyCalories();

  const [activeTab, setActiveTab] = useState<ReportTab>('calories');
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<DayData[]>([]);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const loadData = useCallback(async () => {
    if (!profile.uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const days: DayData[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekRange.start);
        d.setDate(d.getDate() + i);
        const dateKey = formatDateKey(d);
        try {
          const [meals, exercises] = await Promise.all([
            getMealsForDate(profile.uid, dateKey),
            getExercisesForDate(profile.uid, dateKey),
          ]);
          days.push({
            label: WEEK_LABELS[i],
            dayNum: d.getDate(),
            calories: meals.reduce((s, m) => s + m.calories, 0),
            burned: exercises.reduce((s, e) => s + e.caloriesBurned, 0),
            protein: meals.reduce((s, m) => s + (m.protein ?? 0), 0),
            carbs: meals.reduce((s, m) => s + (m.carbs ?? 0), 0),
            fat: meals.reduce((s, m) => s + (m.fat ?? 0), 0),
            fiber: meals.reduce((s, m) => s + (m.fiber ?? 0), 0),
            sugar: 0,
            meals,
          });
        } catch {
          days.push({ label: WEEK_LABELS[i], dayNum: d.getDate(), calories: 0, burned: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, meals: [] });
        }
      }
      setWeekData(days);
    } finally {
      setLoading(false);
    }
  }, [profile.uid, weekRange.start]);

  useEffect(() => { loadData(); }, [loadData]);

  // Aggregates
  const totals = useMemo(() => {
    const t = { calories: 0, burned: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
    weekData.forEach(d => {
      t.calories += d.calories;
      t.burned += d.burned;
      t.protein += d.protein;
      t.carbs += d.carbs;
      t.fat += d.fat;
      t.fiber += d.fiber;
    });
    return t;
  }, [weekData]);

  const weeklyTarget = dailyTarget * 7;
  const maxCalInWeek = Math.max(...weekData.map(d => d.calories), dailyTarget, 1);

  // Macro percentages
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat || 1;
  const macroPcts = {
    protein: Math.round((totals.protein / totalMacroGrams) * 100),
    carbs: Math.round((totals.carbs / totalMacroGrams) * 100),
    fat: Math.round((totals.fat / totalMacroGrams) * 100),
  };

  // Meal breakdown for calories
  const mealBreakdown = useMemo(() => {
    const breakdown = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    weekData.forEach(d => {
      d.meals.forEach(m => {
        if (m.mealType in breakdown) breakdown[m.mealType as keyof typeof breakdown] += m.calories;
      });
    });
    const total = breakdown.breakfast + breakdown.lunch + breakdown.dinner + breakdown.snack || 1;
    return {
      breakfast: { cal: breakdown.breakfast, pct: Math.round((breakdown.breakfast / total) * 100) },
      lunch: { cal: breakdown.lunch, pct: Math.round((breakdown.lunch / total) * 100) },
      dinner: { cal: breakdown.dinner, pct: Math.round((breakdown.dinner / total) * 100) },
      snack: { cal: breakdown.snack, pct: Math.round((breakdown.snack / total) * 100) },
    };
  }, [weekData]);

  // Nutrient targets (weekly)
  const nutrientTargets = useMemo(() => {
    const protTarget = Math.round(dailyTarget * 0.25 / 4) * 7; // 25% from protein
    const carbTarget = Math.round(dailyTarget * 0.50 / 4) * 7; // 50% from carbs
    const fatTarget = Math.round(dailyTarget * 0.25 / 9) * 7;  // 25% from fat
    const fiberTarget = 25 * 7; // WHO recommends ~25g/day
    return {
      calories: { total: totals.calories, target: weeklyTarget },
      protein: { total: totals.protein, target: protTarget },
      carbs: { total: totals.carbs, target: carbTarget },
      fat: { total: totals.fat, target: fatTarget },
      fiber: { total: totals.fiber, target: fiberTarget },
    };
  }, [totals, dailyTarget, weeklyTarget]);

  // ─── Tabs ────────────────────────────────────────────────────────────────

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'calories', label: 'KALORİLER' },
    { key: 'macros', label: 'MAKROLAR' },
    { key: 'nutrients', label: 'BESİNLER' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Hedefler</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Text style={{ fontSize: 22 }}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Week selector */}
      <View style={styles.weekSelector}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.weekArrow}>
          <Text style={styles.weekArrowText}>◀</Text>
        </TouchableOpacity>
        <View style={styles.weekLabelContainer}>
          <Text style={styles.weekLabel}>{weekRange.label}</Text>
        </View>
        <TouchableOpacity
          onPress={() => { if (weekOffset < 0) setWeekOffset(w => w + 1); }}
          style={[styles.weekArrow, weekOffset >= 0 && { opacity: 0.3 }]}
          disabled={weekOffset >= 0}
        >
          <Text style={styles.weekArrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'calories' && (
            <CaloriesReport
              weekData={weekData}
              dailyTarget={dailyTarget}
              maxCal={maxCalInWeek}
              totals={totals}
              weeklyTarget={weeklyTarget}
              mealBreakdown={mealBreakdown}
            />
          )}
          {activeTab === 'macros' && (
            <MacrosReport
              weekData={weekData}
              totals={totals}
              macroPcts={macroPcts}
            />
          )}
          {activeTab === 'nutrients' && (
            <NutrientsReport
              nutrientTargets={nutrientTargets}
              weeklyTarget={weeklyTarget}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Calories Report ────────────────────────────────────────────────────────

function CaloriesReport({
  weekData, dailyTarget, maxCal, totals, weeklyTarget, mealBreakdown,
}: {
  weekData: DayData[];
  dailyTarget: number;
  maxCal: number;
  totals: { calories: number; burned: number };
  weeklyTarget: number;
  mealBreakdown: Record<string, { cal: number; pct: number }>;
}) {
  const avg = weekData.length ? Math.round(totals.calories / weekData.length) : 0;

  return (
    <View style={styles.reportContainer}>
      {/* Summary card */}
      <View style={[styles.card, Shadows.sm]}>
        <Text style={styles.cardTitle}>Kaloriler</Text>
        <Text style={styles.bigNumber}>{totals.calories.toLocaleString('tr-TR')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Günlük Ortalama: {avg}</Text>
          <Text style={styles.summaryLabel}>Hedef: {dailyTarget}kcal</Text>
        </View>

        {/* Goal dashed line */}
        <View style={styles.goalLineRow}>
          <View style={styles.goalDash} />
          <Text style={styles.goalLineText}>{dailyTarget}</Text>
        </View>

        {/* Bar chart */}
        <View style={styles.barChartRow}>
          {weekData.map((d, i) => {
            const h = maxCal > 0 ? (d.calories / maxCal) * 120 : 0;
            const overGoal = d.calories > dailyTarget;
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={overGoal ? ['#ef4444', '#f87171'] : [Colors.primary[500], Colors.primary[400]]}
                    style={[styles.barFill, { height: Math.max(h, 2) }]}
                  />
                </View>
                <Text style={styles.barLabel}>{d.label} {d.dayNum}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Meal breakdown */}
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.mealHeaderRow}>
          <Text style={styles.mealHeaderText} />
          <Text style={styles.mealHeaderText} />
          <Text style={styles.mealHeaderCol}>Kal{'\n'}(kcal)</Text>
        </View>

        <MealRow icon="🟧" label="Kahvaltı" pct={mealBreakdown.breakfast.pct} cal={mealBreakdown.breakfast.cal} color="#f59e0b" />
        <MealRow icon="🟦" label="Öğle Yemeği" pct={mealBreakdown.lunch.pct} cal={mealBreakdown.lunch.cal} color="#3b82f6" />
        <MealRow icon="🟧" label="Akşam Yemeği" pct={mealBreakdown.dinner.pct} cal={mealBreakdown.dinner.cal} color="#f97316" />
        <MealRow icon="🟪" label="Aperatifler/Diğer" pct={mealBreakdown.snack.pct} cal={mealBreakdown.snack.cal} color="#8b5cf6" />
      </View>
    </View>
  );
}

function MealRow({ icon, label, pct, cal, color }: { icon: string; label: string; pct: number; cal: number; color: string }) {
  return (
    <View style={styles.mealRow}>
      <View style={[styles.mealDot, { backgroundColor: color }]} />
      <Text style={styles.mealLabel}>{label}</Text>
      <Text style={styles.mealPct}>({pct}%)</Text>
      <Text style={styles.mealCal}>{cal > 0 ? cal.toLocaleString('tr-TR') : '-'}</Text>
    </View>
  );
}

// ─── Macros Report ──────────────────────────────────────────────────────────

function MacrosReport({
  weekData, totals, macroPcts,
}: {
  weekData: DayData[];
  totals: { protein: number; carbs: number; fat: number };
  macroPcts: { protein: number; carbs: number; fat: number };
}) {
  const maxMacro = Math.max(
    ...weekData.map(d => d.protein + d.carbs + d.fat),
    1
  );

  const idealPcts = { carbs: 55, fat: 26, protein: 19 };

  return (
    <View style={styles.reportContainer}>
      {/* Stacked bar chart */}
      <View style={[styles.card, Shadows.sm]}>
        <Text style={styles.cardTitle}>Makrobesinler</Text>

        <View style={styles.barChartRow}>
          {weekData.map((d, i) => {
            const total = d.protein + d.carbs + d.fat || 1;
            const hP = (d.protein / maxMacro) * 120;
            const hC = (d.carbs / maxMacro) * 120;
            const hF = (d.fat / maxMacro) * 120;
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.stackSegment, { height: Math.max(hF, 0), backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.stackSegment, { height: Math.max(hC, 0), backgroundColor: '#3b82f6' }]} />
                  <View style={[styles.stackSegment, { height: Math.max(hP, 0), backgroundColor: '#ef4444' }]} />
                </View>
                <Text style={styles.barLabel}>{d.label} {d.dayNum}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Percentages table */}
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.macroTableHeader}>
          <Text style={styles.macroTableHeaderCell} />
          <Text style={styles.macroTableHeaderCell}>Toplam</Text>
          <Text style={styles.macroTableHeaderCell}>Hedef</Text>
        </View>

        <MacroTableRow color="#3b82f6" label="Karbonhidrat" actual={macroPcts.carbs} target={idealPcts.carbs} grams={totals.carbs} />
        <MacroTableRow color="#f59e0b" label="Yağ" actual={macroPcts.fat} target={idealPcts.fat} grams={totals.fat} />
        <MacroTableRow color="#ef4444" label="Protein" actual={macroPcts.protein} target={idealPcts.protein} grams={totals.protein} />
      </View>

      {/* Eaten foods summary */}
      <View style={[styles.card, Shadows.sm]}>
        <Text style={styles.cardTitle}>Yenen Gıdalar</Text>
        <View style={styles.macroTableHeader}>
          <Text style={[styles.macroTableHeaderCell, { flex: 2 }]}>Yemekler</Text>
          <Text style={styles.macroTableHeaderCell}>Karb{'\n'}(g)</Text>
          <Text style={styles.macroTableHeaderCell}>Yağ{'\n'}(g)</Text>
          <Text style={styles.macroTableHeaderCell}>Prot{'\n'}(g)</Text>
        </View>
        <View style={styles.macroTableRow}>
          <Text style={[styles.macroTableCell, { flex: 2, fontWeight: '700' }]}>Toplam</Text>
          <Text style={styles.macroTableCell}>{totals.carbs > 0 ? totals.carbs : '-'}</Text>
          <Text style={styles.macroTableCell}>{totals.fat > 0 ? totals.fat : '-'}</Text>
          <Text style={styles.macroTableCell}>{totals.protein > 0 ? totals.protein : '-'}</Text>
        </View>
      </View>
    </View>
  );
}

function MacroTableRow({ color, label, actual, target, grams }: { color: string; label: string; actual: number; target: number; grams: number }) {
  return (
    <View style={styles.macroTableRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={[styles.macroColorDot, { backgroundColor: color }]} />
        <Text style={styles.macroRowLabel}>{label}</Text>
      </View>
      <Text style={styles.macroTableCell}>{actual}%</Text>
      <Text style={styles.macroTableCell}>{target}%</Text>
    </View>
  );
}

// ─── Nutrients Report ───────────────────────────────────────────────────────

function NutrientsReport({
  nutrientTargets, weeklyTarget,
}: {
  nutrientTargets: Record<string, { total: number; target: number }>;
  weeklyTarget: number;
}) {
  const nutrients = [
    { key: 'calories', label: 'Kaloriler (kcal)', color: '#22c55e' },
    { key: 'protein', label: 'Protein (g)', color: '#ef4444' },
    { key: 'carbs', label: 'Karbonhidrat (g)', color: '#3b82f6' },
    { key: 'fat', label: 'Yağ (g)', color: '#f59e0b' },
    { key: 'fiber', label: 'Lif (g)', color: '#a855f7' },
  ];

  const extraNutrients = [
    { label: 'Şeker (g)', total: '-', target: '-' },
    { label: 'Doymuş Yağ (g)', total: '-', target: '-' },
    { label: 'Çoklu Doymamış Yağ (g)', total: '-', target: '-' },
    { label: 'Tekli Doymamış Yağ (g)', total: '-', target: '-' },
  ];

  return (
    <View style={styles.reportContainer}>
      <View style={[styles.card, Shadows.sm]}>
        <Text style={styles.cardTitle}>Besinler</Text>
        <View style={styles.nutrientHeader}>
          <Text style={[styles.nutrientHeaderCell, { flex: 2 }]}>Besin</Text>
          <Text style={styles.nutrientHeaderCell}>Topl...</Text>
          <Text style={styles.nutrientHeaderCell}>Hedef</Text>
          <Text style={styles.nutrientHeaderCell}>[+/-]</Text>
        </View>

        {nutrients.map(n => {
          const data = nutrientTargets[n.key];
          const diff = data ? data.total - data.target : 0;
          return (
            <View key={n.key} style={styles.nutrientRow}>
              <Text style={[styles.nutrientLabel, { color: n.color, flex: 2 }]}>{n.label}</Text>
              <Text style={styles.nutrientCell}>
                {data && data.total > 0 ? data.total.toLocaleString('tr-TR') : '-'}
              </Text>
              <Text style={styles.nutrientCell}>
                {data ? data.target.toLocaleString('tr-TR') : '-'}
              </Text>
              <Text style={styles.nutrientCell}>
                {data && data.total > 0 ? (diff >= 0 ? `+${diff}` : `${diff}`) : '-'}
              </Text>
            </View>
          );
        })}

        {extraNutrients.map((n, i) => (
          <View key={i} style={styles.nutrientRow}>
            <Text style={[styles.nutrientLabel, { color: Colors.primary[600], flex: 2 }]}>{n.label}</Text>
            <Text style={styles.nutrientCell}>{n.total}</Text>
            <Text style={styles.nutrientCell}>{n.target}</Text>
            <Text style={styles.nutrientCell}>-</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  topTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: '#fff',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  weekArrow: {
    padding: Spacing.sm,
  },
  weekArrowText: {
    fontSize: 16,
    color: '#aaa',
  },
  weekLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#f5c518',
  },
  tabBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: '#f5c518',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  reportContainer: {
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.md,
  },
  bigNumber: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: '#888',
  },
  goalLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  goalDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#555',
  },
  goalLineText: {
    fontSize: FontSize.xs,
    color: '#888',
    marginLeft: Spacing.sm,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '80%',
    height: 120,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  stackSegment: {
    width: '100%',
  },
  barLabel: {
    fontSize: 9,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
  },

  // Meal breakdown
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    marginBottom: Spacing.sm,
  },
  mealHeaderText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#666',
  },
  mealHeaderCol: {
    width: 60,
    textAlign: 'right',
    fontSize: FontSize.xs,
    color: '#888',
    fontWeight: '600',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  mealDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  mealLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary[400],
    fontWeight: '500',
  },
  mealPct: {
    fontSize: FontSize.sm,
    color: '#888',
    marginRight: Spacing.lg,
  },
  mealCal: {
    width: 50,
    textAlign: 'right',
    fontSize: FontSize.sm,
    color: '#ccc',
    fontWeight: '500',
  },

  // Macro table
  macroTableHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    marginBottom: Spacing.sm,
  },
  macroTableHeaderCell: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#888',
    fontWeight: '600',
    textAlign: 'center',
  },
  macroTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  macroTableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: '#ccc',
  },
  macroColorDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  macroRowLabel: {
    fontSize: FontSize.sm,
    color: Colors.primary[400],
    fontWeight: '500',
  },

  // Nutrients
  nutrientHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    marginBottom: Spacing.sm,
  },
  nutrientHeaderCell: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#888',
    fontWeight: '600',
    textAlign: 'center',
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  nutrientLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  nutrientCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: '#ccc',
  },
});
