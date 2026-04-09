import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function ProfileTab() {
  const { profile, logout, calculateDailyCalories, updateProfile } = useUser();
  const { t } = useTranslation();
  const dailyCalories = calculateDailyCalories();
  const userName = profile.name || t('profile.addName');
  const userEmail = profile.email ?? '';

  const displayWeight = profile.weight ?? '-';

  const [showActivityModal, setShowActivityModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'),
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
            <Text style={styles.topBarTitle}>{t('profile.settings')}</Text>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsGearBtn}>
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
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <View style={styles.identityInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.editIcon}>✏️</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            {userEmail ? <Text style={styles.emailText}>{userEmail}</Text> : null}
            <Text style={styles.accountType}>{t('profile.accountTypeFree')}</Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/edit-profile')}>
              <Text style={styles.quickIcon}>🍴</Text>
              <Text style={styles.quickValue}>{dailyCalories} kal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn}>
              <Text style={styles.quickIcon}>🏃</Text>
              <Text style={styles.quickValue}>0 kal</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/weight-tracking')}>
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
          <MenuItem icon="📊" label={t('profile.myGoals')} subtitle={`${profile.weight ?? '-'} kg → ${profile.targetWeight ?? '-'} kg`} onPress={() => router.push('/weight-tracking')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="⭐" label={t('profile.achievements')} onPress={() => router.push('/achievements')} />
        </View>

        {/* Menu Section 2: Activity & Diet */}
        <View style={styles.menuGroup}>
          <MenuItem
            icon="🏋️"
            label={t('profile.activityLevel')}
            subtitle={
              profile.activityLevel === 'sedentary' ? t('profile.sedentary')
              : profile.activityLevel === 'light' ? t('profile.light')
              : profile.activityLevel === 'active' ? t('profile.active')
              : t('profile.moderate')
            }
            onPress={() => setShowActivityModal(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="🥗"
            label={t('profile.dietSuggestion')}
            onPress={() => router.push('/diet-recommendation')}
          />
        </View>

        {/* Menu Section 3 */}
        <View style={styles.menuGroup}>
          <MenuItem icon="⏰" label={t('profile.reminders')} onPress={() => router.push('/notifications')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="🖼️" label={t('profile.photoAlbum')} onPress={() => router.push('/(tabs)/history')} />
        </View>

        {/* Menu Section 4 */}
        <View style={styles.menuGroup}>
          <MenuItem icon="🔒" label={t('profile.contactAndPrivacy')} onPress={() => router.push('/contact-privacy')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="💬" label={t('profile.contactUs')} onPress={() => router.push('/help')} />
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        {/* Inline Activity Level Modal */}
        <Modal visible={showActivityModal} transparent animationType="fade">
          <View style={styles.activityOverlay}>
            <View style={styles.activitySheet}>
              <Text style={styles.activityTitle}>{t('profile.activityLevel')}</Text>
              {([
                { value: 'sedentary', label: t('profile.sedentary'), desc: t('profile.sedentaryDesc'), icon: '🪑' },
                { value: 'light', label: t('profile.light'), desc: t('profile.lightDesc'), icon: '🚶' },
                { value: 'moderate', label: t('profile.moderate'), desc: t('profile.moderateDesc'), icon: '🏃' },
                { value: 'active', label: t('profile.active'), desc: t('profile.activeDesc'), icon: '🏋️' },
              ] as const).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.activityOption,
                    profile.activityLevel === opt.value && styles.activityOptionActive,
                  ]}
                  onPress={() => {
                    updateProfile({ activityLevel: opt.value });
                    setShowActivityModal(false);
                  }}
                >
                  <Text style={styles.activityOptionIcon}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.activityOptionLabel,
                      profile.activityLevel === opt.value && styles.activityOptionLabelActive,
                    ]}>{opt.label}</Text>
                    <Text style={styles.activityOptionDesc}>{opt.desc}</Text>
                  </View>
                  {profile.activityLevel === opt.value && <Text style={styles.activityCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.activityCloseBtn} onPress={() => setShowActivityModal(false)}>
                <Text style={styles.activityCloseText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  // Activity Modal
  activityOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  activitySheet: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#222',
  },
  activityTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#eee',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
    gap: Spacing.md,
  },
  activityOptionActive: {
    backgroundColor: '#0d2818',
    borderColor: '#22c55e',
  },
  activityOptionIcon: {
    fontSize: 22,
    width: 34,
    textAlign: 'center',
  },
  activityOptionLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#eee',
  },
  activityOptionLabelActive: {
    color: '#22c55e',
  },
  activityOptionDesc: {
    fontSize: FontSize.xs,
    color: '#777',
    marginTop: 2,
  },
  activityCheck: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: '700',
  },
  activityCloseBtn: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
  },
  activityCloseText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#aaa',
  },
});
