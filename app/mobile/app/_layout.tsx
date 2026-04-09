import '../global.css';
import React, { useRef } from 'react';
import { Platform, StatusBar as RNStatusBar, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initSentry } from '@/config/sentry';

// Expo Go'da push notifications desteklenmez (SDK 53+). Local notifications çalışır.
// Bu uyarıyı bastır — development build'de bu mesaj gelmez.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications: Push notifications',
]);

// Sentry'yi uygulama başlatılırken ilklendir
initSentry();

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initializeState } = useUser();
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    initializeState();
  }
  return <>{children}</>;
}

export default function RootLayout() {
  // Ensure status bar is properly handled on Android (edge-to-edge / API 35+)
  if (Platform.OS === 'android') {
    RNStatusBar.setTranslucent(true);
    RNStatusBar.setBackgroundColor('transparent');
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
        <UserProvider>
          <AppInitializer>
          <StatusBar style="dark" translucent />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#FAFAF8' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="diet-recommendation" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="help" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="food-detail" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="day-detail" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="weight-tracking" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="achievements" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="contact-privacy" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="terms-of-use" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          </Stack>
          </AppInitializer>
        </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
