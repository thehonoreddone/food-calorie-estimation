/**
 * Bildirim Servisi
 * expo-notifications kullanarak yerel bildirimler planlar:
 * - Öğün hatırlatıcıları (kahvaltı 08:00, öğle 12:30, akşam 19:00)
 * - Haftalık rapor bildirimi (Pazar 20:00)
 *
 * NOT: Expo Go'da push notifications desteklenmez (SDK 53+).
 * Bu servis yalnızca local notifications kullanır ve Expo Go'da
 * güvenli şekilde çalışır.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Expo Go Detection ─────────────────────────────────────────────────────

const isExpoGo = Constants.appOwnership === 'expo';

// ─── Safe Configuration ─────────────────────────────────────────────────────
// setNotificationHandler'ı try/catch içinde çağır — Expo Go'da sorun çıkmaz

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.log('[Notifications] Handler setup skipped:', e);
}

// ID prefixes for managing scheduled notifications
const MEAL_REMINDER_IDS = {
  breakfast: 'meal-reminder-breakfast',
  lunch: 'meal-reminder-lunch',
  dinner: 'meal-reminder-dinner',
};
const WEEKLY_REPORT_ID = 'weekly-report';

// ─── Permission ─────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Notifications] Permission denied');
      return false;
    }

    // Android-specific: create notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('meal-reminders', {
        name: 'Öğün Hatırlatıcıları',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync('weekly-report', {
        name: 'Haftalık Rapor',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    return true;
  } catch (e) {
    console.warn('[Notifications] Permission error (Expo Go?):', e);
    return false;
  }
}

// ─── Meal Reminders ─────────────────────────────────────────────────────────

interface MealSchedule {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  channelId: string;
}

const MEAL_SCHEDULES: MealSchedule[] = [
  {
    id: MEAL_REMINDER_IDS.breakfast,
    title: '🌅 Kahvaltı Zamanı!',
    body: 'Güne enerjik başla! Kahvaltını kaydetmeyi unutma.',
    hour: 8,
    minute: 0,
    channelId: 'meal-reminders',
  },
  {
    id: MEAL_REMINDER_IDS.lunch,
    title: '☀️ Öğle Yemeği Zamanı!',
    body: 'Öğle yemeğini yedin mi? Hemen kaydedebilirsin.',
    hour: 12,
    minute: 30,
    channelId: 'meal-reminders',
  },
  {
    id: MEAL_REMINDER_IDS.dinner,
    title: '🌙 Akşam Yemeği Zamanı!',
    body: 'Akşam yemeğini kaydet ve günlük hedefini kontrol et.',
    hour: 19,
    minute: 0,
    channelId: 'meal-reminders',
  },
];

/**
 * Schedule daily meal reminder notifications
 */
export async function scheduleMealReminders(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    // Cancel existing meal reminders first
    await cancelMealReminders();

    for (const schedule of MEAL_SCHEDULES) {
      await Notifications.scheduleNotificationAsync({
        identifier: schedule.id,
        content: {
          title: schedule.title,
          body: schedule.body,
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: schedule.channelId } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: schedule.hour,
          minute: schedule.minute,
        },
      });
    }
    console.log('[Notifications] Meal reminders scheduled');
  } catch (e) {
    console.warn('[Notifications] Schedule meal reminders failed:', e);
  }
}

/**
 * Cancel all meal reminder notifications
 */
export async function cancelMealReminders(): Promise<void> {
  try {
    for (const id of Object.values(MEAL_REMINDER_IDS)) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    console.log('[Notifications] Meal reminders cancelled');
  } catch (e) {
    console.warn('[Notifications] Cancel meal reminders failed:', e);
  }
}

// ─── Weekly Report ──────────────────────────────────────────────────────────

/**
 * Schedule weekly report notification (Sunday at 20:00)
 */
export async function scheduleWeeklyReport(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    await cancelWeeklyReport();

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_REPORT_ID,
      content: {
        title: '📊 Haftalık Raporun Hazır!',
        body: 'Bu haftaki beslenme özetini görmek için uygulamayı aç.',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'weekly-report' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday in Expo (1=Sunday, 2=Monday, ...)
        hour: 20,
        minute: 0,
      },
    });
    console.log('[Notifications] Weekly report scheduled');
  } catch (e) {
    console.warn('[Notifications] Schedule weekly report failed:', e);
  }
}

/**
 * Cancel weekly report notification
 */
export async function cancelWeeklyReport(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_REPORT_ID);
    console.log('[Notifications] Weekly report cancelled');
  } catch (e) {
    console.warn('[Notifications] Cancel weekly report failed:', e);
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] All notifications cancelled');
  } catch (e) {
    console.warn('[Notifications] Cancel all failed:', e);
  }
}

/**
 * Get count of currently scheduled notifications (for debugging)
 */
export async function getScheduledCount(): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch (e) {
    return 0;
  }
}
