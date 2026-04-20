import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppLanguage = 'tr' | 'en';
export type AppRegion = 'TR' | 'US' | 'EU';
export type UnitSystem = 'metric' | 'imperial';

export interface AppSettings {
  themeMode: ThemeMode;
  language: AppLanguage;
  region: AppRegion;
  unitSystem: UnitSystem;
}

interface ThemeContextType {
  settings: AppSettings;
  isDark: boolean;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

// ─── Storage Key ────────────────────────────────────────────────────────────

const SETTINGS_KEY = '@nutrino_app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'dark',
  language: 'tr',
  region: 'TR',
  unitSystem: 'metric',
};

// ─── Dark / Light Color Tokens ──────────────────────────────────────────────

export const DarkColors = {
  background: '#0d0d0d',
  surface: '#151515',
  surfaceElevated: '#1a1a1a',
  surfaceBorder: '#222',
  text: '#eee',
  textSecondary: '#aaa',
  textMuted: '#777',
  textDim: '#555',
  accent: '#22c55e',
  accentLight: '#4ade80',
  error: '#ef4444',
  errorBg: '#1a0a0a',
  errorBorder: '#3a1515',
  cardBg: '#151515',
  inputBg: '#1f1f1f',
  statusBar: 'light' as const,
};

export const LightColors = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  surfaceBorder: '#e2e8f0',
  text: '#1a1a2e',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textDim: '#cbd5e1',
  accent: '#16a34a',
  accentLight: '#22c55e',
  error: '#ef4444',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  cardBg: '#FFFFFF',
  inputBg: '#f1f5f9',
  statusBar: 'dark' as const,
};

export type ThemeColors = Omit<typeof DarkColors, 'statusBar'> & { statusBar: 'light' | 'dark' };

// ─── Context ────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn('Failed to load app settings:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const isDark =
    settings.themeMode === 'dark' ||
    (settings.themeMode === 'system' && systemScheme === 'dark');

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(console.error);
      return next;
    });
  }, []);

  if (!loaded) return null; // prevent flash

  return (
    <ThemeContext.Provider value={{ settings, isDark, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

/** Get current color palette based on dark mode flag */
export function getColors(isDark: boolean): ThemeColors {
  return isDark ? DarkColors : LightColors;
}
