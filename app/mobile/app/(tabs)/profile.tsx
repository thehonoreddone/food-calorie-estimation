import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ProfileTab() {
  const { profile, logout, calculateDailyCalories } = useUser();
  const dailyCalories = calculateDailyCalories();
  const userName = profile.name ?? 'Kullanıcı';

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const goalLabels = {
    lose: '🔥 Kilo Vermek',
    maintain: '⚖️ Kilo Korumak',
    gain: '💪 Kilo Almak',
  };

  const activityLabels = {
    sedentary: 'Hareketsiz',
    light: 'Az Hareketli',
    moderate: 'Orta Düzey',
    active: 'Çok Aktif',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primary[500], Colors.primary[700]]}
          style={styles.header}
        >
          <View style={styles.avatar}>
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <Text style={styles.avatarText}>👤</Text>
            )}
          </View>
          <Text style={styles.headerTitle}>{userName}</Text>
          <Text style={styles.headerCalorie}>{dailyCalories} kcal / gün</Text>
        </LinearGradient>

        {/* Profile Info Cards */}
        <View style={styles.content}>
          {/* Physical Info */}
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.cardTitle}>📊 Fiziksel Bilgiler</Text>
            <View style={styles.infoGrid}>
              <InfoItem label="Yaş" value={profile.age ? `${profile.age}` : '-'} />
              <InfoItem label="Boy" value={profile.height ? `${profile.height} cm` : '-'} />
              <InfoItem label="Kilo" value={profile.weight ? `${profile.weight} kg` : '-'} />
              <InfoItem
                label="Cinsiyet"
                value={
                  profile.gender === 'male'
                    ? 'Erkek'
                    : profile.gender === 'female'
                    ? 'Kadın'
                    : profile.gender === 'other'
                    ? 'Diğer'
                    : '-'
                }
              />
            </View>
          </View>

          {/* Goals */}
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.cardTitle}>🎯 Hedefler</Text>
            <InfoRow
              label="Hedef"
              value={profile.goal ? goalLabels[profile.goal] : '-'}
            />
            <InfoRow
              label="Aktivite"
              value={profile.activityLevel ? activityLabels[profile.activityLevel] : '-'}
            />
            <InfoRow
              label="Diyet"
              value={
                profile.dietPreferences?.length
                  ? profile.dietPreferences.join(', ')
                  : 'Normal'
              }
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              onPress={() => router.push('/edit-profile')}
              style={[styles.actionButton, Shadows.sm]}
            >
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Profili Düzenle</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={[styles.actionButton, Shadows.sm]}
            >
              <Text style={styles.actionIcon}>🔔</Text>
              <Text style={styles.actionText}>Bildirimler</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/help')}
              style={[styles.actionButton, Shadows.sm]}
            >
              <Text style={styles.actionIcon}>❓</Text>
              <Text style={styles.actionText}>Yardım</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.actionButton, styles.logoutButton, Shadows.sm]}
            >
              <Text style={styles.actionIcon}>🚪</Text>
              <Text style={[styles.actionText, { color: Colors.error }]}>
                Çıkış Yap
              </Text>
              <Text style={[styles.actionArrow, { color: Colors.error }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['4xl'],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  headerCalorie: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.xl,
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  infoItem: {
    width: '46%',
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  infoRowLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  infoRowValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  actionsSection: {
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  actionArrow: {
    fontSize: 20,
    color: Colors.text.light,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
});
