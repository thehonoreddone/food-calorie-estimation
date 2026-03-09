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

const DEFAULT_MEAL_SCHEDULES: MealSchedule[] = [
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

export interface MealReminderTimes {
  breakfast?: string; // "08:00"
  lunch?: string;     // "12:30"
  dinner?: string;    // "19:00"
}

function parseTimeString(value: string | undefined, fallbackHour: number, fallbackMinute: number) {
  if (!value) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return { hour, minute };
}

/**
 * Schedule daily meal reminder notifications
 */
export async function scheduleMealReminders(times?: MealReminderTimes): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    // Cancel existing meal reminders first
    await cancelMealReminders();

    const schedules: MealSchedule[] = DEFAULT_MEAL_SCHEDULES.map((s) => {
      if (s.id === MEAL_REMINDER_IDS.breakfast) {
        const t = parseTimeString(times?.breakfast, s.hour, s.minute);
        return { ...s, hour: t.hour, minute: t.minute };
      }
      if (s.id === MEAL_REMINDER_IDS.lunch) {
        const t = parseTimeString(times?.lunch, s.hour, s.minute);
        return { ...s, hour: t.hour, minute: t.minute };
      }
      if (s.id === MEAL_REMINDER_IDS.dinner) {
        const t = parseTimeString(times?.dinner, s.hour, s.minute);
        return { ...s, hour: t.hour, minute: t.minute };
      }
      return s;
    });

    for (const schedule of schedules) {
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

// ─── Streak Reminder ────────────────────────────────────────────────────────

const STREAK_REMINDER_ID = 'streak-reminder';
const SMART_ADVICE_ID_PREFIX = 'smart-advice-';

/**
 * Her gün 21:00'de kullanıcıya serisi hatırlatılır.
 * Bu bildirim öğün hatırlatıcılarıyla birlikte aktif edilir.
 */
export async function scheduleStreakReminder(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    await cancelStreakReminder();

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: '🔥 Serini Korumaya Devam Et!',
        body: 'Bugün yemek kaydı yapmayı unutma! Serinizi kaybetmek istemezsiniz.',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'meal-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
    console.log('[Notifications] Streak reminder scheduled');
  } catch (e) {
    console.warn('[Notifications] Schedule streak reminder failed:', e);
  }
}

export async function cancelStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
  } catch (e) {
    console.warn('[Notifications] Cancel streak reminder failed:', e);
  }
}

// ─── Smart Advice Notifications ───────────────────────────────────────────────
/**
 * Simple smart advice type for now.
 * Can be extended with more cases (e.g. low_protein_day, no_breakfast, etc.)
 */
export type SmartAdviceType = 'heavy_dinner';

export interface SmartAdvicePayload {
  type: SmartAdviceType;
  calories: number;
}

export async function scheduleSmartAdvice(payload: SmartAdvicePayload): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const id = `${SMART_ADVICE_ID_PREFIX}${payload.type}`;
    // Cancel previous same-type advice if any
    await Notifications.cancelScheduledNotificationAsync(id);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 09:00 next day

    let title = 'Beslenme Koçun Konuşuyor';
    let body = 'Bugün için küçük bir beslenme önerin var.';

    if (payload.type === 'heavy_dinner') {
      title = '🌙 Akşam Biraz Ağır Kaçtı';
      body = `Akşam yemeğin yaklaşık ${payload.calories} kcal idi. Yarın için daha hafif bir kahvaltı planlamaya ne dersin?`;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'meal-reminders' } : {}),
      },
      trigger: tomorrow,
    });
    console.log('[Notifications] Smart advice scheduled:', payload.type);
  } catch (e) {
    console.warn('[Notifications] Schedule smart advice failed:', e);
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
