import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  logWeight,
  getWeightEntries,
  WeightEntry,
} from '../src/services/firestoreService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.round(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function WeightTrackingScreen() {
  const { profile, updateProfile } = useUser();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newWeight, setNewWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState(String(profile.targetWeight ?? ''));
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startingWeight = profile.startingWeight ?? profile.weight ?? 0;
  const currentTarget = profile.targetWeight ?? 0;
  const currentWeight = entries.length > 0 ? entries[0].weight : (profile.weight ?? 0);
  const lastWeighDate = entries.length > 0 ? entries[0].date : null;

  const goal = profile.goal ?? 'maintain';
  const weightDiff = currentWeight - startingWeight;
  const remainingToTarget = currentTarget > 0 ? Math.abs(currentWeight - currentTarget) : 0;
  const isLosingWeight = goal === 'lose';
  const isGainingWeight = goal === 'gain';

  const loadEntries = useCallback(async () => {
    if (!profile.uid) return;
    setIsLoading(true);
    try {
      const data = await getWeightEntries(profile.uid, 60);
      setEntries(data);
    } catch (err) {
      console.error('Weight entries load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile.uid]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleAddWeight = async () => {
    const w = parseFloat(newWeight);
    if (!profile.uid || isNaN(w) || w < 20 || w > 300) {
      Alert.alert('Hata', 'Geçerli bir kilo girin (20-300 kg).');
      return;
    }
    setIsSaving(true);
    try {
      await logWeight(profile.uid, w);
      updateProfile({ weight: w });
      setNewWeight('');
      await loadEntries();
    } catch (err) {
      console.error('Weight save error:', err);
      Alert.alert('Hata', 'Kilo kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTarget = () => {
    const t = parseFloat(targetWeight);
    if (isNaN(t) || t < 20 || t > 300) {
      Alert.alert('Hata', 'Geçerli bir hedef kilo girin.');
      return;
    }
    updateProfile({ targetWeight: t });
    setIsEditingTarget(false);
    Alert.alert('Başarılı', 'Hedef kilonuz güncellendi!');
  };

  // Chart data: last 14 entries (reversed for chronological order)
  const chartEntries = [...entries].reverse().slice(-14);
  const chartMin = chartEntries.length > 0 ? Math.min(...chartEntries.map(e => e.weight)) - 2 : 0;
  const chartMax = chartEntries.length > 0 ? Math.max(...chartEntries.map(e => e.weight)) + 2 : 100;
  const chartRange = chartMax - chartMin || 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kilo Takibi</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Weight Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: '#3b82f6' }]}>
            <Text style={styles.summaryIcon}>📏</Text>
            <Text style={styles.summaryLabel}>Başlangıç</Text>
            <Text style={styles.summaryValue}>{startingWeight} kg</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: Colors.primary[500] }]}>
            <Text style={styles.summaryIcon}>⚖️</Text>
            <Text style={styles.summaryLabel}>Şu An</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary[500] }]}>{currentWeight} kg</Text>
            {lastWeighDate && (
              <Text style={styles.summaryDate}>Son: {formatFullDate(lastWeighDate)}</Text>
            )}
          </View>
          <View style={[styles.summaryCard, { borderTopColor: '#f59e0b' }]}>
            <Text style={styles.summaryIcon}>🎯</Text>
            <Text style={styles.summaryLabel}>Hedef</Text>
            {isEditingTarget ? (
              <View style={styles.targetEditRow}>
                <TextInput
                  style={styles.targetInput}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="numeric"
                  maxLength={5}
                  placeholder="kg"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={handleSaveTarget} style={styles.targetSaveBtn}>
                  <Text style={styles.targetSaveBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditingTarget(true)}>
                <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                  {currentTarget > 0 ? `${currentTarget} kg` : 'Ayarla'}
                </Text>
                <Text style={styles.editHint}>düzenle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Progress Card */}
        {currentTarget > 0 && (
          <View style={[styles.progressCard, Shadows.sm]}>
            <Text style={styles.progressTitle}>
              {isLosingWeight ? '🔥 Kilo Verme Durumu' : isGainingWeight ? '💪 Kilo Alma Durumu' : '⚖️ Kilo Koruma Durumu'}
            </Text>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Değişim</Text>
                <Text style={[styles.progressValue, {
                  color: weightDiff < 0 ? '#10b981' : weightDiff > 0 ? '#ef4444' : '#fff'
                }]}>
                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
                </Text>
                <Text style={styles.progressArrow}>
                  {weightDiff < 0 ? '↓' : weightDiff > 0 ? '↑' : '→'}
                </Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Kalan</Text>
                <Text style={[styles.progressValue, { color: '#f59e0b' }]}>
                  {remainingToTarget.toFixed(1)} kg
                </Text>
                <Text style={styles.progressArrow}>🎯</Text>
              </View>
            </View>

            {/* Progress bar */}
            {(() => {
              const totalChange = Math.abs(startingWeight - currentTarget);
              const achieved = totalChange > 0
                ? Math.min(1, Math.abs(currentWeight - startingWeight) / totalChange)
                : 0;
              const isCorrectDirection = isLosingWeight
                ? currentWeight <= startingWeight
                : isGainingWeight
                  ? currentWeight >= startingWeight
                  : true;
              return (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                      width: `${isCorrectDirection ? achieved * 100 : 0}%`,
                      backgroundColor: isCorrectDirection ? Colors.primary[500] : '#ef4444'
                    }]} />
                  </View>
                  <Text style={styles.progressBarText}>
                    {isCorrectDirection ? Math.round(achieved * 100) : 0}% tamamlandı
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Add Weight Entry */}
        <View style={[styles.addCard, Shadows.sm]}>
          <Text style={styles.addTitle}>⚖️ Bugünkü Kilonuz</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder="Ör: 72.5"
              placeholderTextColor="#666"
              maxLength={6}
            />
            <Text style={styles.addUnit}>kg</Text>
            <TouchableOpacity
              style={[styles.addBtn, isSaving && styles.addBtnDisabled]}
              onPress={handleAddWeight}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight Chart */}
        {chartEntries.length >= 2 && (
          <View style={[styles.chartCard, Shadows.sm]}>
            <Text style={styles.chartTitle}>📈 Kilo Grafiği</Text>
            <View style={styles.chartContainer}>
              {/* Y-axis labels */}
              <View style={styles.yAxis}>
                <Text style={styles.yLabel}>{chartMax.toFixed(0)}</Text>
                <Text style={styles.yLabel}>{((chartMax + chartMin) / 2).toFixed(0)}</Text>
                <Text style={styles.yLabel}>{chartMin.toFixed(0)}</Text>
              </View>

              {/* Chart area */}
              <View style={styles.chartArea}>
                {/* Target line */}
                {currentTarget > 0 && currentTarget >= chartMin && currentTarget <= chartMax && (
                  <View style={[styles.targetLine, {
                    bottom: ((currentTarget - chartMin) / chartRange) * 140,
                  }]}>
                    <View style={styles.targetLineDash} />
                    <Text style={styles.targetLineLabel}>Hedef</Text>
                  </View>
                )}

                {/* Bars */}
                <View style={styles.barsRow}>
                  {chartEntries.map((entry, idx) => {
                    const barHeight = Math.max(4, ((entry.weight - chartMin) / chartRange) * 140);
                    const prevWeight = idx > 0 ? chartEntries[idx - 1].weight : entry.weight;
                    const isUp = entry.weight > prevWeight;
                    const isDown = entry.weight < prevWeight;

                    return (
                      <View key={entry.id ?? idx} style={styles.barColumn}>
                        <Text style={styles.barValue}>{entry.weight}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.bar, {
                            height: barHeight,
                            backgroundColor: isDown
                              ? '#10b981'
                              : isUp
                                ? '#ef4444'
                                : Colors.primary[400],
                          }]} />
                        </View>
                        <Text style={styles.barLabel}>{formatDate(entry.date)}</Text>
                        {idx > 0 && (
                          <Text style={[styles.barArrow, {
                            color: isDown ? '#10b981' : isUp ? '#ef4444' : '#888'
                          }]}>
                            {isDown ? '↓' : isUp ? '↑' : '→'}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Weight History */}
        <View style={[styles.historyCard, Shadows.sm]}>
          <Text style={styles.historyTitle}>📋 Kilo Geçmişi</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ paddingVertical: 20 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>Henüz kilo kaydınız yok. Yukarıdan ilk kaydınızı ekleyin!</Text>
          ) : (
            entries.slice(0, 30).map((entry, idx) => {
              const prev = idx < entries.length - 1 ? entries[idx + 1] : null;
              const diff = prev ? entry.weight - prev.weight : 0;
              return (
                <View key={entry.id ?? idx} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{formatFullDate(entry.date)}</Text>
                    <Text style={styles.historyWeight}>{entry.weight} kg</Text>
                  </View>
                  {prev && (
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyDiff, {
                        color: diff < 0 ? '#10b981' : diff > 0 ? '#ef4444' : '#888'
                      }]}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                      </Text>
                      <Text style={[styles.historyArrow, {
                        color: diff < 0 ? '#10b981' : diff > 0 ? '#ef4444' : '#888'
                      }]}>
                        {diff < 0 ? '▼' : diff > 0 ? '▲' : '•'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['4xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.base, color: '#aaa', fontWeight: '500' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff' },

  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 3,
    gap: 4,
  },
  summaryIcon: { fontSize: 24 },
  summaryLabel: { fontSize: FontSize.xs, color: '#888' },
  summaryValue: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff' },
  summaryDate: { fontSize: 9, color: '#666', textAlign: 'center', marginTop: 2 },
  editHint: { fontSize: 9, color: '#666', textAlign: 'center' },
  targetEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  targetInput: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 50,
    textAlign: 'center',
  },
  targetSaveBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  progressCard: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  progressTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.md },
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  progressItem: { alignItems: 'center', gap: 4 },
  progressLabel: { fontSize: FontSize.xs, color: '#888' },
  progressValue: { fontSize: FontSize.xl, fontWeight: '800' },
  progressArrow: { fontSize: 20 },
  progressDivider: { width: 1, backgroundColor: '#333', height: '100%' },
  progressBarContainer: { marginTop: Spacing.xs },
  progressBarBg: { height: 10, backgroundColor: '#333', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressBarText: { fontSize: FontSize.xs, color: '#888', textAlign: 'center', marginTop: 6 },

  addCard: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  addTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.md },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#333',
  },
  addUnit: { fontSize: FontSize.base, color: '#888', fontWeight: '600' },
  addBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },

  chartCard: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  chartTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.lg },
  chartContainer: { flexDirection: 'row' },
  yAxis: { width: 35, justifyContent: 'space-between', paddingBottom: 30 },
  yLabel: { fontSize: 10, color: '#666', textAlign: 'right' },
  chartArea: { flex: 1, position: 'relative' },
  targetLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  targetLineDash: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#f59e0b' },
  targetLineLabel: { fontSize: 9, color: '#f59e0b', marginLeft: 4 },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingBottom: 20 },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 8, color: '#888', marginBottom: 2 },
  barTrack: { width: 12, justifyContent: 'flex-end', height: 140 },
  bar: { width: 12, borderRadius: 6 },
  barLabel: { fontSize: 7, color: '#666', marginTop: 4, textAlign: 'center' },
  barArrow: { fontSize: 10, marginTop: 1 },

  historyCard: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  historyTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.md },
  emptyText: { color: '#666', fontSize: FontSize.sm, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.xl },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  historyLeft: { gap: 2 },
  historyDate: { fontSize: FontSize.xs, color: '#888' },
  historyWeight: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyDiff: { fontSize: FontSize.sm, fontWeight: '700' },
  historyArrow: { fontSize: 16 },
});
