// ─── Secure Token Storage ────────────────────────────────────────────────────
// Auth token'ları expo-secure-store ile güvenli depolar.
// Web'de AsyncStorage'a fallback yapar.
// ────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'authToken';

/**
 * Auth token'ı güvenli depoya kaydet
 */
export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

/**
 * Auth token'ı güvenli depodan oku
 */
export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Auth token'ı güvenli depodan sil
 */
export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
