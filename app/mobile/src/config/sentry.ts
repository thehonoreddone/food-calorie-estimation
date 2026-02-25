// ─── Sentry Crash Reporting ──────────────────────────────────────────────────
// Expo + Sentry entegrasyonu
// DSN'yi .env dosyasında EXPO_PUBLIC_SENTRY_DSN olarak tanımlayın
// ────────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('[Sentry] DSN tanımlı değil, crash reporting devre dışı.');
    }
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
