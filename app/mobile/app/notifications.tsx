import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

// Lazy import to avoid expo-notifications push token auto-registration error in Expo Go
const getNotificationService = () => require('@/services/notificationService') as {
  requestNotificationPermission: () => Promise<boolean>;
  scheduleMealReminders: (times?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  }) => Promise<void>;
  cancelMealReminders: () => Promise<void>;
  scheduleWeeklyReport: () => Promise<void>;
  cancelWeeklyReport: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  getScheduledCount: () => Promise<number>;
};

export default function NotificationsScreen() {
  const { profile, updateProfile } = useUser();
  const ns = getNotificationService();

  const [notifications, setNotifications] = useState(profile.notificationsEnabled ?? true);
  const [mealReminders, setMealReminders] = useState(profile.mealReminders ?? false);
  const [weeklyReport, setWeeklyReport] = useState(profile.weeklyReport ?? false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [breakfastTime, setBreakfastTime] = useState(profile.breakfastReminderTime ?? '08:00');
  const [lunchTime, setLunchTime] = useState(profile.lunchReminderTime ?? '12:30');
  const [dinnerTime, setDinnerTime] = useState(profile.dinnerReminderTime ?? '19:00');

  useEffect(() => {
    ns.getScheduledCount().then(setScheduledCount).catch(() => {});
  }, [notifications, mealReminders, weeklyReport]);

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await ns.requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'İzin Gerekli',
          'Bildirimleri açmak için lütfen uygulama ayarlarından bildirim iznini verin.',
        );
        return;
      }
    } else {
      // Turning off all notifications
      await ns.cancelAllNotifications();
      setMealReminders(false);
      setWeeklyReport(false);
      updateProfile({ mealReminders: false, weeklyReport: false });
    }
    setNotifications(value);
    updateProfile({
      notificationsEnabled: value,
      // İlk kez açılıyorsa mevcut saatleri profile yaz
      breakfastReminderTime: breakfastTime,
      lunchReminderTime: lunchTime,
      dinnerReminderTime: dinnerTime,
    });
    const count = await ns.getScheduledCount();
    setScheduledCount(count);
  };

  const toggleMealReminders = async (value: boolean) => {
    if (value) {
      await ns.scheduleMealReminders({
        breakfast: breakfastTime,
        lunch: lunchTime,
        dinner: dinnerTime,
      });
    } else {
      await ns.cancelMealReminders();
    }
    setMealReminders(value);
    updateProfile({
      mealReminders: value,
      breakfastReminderTime: breakfastTime,
      lunchReminderTime: lunchTime,
      dinnerReminderTime: dinnerTime,
    });
    const count = await ns.getScheduledCount();
    setScheduledCount(count);
  };

  const toggleWeeklyReport = async (value: boolean) => {
    if (value) {
      await ns.scheduleWeeklyReport();
    } else {
      await ns.cancelWeeklyReport();
    }
    setWeeklyReport(value);
    updateProfile({ weeklyReport: value });
    const count = await ns.getScheduledCount();
    setScheduledCount(count);
  };

  const handleTimeChange = async (meal: 'breakfast' | 'lunch' | 'dinner', time: string) => {
    if (meal === 'breakfast') {
      setBreakfastTime(time);
    } else if (meal === 'lunch') {
      setLunchTime(time);
    } else {
      setDinnerTime(time);
    }

    updateProfile({
      breakfastReminderTime: meal === 'breakfast' ? time : breakfastTime,
      lunchReminderTime: meal === 'lunch' ? time : lunchTime,
      dinnerReminderTime: meal === 'dinner' ? time : dinnerTime,
    });

    if (mealReminders) {
      await ns.scheduleMealReminders({
        breakfast: meal === 'breakfast' ? time : breakfastTime,
        lunch: meal === 'lunch' ? time : lunchTime,
        dinner: meal === 'dinner' ? time : dinnerTime,
      });
      const count = await ns.getScheduledCount();
      setScheduledCount(count);
    }
  };

  const openTimePicker = (meal: 'breakfast' | 'lunch' | 'dinner') => {
    const presets =
      meal === 'breakfast'
        ? ['07:30', '08:00', '08:30']
        : meal === 'lunch'
        ? ['12:00', '12:30', '13:00']
        : ['18:30', '19:00', '19:30'];

    const title =
      meal === 'breakfast'
        ? 'Kahvaltı Saati'
        : meal === 'lunch'
        ? 'Öğle Yemeği Saati'
        : 'Akşam Yemeği Saati';

    Alert.alert(
      title,
      'Bir saat seçin',
      [
        ...presets.map((p) => ({
          text: p,
          onPress: () => handleTimeChange(meal, p),
        })),
        { text: 'İptal', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Notification Settings */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>🔔 Bildirim Ayarları</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bildirimler</Text>
              <Text style={styles.settingDesc}>Tüm bildirimleri aç/kapa</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: Colors.neutral[200], true: Colors.primary[300] }}
              thumbColor={notifications ? Colors.primary[600] : Colors.neutral[400]}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Öğün Hatırlatıcı</Text>
              <Text style={styles.settingDesc}>Kahvaltı, öğle, akşam yemeği</Text>
            </View>
            <Switch
              value={mealReminders}
              onValueChange={toggleMealReminders}
              trackColor={{ false: Colors.neutral[200], true: Colors.primary[300] }}
              thumbColor={mealReminders ? Colors.primary[600] : Colors.neutral[400]}
              disabled={!notifications}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haftalık Rapor</Text>
              <Text style={styles.settingDesc}>Haftalık beslenme özeti</Text>
            </View>
            <Switch
              value={weeklyReport}
              onValueChange={toggleWeeklyReport}
              trackColor={{ false: Colors.neutral[200], true: Colors.primary[300] }}
              thumbColor={weeklyReport ? Colors.primary[600] : Colors.neutral[400]}
              disabled={!notifications}
            />
          </View>
        </View>

        {/* Schedule Info */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>⏰ Hatırlatma Saatleri</Text>

          <View style={styles.scheduleRow}>
            <TouchableOpacity style={styles.scheduleItem} onPress={() => openTimePicker('breakfast')}>
              <Text style={styles.scheduleIcon}>🌅</Text>
              <Text style={styles.scheduleLabel}>Kahvaltı</Text>
              <Text style={styles.scheduleTime}>{breakfastTime}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scheduleItem} onPress={() => openTimePicker('lunch')}>
              <Text style={styles.scheduleIcon}>☀️</Text>
              <Text style={styles.scheduleLabel}>Öğle</Text>
              <Text style={styles.scheduleTime}>{lunchTime}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scheduleItem} onPress={() => openTimePicker('dinner')}>
              <Text style={styles.scheduleIcon}>🌙</Text>
              <Text style={styles.scheduleLabel}>Akşam</Text>
              <Text style={styles.scheduleTime}>{dinnerTime}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Bildirim ayarları cihazınızda yerel olarak kaydedilir.
            Sistem ayarlarından da bildirimleri yönetebilirsiniz.
            {scheduledCount > 0
              ? `\n\n📋 ${scheduledCount} aktif bildirim planlanmış.`
              : '\n\nHenüz planlanmış bildirim yok.'
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  settingDesc: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginVertical: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  scheduleItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  scheduleIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  scheduleLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  scheduleTime: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.primary[700],
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#1E40AF',
    lineHeight: 18,
  },
});
