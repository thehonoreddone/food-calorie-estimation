import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  getUserAchievements,
  UserAchievements,
  ALL_ACHIEVEMENTS,
  Achievement,
} from '../src/services/firestoreService';

export default function AchievementsScreen() {
  const { profile } = useUser();
  const [achievements, setAchievements] = useState<UserAchievements | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    if (!profile.uid) return;
    setIsLoading(true);
    try {
      const data = await getUserAchievements(profile.uid);
      setAchievements(data);
    } catch (err) {
      console.error('Achievements load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile.uid]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const isUnlocked = (badgeId: string) =>
    achievements?.unlockedBadges?.includes(badgeId) ?? false;

  const mealBadges = ALL_ACHIEVEMENTS.filter(a => a.type === 'meal_streak');
  const loginBadges = ALL_ACHIEVEMENTS.filter(a => a.type === 'login_streak');
  const specialBadges = ALL_ACHIEVEMENTS.filter(a => a.type === 'special');

  const unlockedCount = achievements?.unlockedBadges?.length ?? 0;
  const totalBadges = ALL_ACHIEVEMENTS.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Başarılarım</Text>
          <View style={{ width: 60 }} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Başarılarınız yükleniyor...</Text>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View style={[styles.summaryCard, Shadows.sm]}>
              <Text style={styles.summaryTitle}>🏆 Genel Durum</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>🏅</Text>
                  <Text style={styles.summaryValue}>{unlockedCount}/{totalBadges}</Text>
                  <Text style={styles.summaryLabel}>Rozet</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>🍽️</Text>
                  <Text style={styles.summaryValue}>{achievements?.mealStreakCurrent ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Kayıt Serisi</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>🔥</Text>
                  <Text style={styles.summaryValue}>{achievements?.loginStreakCurrent ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Giriş Serisi</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0}%`,
                  }]} />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((unlockedCount / totalBadges) * 100)}% tamamlandı
                </Text>
              </View>
            </View>

            {/* Streak Stats */}
            <View style={[styles.streakCard, Shadows.sm]}>
              <Text style={styles.sectionTitle}>📊 İstatistikler</Text>
              <View style={styles.statsGrid}>
                <StatItem
                  icon="🍽️"
                  label="Toplam Kayıt Günü"
                  value={String(achievements?.totalMealDays ?? 0)}
                />
                <StatItem
                  icon="🔥"
                  label="En İyi Kayıt Serisi"
                  value={`${achievements?.mealStreakBest ?? 0} gün`}
                />
                <StatItem
                  icon="📱"
                  label="Toplam Giriş Günü"
                  value={String(achievements?.totalLoginDays ?? 0)}
                />
                <StatItem
                  icon="⚡"
                  label="En İyi Giriş Serisi"
                  value={`${achievements?.loginStreakBest ?? 0} gün`}
                />
              </View>
            </View>

            {/* Meal Logging Badges */}
            <Text style={styles.badgeSectionTitle}>🍽️ Yemek Kayıt Rozetleri</Text>
            <View style={styles.badgeGrid}>
              {mealBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={isUnlocked(badge.id)}
                  currentStreak={achievements?.mealStreakCurrent ?? 0}
                />
              ))}
            </View>

            {/* Login Streak Badges */}
            <Text style={styles.badgeSectionTitle}>📱 Giriş Serisi Rozetleri</Text>
            <View style={styles.badgeGrid}>
              {loginBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={isUnlocked(badge.id)}
                  currentStreak={achievements?.loginStreakCurrent ?? 0}
                />
              ))}
            </View>

            {/* Special Badges */}
            <Text style={styles.badgeSectionTitle}>⭐ Özel Rozetler</Text>
            <View style={styles.badgeGrid}>
              {specialBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={isUnlocked(badge.id)}
                  currentStreak={0}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BadgeCard({ badge, unlocked, currentStreak }: { badge: Achievement; unlocked: boolean; currentStreak: number }) {
  const progress = badge.type !== 'special'
    ? Math.min(1, currentStreak / badge.requiredDays)
    : unlocked ? 1 : 0;

  return (
    <View style={[
      styles.badgeCard,
      unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked,
    ]}>
      <Text style={[styles.badgeIcon, !unlocked && styles.badgeIconLocked]}>
        {unlocked ? badge.icon : '🔒'}
      </Text>
      <Text style={[styles.badgeTitle, !unlocked && styles.badgeTitleLocked]}>
        {badge.title}
      </Text>
      <Text style={[styles.badgeDesc, !unlocked && styles.badgeDescLocked]} numberOfLines={2}>
        {badge.description}
      </Text>

      {!unlocked && badge.type !== 'special' && (
        <View style={styles.badgeProgress}>
          <View style={styles.badgeProgressBg}>
            <View style={[styles.badgeProgressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.badgeProgressText}>
            {Math.min(currentStreak, badge.requiredDays)}/{badge.requiredDays}
          </Text>
        </View>
      )}

      {unlocked && (
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>✅ Kazanıldı!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['4xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.base, color: '#aaa', fontWeight: '500' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff' },
  loadingContainer: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  loadingText: { color: '#888', marginTop: Spacing.md },

  summaryCard: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  summaryTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryIcon: { fontSize: 28 },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: FontSize.xs, color: '#888' },
  summaryDivider: { width: 1, backgroundColor: '#333', height: '80%', alignSelf: 'center' },
  progressContainer: { marginTop: Spacing.xs },
  progressBg: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary[500] },
  progressText: { fontSize: FontSize.xs, color: '#888', textAlign: 'center', marginTop: 6 },

  streakCard: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statItem: {
    width: '47%',
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary[400] },
  statLabel: { fontSize: FontSize.xs, color: '#888', textAlign: 'center' },

  badgeSectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  badgeCard: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    minHeight: 140,
    justifyContent: 'center',
  },
  badgeCardUnlocked: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1.5,
    borderColor: '#2d5a2d',
  },
  badgeCardLocked: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
  },
  badgeIcon: { fontSize: 36 },
  badgeIconLocked: { opacity: 0.5 },
  badgeTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff', textAlign: 'center' },
  badgeTitleLocked: { color: '#666' },
  badgeDesc: { fontSize: FontSize.xs, color: '#999', textAlign: 'center', lineHeight: 16 },
  badgeDescLocked: { color: '#555' },
  badgeProgress: { width: '100%', marginTop: 4 },
  badgeProgressBg: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  badgeProgressFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.primary[500] },
  badgeProgressText: { fontSize: 9, color: '#666', textAlign: 'center', marginTop: 2 },
  unlockedBadge: { marginTop: 4 },
  unlockedText: { fontSize: FontSize.xs, color: '#10b981', fontWeight: '700' },
});
