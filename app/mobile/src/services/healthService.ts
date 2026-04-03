// ─── Health Connect Service ─────────────────────────────────────────────────
// Steps & Sleep tracking via Google Health Connect
// Falls back gracefully when Health Connect is not available
// NOTE: Health Connect requires a native development build — it does NOT work in Expo Go.
// ────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import Constants from 'expo-constants';

let HealthConnect: typeof import('react-native-health-connect') | null = null;

// Check if running in Expo Go (native modules unavailable)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Lazy-load Health Connect (only available on Android native builds, NOT Expo Go)
async function getHC() {
  if (Platform.OS !== 'android') return null;
  if (isExpoGo) return null; // Skip entirely in Expo Go — native modules not linked
  if (HealthConnect) return HealthConnect;
  try {
    HealthConnect = require('react-native-health-connect');
    return HealthConnect;
  } catch {
    return null;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StepsData {
  steps: number;
  date: string; // YYYY-MM-DD
}

export interface SleepData {
  totalMinutes: number;
  hours: number;
  minutes: number;
  date: string; // YYYY-MM-DD
}

// ─── Availability ───────────────────────────────────────────────────────────

export async function isHealthConnectAvailable(): Promise<boolean> {
  const hc = await getHC();
  if (!hc) return false;
  try {
    const status = await hc.getSdkStatus();
    return status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

// ─── Initialize & Request Permissions ───────────────────────────────────────

export async function initHealthConnect(): Promise<boolean> {
  const hc = await getHC();
  if (!hc) return false;
  try {
    await hc.initialize();
    return true;
  } catch (e) {
    console.warn('Health Connect init failed:', e);
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  const hc = await getHC();
  if (!hc) return false;
  try {
    await hc.initialize();
    const granted = await hc.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
    ]);
    return granted.length > 0;
  } catch (e) {
    console.warn('Health Connect permission request failed:', e);
    return false;
  }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

export async function getTodaySteps(): Promise<StepsData> {
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  const fallback: StepsData = { steps: 0, date: dateKey };

  const hc = await getHC();
  if (!hc) return fallback;

  try {
    await hc.initialize();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const result = await hc.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: today.toISOString(),
      },
    });
    const totalSteps = result.records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
    return { steps: totalSteps, date: dateKey };
  } catch (e) {
    console.warn('Failed to read steps:', e);
    return fallback;
  }
}

export async function getStepsForDate(date: string): Promise<StepsData> {
  const fallback: StepsData = { steps: 0, date };
  const hc = await getHC();
  if (!hc) return fallback;

  try {
    await hc.initialize();
    const d = new Date(date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const result = await hc.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: endOfDay.toISOString(),
      },
    });
    const totalSteps = result.records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
    return { steps: totalSteps, date };
  } catch (e) {
    console.warn('Failed to read steps for date:', e);
    return fallback;
  }
}

// ─── Sleep ──────────────────────────────────────────────────────────────────

export async function getLastNightSleep(): Promise<SleepData> {
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  const fallback: SleepData = { totalMinutes: 0, hours: 0, minutes: 0, date: dateKey };

  const hc = await getHC();
  if (!hc) return fallback;

  try {
    await hc.initialize();
    // Look at yesterday 6pm to today 12pm for sleep data
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);
    const noon = new Date(today);
    noon.setHours(12, 0, 0, 0);

    const result = await hc.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: noon.toISOString(),
      },
    });

    let totalMs = 0;
    for (const session of result.records as any[]) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      totalMs += end - start;
    }

    const totalMinutes = Math.round(totalMs / 60000);
    return {
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      date: dateKey,
    };
  } catch (e) {
    console.warn('Failed to read sleep:', e);
    return fallback;
  }
}

export async function getSleepForDate(date: string): Promise<SleepData> {
  const fallback: SleepData = { totalMinutes: 0, hours: 0, minutes: 0, date };
  const hc = await getHC();
  if (!hc) return fallback;

  try {
    await hc.initialize();
    const d = new Date(date);
    const prevDay = new Date(d);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(18, 0, 0, 0);
    const noon = new Date(d);
    noon.setHours(12, 0, 0, 0);

    const result = await hc.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: prevDay.toISOString(),
        endTime: noon.toISOString(),
      },
    });

    let totalMs = 0;
    for (const session of result.records as any[]) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      totalMs += end - start;
    }

    const totalMinutes = Math.round(totalMs / 60000);
    return {
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      date,
    };
  } catch (e) {
    console.warn('Failed to read sleep for date:', e);
    return fallback;
  }
}

// ─── Open Health Connect App ────────────────────────────────────────────────

export async function openHealthConnectSettings(): Promise<void> {
  const hc = await getHC();
  if (!hc) return;
  try {
    await hc.openHealthConnectSettings();
  } catch {
    // Ignore
  }
}
