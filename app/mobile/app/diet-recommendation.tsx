import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  generateDailyPlan,
  generateWeeklySummary,
  DailyMealPlan,
  WeeklySummary,
  MealRecommendation,
} from '../src/services/dietRecommendationService';
import { getMealsForDate, getExercisesForDate } from '../src/services/firestoreService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DietRecommendationScreen() {
  const { profile, calculateDailyCalories } = useUser();
  const [activeTab, setActiveTab] = useState<'plan' | 'weekly'>('plan');
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [chartData, setChartData] = useState<{ label: string; calories: number; burned: number; protein: number; carbs: number; fat: number }[]>([]);

  const dailyTarget = calculateDailyCalories();

  // Generate meal plan
  const mealPlan = useMemo<DailyMealPlan>(() => {
    return generateDailyPlan({
      dailyCalorieTarget: dailyTarget,
      goal: profile.goal ?? 'maintain',
      diet: (profile.dietPreferences?.[0]) ?? 'standard',
    });
  }, [dailyTarget, profile.goal, profile.dietPreferences]);

  // Regenerate plan
  const [planKey, setPlanKey] = useState(0);
  const currentPlan = useMemo<DailyMealPlan>(() => {
    return generateDailyPlan({
      dailyCalorieTarget: dailyTarget,
      goal: profile.goal ?? 'maintain',
      diet: (profile.dietPreferences?.[0]) ?? 'standard',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyTarget, profile.goal, profile.dietPreferences, planKey]);

  // Load weekly data
  const loadWeeklyData = useCallback(async () => {
    if (!profile.uid) return;
    setIsLoadingWeekly(true);
    try {
      const today = new Date();
      const dailyData: { calories: number; burned: number; protein: number; carbs: number; fat: number }[] = [];
      const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      const newChartData: typeof chartData = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = formatDateKey(d);
        const label = dayLabels[d.getDay()];

        try {
          const [meals, exercises] = await Promise.all([
            getMealsForDate(profile.uid, dateKey),
            getExercisesForDate(profile.uid, dateKey),
          ]);

          const dayCalories = meals.reduce((s, m) => s + m.calories, 0);
          const dayBurned = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
          const dayProtein = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
          const dayCarbs = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
          const dayFat = meals.reduce((s, m) => s + (m.fat ?? 0), 0);

          newChartData.push({ label, calories: dayCalories, burned: dayBurned, protein: dayProtein, carbs: dayCarbs, fat: dayFat });
          if (dayCalories > 0) {
            dailyData.push({ calories: dayCalories, burned: dayBurned, protein: dayProtein, carbs: dayCarbs, fat: dayFat });
          }
        } catch {
          newChartData.push({ label, calories: 0, burned: 0, protein: 0, carbs: 0, fat: 0 });
        }
      }

      setChartData(newChartData);
      const summary = generateWeeklySummary({
        dailyData,
        calorieGoal: dailyTarget,
        goal: profile.goal ?? 'maintain',
      });
      setWeeklySummary(summary);
    } catch (err) {
      console.warn('Weekly data load error:', err);
    } finally {
      setIsLoadingWeekly(false);
    }
  }, [profile.uid, dailyTarget, profile.goal]);

  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyData();
    }
  }, [activeTab, loadWeeklyData]);

  // ─── Render helper: meal card ─────────────────────────────────────
  const renderMealCard = (title: string, icon: string, color: string, meals: MealRecommendation[]) => (
    <View style={[styles.mealCard, Shadows.sm]} key={title}>
      <View style={[styles.mealCardHeader, { borderLeftColor: color }]}>
        <Text style={styles.mealCardIcon}>{icon}</Text>
        <Text style={styles.mealCardTitle}>{title}</Text>
        <Text style={styles.mealCardCal}>
          {meals.reduce((s, m) => s + m.calories, 0)} kcal
        </Text>
      </View>
      {meals.map((meal, idx) => (
        <View key={idx} style={styles.mealRow}>
          <Text style={styles.mealEmoji}>{meal.emoji}</Text>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealDetail}>
              {meal.portion} • P: {meal.protein}g • K: {meal.carbs}g • Y: {meal.fat}g
            </Text>
          </View>
          <Text style={styles.mealCal}>{meal.calories}</Text>
        </View>
      ))}
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Diyet & Analiz</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'plan' && styles.tabActive]}
            onPress={() => setActiveTab('plan')}
          >
            <Text style={[styles.tabText, activeTab === 'plan' && styles.tabTextActive]}>
              🍽️ Günlük Plan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
              📊 Haftalık Rapor
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'plan' ? (
          <>
            {/* Daily target info */}
            <View style={[styles.targetCard, Shadows.sm]}>
              <Text style={styles.targetLabel}>Günlük Kalori Hedefi</Text>
              <Text style={styles.targetValue}>{dailyTarget} kcal</Text>
              <Text style={styles.targetSub}>
                {profile.goal === 'lose' ? '🔥 Kilo verme planı' :
                  profile.goal === 'gain' ? '💪 Kilo alma planı' : '⚖️ Kilo koruma planı'}
              </Text>
            </View>

            {/* Meal Cards */}
            {renderMealCard('Kahvaltı', '🌅', '#f59e0b', currentPlan.breakfast)}
            {renderMealCard('Öğle Yemeği', '☀️', '#f97316', currentPlan.lunch)}
            {renderMealCard('Akşam Yemeği', '🌆', '#8b5cf6', currentPlan.dinner)}
            {renderMealCard('Atıştırmalık', '🍿', '#06b6d4', currentPlan.snack)}

            {/* Totals */}
            <View style={[styles.totalsCard, Shadows.sm]}>
              <Text style={styles.totalsTitle}>Günlük Toplam</Text>
              <View style={styles.totalsRow}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{currentPlan.totalCalories}</Text>
                  <Text style={styles.totalLabel}>kcal</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{currentPlan.totalProtein}g</Text>
                  <Text style={styles.totalLabel}>Protein</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{currentPlan.totalCarbs}g</Text>
                  <Text style={styles.totalLabel}>Karbonhidrat</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{currentPlan.totalFat}g</Text>
                  <Text style={styles.totalLabel}>Yağ</Text>
                </View>
              </View>
            </View>

            {/* Regenerate button */}
            <TouchableOpacity
              style={styles.regenerateBtn}
              onPress={() => setPlanKey(k => k + 1)}
            >
              <Text style={styles.regenerateBtnText}>🔄 Yeni Plan Oluştur</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              * Bu öneriler genel bilgi amaçlıdır. Kişisel beslenme planı için bir diyetisyene danışın.
            </Text>
          </>
        ) : (
          <>
            {/* Weekly Report */}
            {isLoadingWeekly ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary[500]} />
                <Text style={styles.loadingText}>Haftalık veriler yükleniyor...</Text>
              </View>
            ) : weeklySummary ? (
              <>
                {/* Summary Card */}
                <View style={[styles.summaryCard, Shadows.sm]}>
                  <Text style={styles.summaryTitle}>Son 7 Gün Özeti</Text>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryIcon}>📅</Text>
                      <Text style={styles.summaryValue}>{weeklySummary.daysTracked}</Text>
                      <Text style={styles.summaryLabel}>Gün Kayıt</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryIcon}>🔥</Text>
                      <Text style={styles.summaryValue}>{weeklySummary.avgCalories}</Text>
                      <Text style={styles.summaryLabel}>Ort. Kalori</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryIcon}>🎯</Text>
                      <Text style={styles.summaryValue}>{weeklySummary.goalAchievedDays}/{weeklySummary.daysTracked}</Text>
                      <Text style={styles.summaryLabel}>Hedefe Ulaşılan</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryIcon}>🏃</Text>
                      <Text style={styles.summaryValue}>{weeklySummary.totalBurned}</Text>
                      <Text style={styles.summaryLabel}>Toplam Yakılan</Text>
                    </View>
                  </View>
                </View>

                {/* Calorie Bar Chart */}
                {chartData.length > 0 && (
                  <View style={[styles.chartCard, Shadows.sm]}>
                    <Text style={styles.chartTitle}>📊 Günlük Kalori Grafiği</Text>
                    <View style={styles.chartContainer}>
                      {/* Goal line label */}
                      <View style={styles.goalLineRow}>
                        <View style={styles.goalLine} />
                        <Text style={styles.goalLineLabel}>Hedef: {dailyTarget} kcal</Text>
                      </View>
                      <View style={styles.barsRow}>
                        {chartData.map((d, idx) => {
                          const maxVal = Math.max(dailyTarget * 1.3, ...chartData.map(c => c.calories));
                          const barHeight = maxVal > 0 ? (d.calories / maxVal) * 140 : 0;
                          const goalHeight = maxVal > 0 ? (dailyTarget / maxVal) * 140 : 0;
                          const isOverGoal = d.calories > dailyTarget;
                          const isToday = idx === chartData.length - 1;
                          return (
                            <View key={idx} style={styles.barColumn}>
                              <Text style={styles.barValue}>
                                {d.calories > 0 ? d.calories : ''}
                              </Text>
                              <View style={styles.barTrack}>
                                {/* Goal indicator */}
                                <View style={[styles.goalIndicator, { bottom: goalHeight }]} />
                                {/* Bar */}
                                <View
                                  style={[
                                    styles.bar,
                                    {
                                      height: Math.max(barHeight, d.calories > 0 ? 4 : 0),
                                      backgroundColor: d.calories === 0
                                        ? Colors.neutral[200]
                                        : isOverGoal
                                          ? '#ef4444'
                                          : isToday
                                            ? Colors.primary[500]
                                            : Colors.primary[400],
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                                {d.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}

                {/* Macro Distribution Chart */}
                <View style={[styles.chartCard, Shadows.sm]}>
                  <Text style={styles.chartTitle}>🥗 Makro Besin Dağılımı</Text>
                  <View style={styles.macroBarContainer}>
                    {[
                      { label: 'Protein', value: weeklySummary.avgProtein, color: '#ef4444', icon: '🥩' },
                      { label: 'Karbonhidrat', value: weeklySummary.avgCarbs, color: '#f59e0b', icon: '🍞' },
                      { label: 'Yağ', value: weeklySummary.avgFat, color: '#3b82f6', icon: '🧈' },
                    ].map((macro, idx) => {
                      const total = weeklySummary.avgProtein + weeklySummary.avgCarbs + weeklySummary.avgFat;
                      const pct = total > 0 ? Math.round((macro.value / total) * 100) : 0;
                      return (
                        <View key={idx} style={styles.macroBarRow}>
                          <View style={styles.macroBarInfo}>
                            <Text style={styles.macroBarEmoji}>{macro.icon}</Text>
                            <Text style={styles.macroBarLabel}>{macro.label}</Text>
                            <Text style={[styles.macroBarPct, { color: macro.color }]}>{pct}%</Text>
                          </View>
                          <View style={styles.macroBarTrack}>
                            <View
                              style={[
                                styles.macroBarFill,
                                { width: `${pct}%`, backgroundColor: macro.color },
                              ]}
                            />
                          </View>
                          <Text style={styles.macroBarGrams}>{macro.value}g</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Trend */}
                <View style={[styles.trendCard, Shadows.sm, {
                  borderColor: weeklySummary.trend === 'on_track' ? '#10b981' :
                    weeklySummary.trend === 'under' ? '#f59e0b' : '#ef4444',
                }]}>
                  <Text style={styles.trendIcon}>
                    {weeklySummary.trend === 'on_track' ? '✅' :
                      weeklySummary.trend === 'under' ? '⚠️' : '🔴'}
                  </Text>
                  <Text style={styles.trendText}>
                    {weeklySummary.trend === 'on_track' ? 'Hedeflerinize uygun gidiyorsunuz!' :
                      weeklySummary.trend === 'under' ? 'Kalori alımınız hedefin altında.' :
                        'Kalori alımınız hedefin üzerinde.'}
                  </Text>
                </View>

                {/* Burned vs Consumed Chart */}
                {chartData.some(d => d.burned > 0) && (
                  <View style={[styles.chartCard, Shadows.sm]}>
                    <Text style={styles.chartTitle}>🏃 Yakılan vs Alınan</Text>
                    <View style={styles.barsRow}>
                      {chartData.map((d, idx) => {
                        const maxVal = Math.max(...chartData.map(c => Math.max(c.calories, c.burned)), 1);
                        const calH = (d.calories / maxVal) * 100;
                        const burnH = (d.burned / maxVal) * 100;
                        return (
                          <View key={idx} style={styles.barColumn}>
                            <View style={[styles.barTrack, { height: 110 }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                                <View style={[styles.miniBar, { height: calH, backgroundColor: Colors.primary[400] }]} />
                                <View style={[styles.miniBar, { height: burnH, backgroundColor: '#f59e0b' }]} />
                              </View>
                            </View>
                            <Text style={styles.barLabel}>{d.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.primary[400] }]} />
                        <Text style={styles.legendText}>Alınan</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.legendText}>Yakılan</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Tips */}
                <View style={[styles.tipsCard, Shadows.sm]}>
                  <Text style={styles.tipsTitle}>💡 Öneriler</Text>
                  {weeklySummary.tips.map((tip, idx) => (
                    <View key={idx} style={styles.tipRow}>
                      <Text style={styles.tipBullet}>•</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>Henüz Veri Yok</Text>
                <Text style={styles.emptyDesc}>
                  Yemek ve egzersiz kayıtlarınız oldukça haftalık raporunuz burada görünecek.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['4xl'] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.base, color: Colors.text.secondary, fontWeight: '500' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  tabTextActive: { color: Colors.primary[700] },
  // Target
  targetCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  targetLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  targetValue: { fontSize: 36, fontWeight: '800', color: Colors.primary[700], marginVertical: 4 },
  targetSub: { fontSize: FontSize.sm, color: Colors.primary[600] },
  // Meal cards
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    paddingLeft: Spacing.md,
  },
  mealCardIcon: { fontSize: 20, marginRight: 8 },
  mealCardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  mealCardCal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary[600] },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  mealEmoji: { fontSize: 24, marginRight: 10 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  mealDetail: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  mealCal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  // Totals
  totalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  totalsTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md, textAlign: 'center' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center' },
  totalValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary[700] },
  totalLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  // Regenerate
  regenerateBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  regenerateBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md, fontSize: FontSize.sm },
  // Summary card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.lg, textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryItem: { width: '48%', alignItems: 'center', marginBottom: Spacing.lg },
  summaryIcon: { fontSize: 28 },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  // Trend
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    gap: Spacing.md,
  },
  trendIcon: { fontSize: 28 },
  trendText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  // Macros
  macrosCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  macrosTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md, textAlign: 'center' },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', borderWidth: 2, borderRadius: 12, padding: 12, width: '30%' },
  macroValue: { fontSize: FontSize.lg, fontWeight: '800' },
  macroLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4 },
  // Tips
  tipsCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  tipsTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary[700], marginBottom: Spacing.md },
  tipRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 12 },
  tipBullet: { fontSize: FontSize.base, color: Colors.primary[600], marginRight: 8, fontWeight: '700' },
  tipText: { fontSize: FontSize.sm, color: Colors.text.primary, flex: 1, lineHeight: 20 },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.lg },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl },
  // Chart styles
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chartTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  chartContainer: {
    paddingTop: Spacing.sm,
  },
  goalLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  goalLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ef4444',
    opacity: 0.4,
  },
  goalLineLabel: {
    fontSize: FontSize.xs,
    color: '#ef4444',
    fontWeight: '600',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 4,
    height: 14,
  },
  barTrack: {
    height: 140,
    width: 28,
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  goalIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ef4444',
    opacity: 0.5,
    borderRadius: 1,
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minWidth: 28,
  },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 6,
    fontWeight: '500',
  },
  barLabelToday: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  miniBar: {
    width: 10,
    borderRadius: 4,
    minHeight: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  // Macro bar chart
  macroBarContainer: {
    gap: Spacing.md,
  },
  macroBarRow: {
    gap: Spacing.xs,
  },
  macroBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  macroBarEmoji: {
    fontSize: 16,
  },
  macroBarLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  macroBarPct: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  macroBarTrack: {
    height: 12,
    backgroundColor: Colors.neutral[100],
    borderRadius: 6,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  macroBarGrams: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
