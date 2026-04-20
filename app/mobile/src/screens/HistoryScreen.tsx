/**
 * History Screen — Premium Redesign
 * ──────────────────────────────────
 * Shows logged meals from Firestore, grouped by date.
 * Supports swipe-to-delete, pull-to-refresh, filter by meal type.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useUser } from '../contexts/UserContext';
import { useTheme, getColors } from '../contexts/ThemeContext';
import { formatFoodWeight, type UnitSystem } from '../utils/unitConversion';
import {
  getRecentMeals,
  deleteMeal,
  MealEntry,
  MealType,
} from '../services/firestoreService';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────────────────────────

const NEON = '#2DD4A0';
const ACCENT = '#A3E635';

const MEAL_META: Record<MealType, { label: string; icon: string; color: string; bg: string }> = {
  breakfast: { label: 'Kahvaltı',      icon: '🌅', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  lunch:     { label: 'Öğle Yemeği',   icon: '☀️',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  dinner:    { label: 'Akşam Yemeği',  icon: '🌆', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  snack:     { label: 'Aperatif',      icon: '🍿', color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
};

const FILTER_OPTIONS: { key: 'all' | MealType; label: string }[] = [
  { key: 'all',       label: 'Tümü'   },
  { key: 'breakfast', label: '🌅 Kahvaltı' },
  { key: 'lunch',     label: '☀️ Öğle'    },
  { key: 'dinner',    label: '🌆 Akşam'   },
  { key: 'snack',     label: '🍿 Atıştır' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateSection(dateStr: string): string {
  const d = new Date(dateStr);
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const months    = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const days      = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  if (dateStr === today) return 'Bugün';
  if (dateStr === yesterday) return 'Dün';
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

interface SectionData {
  title: string;
  date: string;
  totalCal: number;
  data: MealEntry[];
}

// ─── Meal Row ────────────────────────────────────────────────────────────────

function MealRow({
  item,
  unitSystem,
  onDelete,
  index,
}: {
  item: MealEntry;
  unitSystem: UnitSystem;
  onDelete: (id: string) => void;
  index: number;
}) {
  const meta = MEAL_META[item.mealType] ?? MEAL_META.snack;
  const weightDisplay = formatFoodWeight(item.weight ?? 0, unitSystem);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350)}>
      <View style={styles.mealRow}>
        {/* Left: meal type icon */}
        <View style={[styles.mealIconBubble, { backgroundColor: meta.bg }]}>
          <Text style={styles.mealIconText}>{meta.icon}</Text>
        </View>

        {/* Middle: name + macros */}
        <View style={styles.mealInfo}>
          <Text style={styles.mealName} numberOfLines={1}>{item.foodName}</Text>
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Text style={[styles.pillText, { color: '#ef4444' }]}>🔥 {item.calories} kcal</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: 'rgba(45,212,160,0.12)' }]}>
              <Text style={[styles.pillText, { color: NEON }]}>⚖️ {weightDisplay}</Text>
            </View>
            {item.protein > 0 && (
              <View style={[styles.pill, { backgroundColor: 'rgba(59,130,246,0.10)' }]}>
                <Text style={[styles.pillText, { color: '#60a5fa' }]}>P {item.protein}g</Text>
              </View>
            )}
          </View>
          <Text style={styles.mealTypeLabel}>{meta.label}</Text>
        </View>

        {/* Right: delete */}
        <TouchableOpacity
          onPress={() => onDelete(item.id!)}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, totalCal }: { title: string; totalCal: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCalBadge}>
        <Text style={styles.sectionCalText}>🔥 {totalCal} kcal</Text>
      </View>
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🍽️</Text>
      <Text style={styles.emptyTitle}>Henüz kayıt yok</Text>
      <Text style={styles.emptySubtitle}>
        Yemek taradıkça geçmişin burada görünür.{'\n'}Hadi ilk öğününü ekle!
      </Text>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const HistoryScreen: React.FC = () => {
  const { profile } = useUser();
  const { settings } = useTheme();
  const unitSystem: UnitSystem = settings.unitSystem ?? 'metric';

  const [meals, setMeals]       = useState<MealEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState<'all' | MealType>('all');

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadMeals = useCallback(async () => {
    if (!profile.uid) { setLoading(false); return; }
    try {
      const data = await getRecentMeals(profile.uid, 80);
      setMeals(data);
    } catch (err) {
      console.warn('History load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile.uid]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMeals();
  }, [loadMeals]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Kaydı Sil',
      'Bu öğün kaydı silinecek. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(id);
              setMeals(prev => prev.filter(m => m.id !== id));
            } catch (err) {
              Alert.alert('Hata', 'Kayıt silinemedi.');
            }
          },
        },
      ]
    );
  }, []);

  // ── Filter + Group ──────────────────────────────────────────────────────────
  const sections = useMemo((): SectionData[] => {
    const filtered = filter === 'all' ? meals : meals.filter(m => m.mealType === filter);

    const byDate = new Map<string, MealEntry[]>();
    for (const m of filtered) {
      if (!byDate.has(m.date)) byDate.set(m.date, []);
      byDate.get(m.date)!.push(m);
    }

    return Array.from(byDate.entries()).map(([date, items]) => ({
      title: formatDateSection(date),
      date,
      totalCal: items.reduce((s, m) => s + m.calories, 0),
      data: items,
    }));
  }, [meals, filter]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCal  = meals.reduce((s, m) => s + m.calories, 0);
    const totalProt = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
    const avgCal    = meals.length > 0
      ? Math.round(totalCal / new Set(meals.map(m => m.date)).size)
      : 0;
    return { totalCal, totalProt, avgCal, totalMeals: meals.length };
  }, [meals]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#0D1F15', '#111']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📋 Öğün Geçmişi</Text>
        <Text style={styles.headerSub}>{meals.length} kayıt</Text>
      </LinearGradient>

      {/* Stats bar */}
      {meals.length > 0 && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMeals}</Text>
            <Text style={styles.statLabel}>Öğün</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.avgCal}</Text>
            <Text style={styles.statLabel}>Ort. kcal/gün</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalProt}g</Text>
            <Text style={styles.statLabel}>Top. Protein</Text>
          </View>
        </Animated.View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setFilter(opt.key)}
            style={[
              styles.filterChip,
              filter === opt.key && styles.filterChipActive,
            ]}
          >
            <Text style={[
              styles.filterChipText,
              filter === opt.key && styles.filterChipTextActive,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={NEON} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : sections.length === 0 ? (
        <EmptyHistory />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id ?? item.foodName + item.date}
          renderItem={({ item, index }) => (
            <MealRow
              item={item}
              unitSystem={unitSystem}
              onDelete={handleDelete}
              index={index}
            />
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} totalCal={section.totalCal} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={NEON}
              colors={[NEON]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default HistoryScreen;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#F0FDF4',
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#1A1A1A',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: NEON,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 4,
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  filterChipActive: {
    backgroundColor: NEON,
    borderColor: NEON,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.50)',
  },
  filterChipTextActive: {
    color: '#030E08',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: '#F0FDF4',
    letterSpacing: 0.3,
  },
  sectionCalBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.xl,
  },
  sectionCalText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#f87171',
  },

  // Meal row
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#252525',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  mealIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealIconText: {
    fontSize: 22,
  },
  mealInfo: {
    flex: 1,
    gap: 4,
  },
  mealName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#F0FDF4',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mealTypeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 13,
    color: '#f87171',
    fontWeight: '800',
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: FontSize.sm,
  },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#F0FDF4',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
