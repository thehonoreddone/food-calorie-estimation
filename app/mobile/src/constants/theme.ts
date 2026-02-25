/**
 * Premium Theme Constants
 * Wellness-focused color palette for Nutrino
 */

export const Colors = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  accent: {
    orange: '#FF6B35',
    coral: '#FF8A65',
    amber: '#F59E0B',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  background: '#FAFAF8',
  surface: '#FFFFFF',
  text: {
    primary: '#1a1a2e',
    secondary: '#64748b',
    light: '#94a3b8',
    inverse: '#FFFFFF',
  },
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const GradientPresets = {
  primary: ['#22c55e', '#16a34a'] as const,
  primaryLight: ['#86efac', '#4ade80'] as const,
  warm: ['#FF6B35', '#FF8A65'] as const,
  dark: ['#1a1a2e', '#2d2d44'] as const,
  sunset: ['#f97316', '#ef4444'] as const,
  ocean: ['#06b6d4', '#3b82f6'] as const,
} as const;

export const ONBOARDING_STEPS = [
  'welcome',
  'goal',
  'discovery',
  'gender-age',
  'body-info',
  'target-weight',
  'activity',
  'diet-check',
  'health',
  'daily-time',
  'privacy',
  'signup',
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

/**
 * Onboarding category segments for Foodvisor-style progress bar.
 * Each category groups multiple steps together.
 */
export const ONBOARDING_CATEGORIES = [
  { key: 'goals', label: 'Hedef & Profil', steps: ['goal', 'discovery', 'gender-age'] },
  { key: 'body', label: 'Vücut Bilgileri', steps: ['body-info', 'target-weight', 'activity'] },
  { key: 'nutrition', label: 'Beslenme', steps: ['diet-check', 'health'] },
  { key: 'account', label: 'Hesap', steps: ['daily-time', 'privacy', 'signup'] },
] as const;
