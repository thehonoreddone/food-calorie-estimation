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
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ProfileTab() {
  const { profile, logout, calculateDailyCalories } = useUser();
  const dailyCalories = calculateDailyCalories();
  const userName = profile.name || 'İsim ekle';
  const userEmail = profile.email ?? '';

  const displayWeight = profile.weight ?? '-';

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.topAvatar} />
            ) : (
              <View style={styles.topAvatarPlaceholder}>
                <Text style={{ fontSize: 24 }}>🎃</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topBarRight}>
            <Text style={styles.topBarTitle}>Ayarlar</Text>
            <TouchableOpacity onPress={() => router.push('/edit-profile')} style={styles.settingsGearBtn}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Identity */}
        <View style={styles.identitySection}>
          <TouchableOpacity onPress={() => router.push('/edit-profile')} style={styles.editAvatarArea}>
            <View style={styles.identityAvatar}>
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.identityAvatarImg} />
              ) : (
                <Text style={{ fontSize: 30 }}>👤</Text>
              )}
            </View>
            <Text style={styles.editBtnText}>Düzenle</Text>
          </TouchableOpacity>
          <View style={styles.identityInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.editIcon}>✏️</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            {userEmail ? <Text style={styles.emailText}>{userEmail}</Text> : null}
            <Text style={styles.accountType}>Hesap Türü: Ücretsiz</Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn}>
              <Text style={styles.quickIcon}>🍴</Text>
              <Text style={styles.quickValue}>{dailyCalories} kal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn}>
              <Text style={styles.quickIcon}>🏃</Text>
              <Text style={styles.quickValue}>0 kal</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn}>
              <Text style={styles.quickIcon}>⚖️</Text>
              <Text style={styles.quickValue}>{displayWeight} kg</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/scan')} style={styles.quickBtn}>
              <Text style={styles.quickIcon}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/edit-profile')} style={styles.quickBtn}>
              <Text style={styles.quickIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Section 1 */}
        <View style={styles.menuGroup}>
          <MenuItem icon="📊" label="Benim Kilom" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuItem icon="⭐" label="Başarılarım" onPress={() => {}} />
        </View>

        {/* Menu Section 2: Goal & Activity */}
        <View style={styles.menuGroup}>
          <MenuItem
            icon="🎯"
            label="Hedefim"
            subtitle={profile.goal === 'lose' ? 'Kilo Ver' : profile.goal === 'gain' ? 'Kilo Al' : 'Koru'}
            onPress={() => router.push('/edit-profile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="🏋️"
            label="Aktivite Seviyesi"
            subtitle={
              profile.activityLevel === 'sedentary' ? 'Hareketsiz'
              : profile.activityLevel === 'light' ? 'Az Hareketli'
              : profile.activityLevel === 'active' ? 'Çok Aktif'
              : 'Orta Düzey'
            }
            onPress={() => router.push('/edit-profile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="🥗"
            label="Diyet Önerisi & Rapor"
            onPress={() => router.push('/diet-recommendation')}
          />
        </View>

        {/* Menu Section 3 */}
        <View style={styles.menuGroup}>
          <MenuItem icon="⏰" label="Hatırlatıcılar" onPress={() => router.push('/notifications')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="🖼️" label="Fotoğraf Albümü" onPress={() => router.push('/(tabs)/history')} />
        </View>

        {/* Menu Section 4 */}
        <View style={styles.menuGroup}>
          <MenuItem icon="🔒" label="İletişim ve Gizlilik" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuItem icon="💬" label="Bize Ulaşın" onPress={() => router.push('/help')} />
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, subtitle, onPress }: { icon: string; label: string; subtitle?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuIconBox}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>
      <View style={styles.menuLabelArea}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  scrollContent: {
    paddingBottom: Spacing['5xl'],
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  topAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topBarTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  settingsGearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Identity
  identitySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  editAvatarArea: {
    alignItems: 'center',
    gap: 4,
  },
  identityAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  identityAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  editBtnText: {
    fontSize: FontSize.xs,
    color: Colors.primary[400],
    fontWeight: '600',
  },
  identityInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editIcon: {
    fontSize: 14,
  },
  nameText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  emailText: {
    fontSize: FontSize.sm,
    color: '#aaa',
    marginTop: 2,
  },
  accountType: {
    fontSize: FontSize.xs,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Quick actions
  quickActions: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  quickIcon: {
    fontSize: 18,
  },
  quickValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#ddd',
  },

  // Menu groups
  menuGroup: {
    marginHorizontal: Spacing.xl,
    backgroundColor: '#151515',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabelArea: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#eee',
  },
  menuSubtitle: {
    fontSize: FontSize.xs,
    color: '#777',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 22,
    color: '#555',
    fontWeight: '300',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#1a0a0a',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#3a1515',
    gap: Spacing.sm,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#ef4444',
  },
});
