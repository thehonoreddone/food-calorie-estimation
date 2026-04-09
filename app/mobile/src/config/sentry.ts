// ─── Sentry Crash Reporting ──────────────────────────────────────────────────
// Expo + Sentry entegrasyonu
// DSN'yi .env dosyasında EXPO_PUBLIC_SENTRY_DSN olarak tanımlayın
// Expo Go ile çalışırken Sentry devre dışı bırakılır (native modül yok)
// ────────────────────────────────────────────────────────────────────────────

let Sentry: typeof import('@sentry/react-native') | null = null;

try {
  Sentry = require('@sentry/react-native');
} catch {
  // Expo Go ortamında native modül yok — sessizce geç
  if (__DEV__) {
    console.log('[Sentry] Native modül bulunamadı (Expo Go?), crash reporting devre dışı.');
  }
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!Sentry) {
    return;
  }
  if (!SENTRY_DSN) {
    // DSN tanımlı değilse Sentry'yi sessizce devre dışı bırak
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    attachScreenshot: true,
    enableNativeFramesTracking: true,
  });
}

export { Sentry };
