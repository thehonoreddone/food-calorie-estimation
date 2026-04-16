/**
 * Nutrino Premium Design System
 * Based on v0.dev Health App UI — Dark Mode + Neon Accents
 *
 * Design DNA:
 *   Background  : Deep charcoal #0D0D12
 *   Neon Lime   : #A3E635  — primary progress, active states
 *   Vivid Cyan  : #22D3EE  — water, secondary charts
 *   Soft Purple : #C084FC  — fat macro, tertiary accents
 *   Warm Pink   : #F472B6  — fiber / bonus stat
 *   Surface     : rgba(255,255,255,0.05) with backdrop blur
 */

// ─── Core Palette ────────────────────────────────────────────────────────────

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────
  background:   '#0D0D12',   // deep charcoal
  backgroundAlt:'#13131A',   // slightly lighter for modals
  surface:      '#1A1A24',   // card base
  surfaceHigh:  '#22222F',   // elevated card
  glass:        'rgba(255,255,255,0.05)',  // glassmorphism base
  glassHover:   'rgba(255,255,255,0.08)',
  glassBorder:  'rgba(255,255,255,0.10)',

  // ── Neon Accents ─────────────────────────────────────────
  neon: {
    lime:    '#A3E635',   // primary: calories, progress, active
    limeGlow:'rgba(163,230,53,0.15)',
    cyan:    '#22D3EE',   // water intake, secondary
    cyanGlow:'rgba(34,211,238,0.15)',
    purple:  '#C084FC',   // fat macro, premium
    purpleGlow:'rgba(192,132,252,0.15)',
    pink:    '#F472B6',   // fiber, bonus
    pinkGlow: 'rgba(244,114,182,0.15)',
    orange:  '#FB923C',   // exercise, burn
    orangeGlow:'rgba(251,146,60,0.15)',
  },

  // ── Primary (Neon Lime scale) ─────────────────────────────
  primary: {
    50:  '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',   // ← MAIN neon lime
    500: '#84cc16',
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#365314',
    900: '#1a2e05',
  },

  // ── Accent Colors ─────────────────────────────────────────
  accent: {
    cyan:   '#22D3EE',
    purple: '#C084FC',
    pink:   '#F472B6',
    orange: '#FB923C',
    amber:  '#FBBF24',
  },

  // ── Neutral (for text hierarchy) ─────────────────────────
  neutral: {
    50:  '#fafafa',
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

  // ── Text ─────────────────────────────────────────────────
  text: {
    primary:   '#F8FAFC',   // nearly white
    secondary: '#94A3B8',   // slate-400
    muted:     '#475569',   // slate-600
    light:     '#334155',   // slate-700
    inverse:   '#0D0D12',
  },

  // ── Utility ──────────────────────────────────────────────
  border:  'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.05)',
  error:   '#F87171',
  success: '#A3E635',
  warning: '#FBBF24',
  info:    '#22D3EE',
} as const;

// ─── Macro Colors (semantic) ─────────────────────────────────────────────────

export const MacroColors = {
  protein: '#A3E635',   // neon lime
  carbs:   '#22D3EE',   // vivid cyan
  fat:     '#C084FC',   // soft purple
  fiber:   '#F472B6',   // warm pink
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const BorderRadius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ─── Font Sizes ──────────────────────────────────────────────────────────────

export const FontSize = {
  xs:    11,
  sm:    13,
  base:  15,
  lg:    17,
  xl:    19,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
  '5xl': 48,
} as const;

// ─── Font Weights ────────────────────────────────────────────────────────────

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
  black:     '900' as const,
} as const;

// ─── Shadows (neon glow shadows) ─────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  // Neon glow shadows
  neonLime: {
    shadowColor: '#A3E635',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  neonCyan: {
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  neonPurple: {
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#A3E635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// ─── Gradient Presets ────────────────────────────────────────────────────────

export const GradientPresets = {
  // Neon gradients
  neonLime:   ['#A3E635', '#65a30d'] as const,
  neonCyan:   ['#22D3EE', '#0891b2'] as const,
  neonPurple: ['#C084FC', '#9333ea'] as const,
  neonPink:   ['#F472B6', '#db2777'] as const,
  neonOrange: ['#FB923C', '#ea580c'] as const,

  // Background gradients
  dark:       ['#0D0D12', '#13131A'] as const,
  darkCard:   ['#1A1A24', '#22222F'] as const,
  darkGlass:  ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as const,

  // Mixed neon
  primary:    ['#A3E635', '#22D3EE'] as const,  // lime → cyan
  warm:       ['#FB923C', '#F472B6'] as const,   // orange → pink
  premium:    ['#C084FC', '#22D3EE'] as const,   // purple → cyan

  // Legacy (keep for compatibility)
  primaryLight: ['#86efac', '#4ade80'] as const,
  sunset:       ['#f97316', '#ef4444'] as const,
  ocean:        ['#06b6d4', '#3b82f6'] as const,
} as const;

// ─── Glassmorphism Helper ────────────────────────────────────────────────────

export const Glass = {
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius['2xl'],
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius['2xl'],
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.full,
  },
} as const;

// ─── Onboarding Steps (unchanged) ────────────────────────────────────────────

export const ONBOARDING_STEPS = [
  'welcome',
  'goal',
  'discovery',
  'gender-age',
  'birth-date',
  'body-info',
  'target-weight',
  'motivation',
  'activity',
  'diet-check',
  'health',
  'daily-time',
  'privacy',
  'preparing',
  'plan-ready',
  'signup',
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

export const ONBOARDING_CATEGORIES = [
  { key: 'goals',     label: 'Hedef & Profil',  steps: ['goal', 'discovery', 'gender-age', 'birth-date'] },
  { key: 'body',      label: 'Vücut Bilgileri', steps: ['body-info', 'target-weight', 'motivation', 'activity'] },
  { key: 'nutrition', label: 'Beslenme',        steps: ['diet-check', 'health'] },
  { key: 'account',   label: 'Hesap',           steps: ['daily-time', 'privacy', 'preparing', 'plan-ready', 'signup'] },
] as const;
