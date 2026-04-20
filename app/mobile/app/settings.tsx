import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { useTheme, getColors, ThemeMode, AppLanguage, AppRegion, UnitSystem } from '@/contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from '@/i18n';

// Lazy import to avoid expo-notifications push token auto-registration error in Expo Go
const getNotificationService = () => require('@/services/notificationService') as {
  requestNotificationPermission: () => Promise<boolean>;
  scheduleMealReminders: () => Promise<void>;
  cancelMealReminders: () => Promise<void>;
  scheduleWeeklyReport: () => Promise<void>;
  cancelWeeklyReport: () => Promise<void>;
  scheduleStreakReminder: () => Promise<void>;
  cancelStreakReminder: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
};

// ─── Option Data ────────────────────────────────────────────────────────────

// Static language options (these labels are always their native name)
const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { profile, updateProfile, logout, deleteAccount } = useUser();
  const { settings, isDark, updateSettings } = useTheme();
  const C = getColors(isDark);
  const { t } = useTranslation();

  // Dynamic options (translated)
  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: t('settings.lightTheme'), icon: '☀️' },
    { value: 'dark', label: t('settings.darkTheme'), icon: '🌙' },
    { value: 'system', label: t('settings.system'), icon: '📱' },
  ];

  const REGION_OPTIONS: { value: AppRegion; label: string; flag: string }[] = [
    { value: 'TR', label: 'Türkiye', flag: '🇹🇷' },
    { value: 'US', label: 'Amerika', flag: '🇺🇸' },
    { value: 'EU', label: 'Avrupa', flag: '🇪🇺' },
  ];

  const UNIT_OPTIONS: { value: UnitSystem; label: string; icon: string }[] = [
    { value: 'metric',   label: t('settings.metric'),   icon: '⚖️' },
    { value: 'imperial', label: t('settings.imperial'), icon: '🇺🇸' },
  ];

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert(t('common.error'), t('settings.passwordRequired'));
      return;
    }
    setDeleteLoading(true);
    const result = await deleteAccount(deletePassword);
    setDeleteLoading(false);

    if (result.success) {
      setShowDeleteModal(false);
      Alert.alert(t('common.success'), t('settings.accountDeleted'), [
        { text: t('common.done'), onPress: () => router.replace('/auth/login') },
      ]);
    } else {
      Alert.alert(t('common.error'), result.error ?? t('settings.deleteError'));
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccountTitle'),
      t('settings.deleteAccountWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const handleNotificationToggle = async (val: boolean) => {
    const ns = getNotificationService();
    if (val) {
      const granted = await ns.requestNotificationPermission();
      if (!granted) {
        Alert.alert(t('settings.permissionRequired'), t('settings.permissionDesc'));
        return;
      }
      // Enable & schedule sub-toggles that are on
      updateProfile({ notificationsEnabled: true });
      if (profile.mealReminders) {
        await ns.scheduleMealReminders();
        await ns.scheduleStreakReminder();
      }
      if (profile.weeklyReport) {
        await ns.scheduleWeeklyReport();
      }
    } else {
      await ns.cancelAllNotifications();
      updateProfile({ notificationsEnabled: false, mealReminders: false, weeklyReport: false });
    }
  };

  const handleMealRemindersToggle = async (val: boolean) => {
    const ns = getNotificationService();
    updateProfile({ mealReminders: val });
    if (val) {
      await ns.scheduleMealReminders();
      await ns.scheduleStreakReminder();
    } else {
      await ns.cancelMealReminders();
      await ns.cancelStreakReminder();
    }
  };

  const handleWeeklyReportToggle = async (val: boolean) => {
    const ns = getNotificationService();
    updateProfile({ weeklyReport: val });
    if (val) {
      await ns.scheduleWeeklyReport();
    } else {
      await ns.cancelWeeklyReport();
    }
  };

  // ─── Styles (dynamic) ──────────────────────────────────────────────────

  const ds = dynamicStyles(C);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <StatusBar style={C.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ═══ HESAP YÖNETİMİ ═══ */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('settings.accountManagement')}</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.surfaceBorder }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>👤</Text>
              <View>
                <Text style={[styles.cardRowLabel, { color: C.text }]}>{profile.name || t('profile.addName')}</Text>
                <Text style={[styles.cardRowSub, { color: C.textMuted }]}>{profile.email || '-'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/edit-profile')}>
              <Text style={[styles.cardRowAction, { color: C.accent }]}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>📧</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.email')}</Text>
            </View>
            <Text style={[styles.cardRowValue, { color: C.textSecondary }]}>{profile.email || '-'}</Text>
          </View>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>💎</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.accountType')}</Text>
            </View>
            <Text style={[styles.cardRowValue, { color: C.accent }]}>{t('common.free')}</Text>
          </View>
        </View>

        {/* ═══ TERCİHLER ═══ */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('settings.preferences')}</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.surfaceBorder }]}>
          {/* Theme */}
          <Text style={[styles.cardInnerTitle, { color: C.text }]}>{t('settings.theme')}</Text>
          <View style={styles.optionChips}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  settings.themeMode === opt.value && { backgroundColor: C.accent, borderColor: C.accent },
                ]}
                onPress={() => updateSettings({ themeMode: opt.value })}
              >
                <Text style={styles.optionChipIcon}>{opt.icon}</Text>
                <Text style={[
                  styles.optionChipLabel,
                  { color: C.textSecondary },
                  settings.themeMode === opt.value && { color: '#fff', fontWeight: '700' },
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />

          {/* Language */}
          <Text style={[styles.cardInnerTitle, { color: C.text }]}>{t('settings.language')}</Text>
          <View style={styles.optionChips}>
            {LANGUAGE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  settings.language === opt.value && { backgroundColor: C.accent, borderColor: C.accent },
                ]}
                onPress={() => updateSettings({ language: opt.value })}
              >
                <Text style={styles.optionChipIcon}>{opt.flag}</Text>
                <Text style={[
                  styles.optionChipLabel,
                  { color: C.textSecondary },
                  settings.language === opt.value && { color: '#fff', fontWeight: '700' },
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />

          {/* Region */}
          <Text style={[styles.cardInnerTitle, { color: C.text }]}>{t('settings.region')}</Text>
          <View style={styles.optionChips}>
            {REGION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  settings.region === opt.value && { backgroundColor: C.accent, borderColor: C.accent },
                ]}
                onPress={() => updateSettings({ region: opt.value })}
              >
                <Text style={styles.optionChipIcon}>{opt.flag}</Text>
                <Text style={[
                  styles.optionChipLabel,
                  { color: C.textSecondary },
                  settings.region === opt.value && { color: '#fff', fontWeight: '700' },
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />

          {/* Unit System */}
          <Text style={[styles.cardInnerTitle, { color: C.text }]}>{t('settings.unitSystem')}</Text>
          <View style={styles.optionChips}>
            {UNIT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  settings.unitSystem === opt.value && { backgroundColor: C.accent, borderColor: C.accent },
                ]}
                onPress={() => updateSettings({ unitSystem: opt.value })}
              >
                <Text style={styles.optionChipIcon}>{opt.icon}</Text>
                <Text style={[
                  styles.optionChipLabel,
                  { color: C.textSecondary },
                  settings.unitSystem === opt.value && { color: '#fff', fontWeight: '700' },
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ═══ BİLDİRİMLER ═══ */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('settings.notifications')}</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.surfaceBorder }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>🔔</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.notificationsLabel')}</Text>
            </View>
            <Switch
              value={profile.notificationsEnabled ?? false}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: C.surfaceElevated, true: C.accentLight }}
              thumbColor={profile.notificationsEnabled ? '#fff' : C.textDim}
            />
          </View>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <View style={[styles.cardRow, !(profile.notificationsEnabled) && { opacity: 0.4 }]}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>🍽️</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.mealReminders')}</Text>
            </View>
            <Switch
              value={profile.mealReminders ?? false}
              onValueChange={handleMealRemindersToggle}
              trackColor={{ false: C.surfaceElevated, true: C.accentLight }}
              thumbColor={profile.mealReminders ? '#fff' : C.textDim}
              disabled={!profile.notificationsEnabled}
            />
          </View>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <View style={[styles.cardRow, !(profile.notificationsEnabled) && { opacity: 0.4 }]}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>📊</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.weeklyReport')}</Text>
            </View>
            <Switch
              value={profile.weeklyReport ?? false}
              onValueChange={handleWeeklyReportToggle}
              trackColor={{ false: C.surfaceElevated, true: C.accentLight }}
              thumbColor={profile.weeklyReport ? '#fff' : C.textDim}
              disabled={!profile.notificationsEnabled}
            />
          </View>
        </View>

        {/* ═══ HAKKINDA & YASAL ═══ */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('settings.about')}</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.surfaceBorder }]}>
          <TouchableOpacity style={styles.cardRow} onPress={() => router.push('/contact-privacy')}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>🔒</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.contactAndPrivacy')}</Text>
            </View>
            <Text style={[styles.menuArrow, { color: C.textDim }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <TouchableOpacity style={styles.cardRow} onPress={() => router.push('/terms-of-use')}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>📄</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.termsOfService')}</Text>
            </View>
            <Text style={[styles.menuArrow, { color: C.textDim }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <TouchableOpacity style={styles.cardRow} onPress={() => router.push('/help')}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>💬</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.supportAndFeedback')}</Text>
            </View>
            <Text style={[styles.menuArrow, { color: C.textDim }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorder }]} />
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <Text style={styles.cardRowIcon}>📱</Text>
              <Text style={[styles.cardRowLabel, { color: C.text }]}>{t('settings.appVersion')}</Text>
            </View>
            <Text style={[styles.cardRowValue, { color: C.textMuted }]}>1.0.0</Text>
          </View>
        </View>

        {/* ═══ OTURUM & HESAP İŞLEMLERİ ═══ */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('settings.sessionAndAccount')}</Text>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.dangerBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
          onPress={handleLogout}
        >
          <Text style={styles.dangerBtnIcon}>🚪</Text>
          <Text style={[styles.dangerBtnText, { color: '#f59e0b' }]}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={[styles.dangerBtn, { backgroundColor: C.errorBg, borderColor: C.errorBorder }]}
          onPress={confirmDeleteAccount}
        >
          <Text style={styles.dangerBtnIcon}>🗑️</Text>
          <Text style={[styles.dangerBtnText, { color: C.error }]}>{t('settings.deleteAccount')}</Text>
        </TouchableOpacity>

        <Text style={[styles.footerNote, { color: C.textMuted }]}>
          {t('settings.deleteAccountDesc')}
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── Delete Account Modal ──────────────────────────────────────── */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.cardBg, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.modalTitle, { color: C.error }]}>{t('settings.deleteAccountTitle')}</Text>
            <Text style={[styles.modalDesc, { color: C.textSecondary }]}>
              {t('settings.confirmDeleteTitle')}
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.surfaceBorder }]}
              placeholder={t('settings.enterPassword')}
              placeholderTextColor={C.textMuted}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: C.surfaceElevated }]}
                onPress={() => { setShowDeleteModal(false); setDeletePassword(''); }}
              >
                <Text style={[styles.modalCancelText, { color: C.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteBtn, { backgroundColor: C.error }]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading}
              >
                <Text style={styles.modalDeleteText}>
                  {deleteLoading ? t('settings.deleting') : t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dynamicStyles(C: ReturnType<typeof getColors>) {
  return {};
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },

  // Section titles
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Card
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  cardRowIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  cardRowLabel: {
    fontSize: FontSize.base,
    fontWeight: '500',
  },
  cardRowSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  cardRowValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  cardRowAction: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  cardInnerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Option chips
  optionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  optionChipIcon: {
    fontSize: 14,
  },
  optionChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },

  // Menu arrow
  menuArrow: {
    fontSize: 22,
    fontWeight: '300',
  },

  // Danger buttons
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dangerBtnIcon: {
    fontSize: 18,
  },
  dangerBtnText: {
    fontSize: FontSize.base,
    fontWeight: '600',
  },

  // Footer note
  footerNote: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '88%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modalInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: FontSize.base,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
});
