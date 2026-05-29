/**
 * PremiumModal — Nutrino Custom Alert Component
 * Replaces the native Alert.alert() with a premium, on-brand modal
 * that matches the dark neon design system.
 *
 * Types:
 *   'error'   → red/rose glow, ✕ icon
 *   'success' → neon lime glow, ✓ icon
 *   'warning' → amber glow, ⚠ icon
 *   'info'    → cyan glow, ℹ icon
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalType = 'error' | 'success' | 'warning' | 'info';

export interface ModalButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'primary';
}

export interface PremiumModalProps {
  visible: boolean;
  type?: ModalType;
  title: string;
  message: string;
  buttons?: ModalButton[];
  onDismiss?: () => void;
}

// ─── Config per type ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  ModalType,
  {
    icon: string;
    gradient: [string, string];
    glowColor: string;
    accentColor: string;
    bgTint: string;
  }
> = {
  error: {
    icon: '✕',
    gradient: ['#F87171', '#DC2626'],
    glowColor: 'rgba(248,113,113,0.25)',
    accentColor: '#F87171',
    bgTint: 'rgba(248,113,113,0.06)',
  },
  success: {
    icon: '✓',
    gradient: ['#A3E635', '#65A30D'],
    glowColor: 'rgba(163,230,53,0.25)',
    accentColor: '#A3E635',
    bgTint: 'rgba(163,230,53,0.06)',
  },
  warning: {
    icon: '!',
    gradient: ['#FBBF24', '#D97706'],
    glowColor: 'rgba(251,191,36,0.25)',
    accentColor: '#FBBF24',
    bgTint: 'rgba(251,191,36,0.06)',
  },
  info: {
    icon: 'i',
    gradient: ['#22D3EE', '#0891B2'],
    glowColor: 'rgba(34,211,238,0.25)',
    accentColor: '#22D3EE',
    bgTint: 'rgba(34,211,238,0.06)',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PremiumModal({
  visible,
  type = 'info',
  title,
  message,
  buttons,
  onDismiss,
}: PremiumModalProps) {
  const cfg = TYPE_CONFIG[type];

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  // Default single OK button if none provided
  const resolvedButtons: ModalButton[] = buttons && buttons.length > 0
    ? buttons
    : [{ text: 'Tamam', style: 'primary', onPress: onDismiss }];

  const handleButtonPress = (btn: ModalButton) => {
    btn.onPress?.();
    if (!btn.onPress) onDismiss?.();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[styles.container, { opacity: opacityAnim }]}
          pointerEvents="box-none"
        >
          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { transform: [{ scale: scaleAnim }], backgroundColor: cfg.bgTint },
            ]}
          >
            {/* Glass border overlay */}
            <View style={styles.glassBorder} />

            {/* Glow behind icon */}
            <View style={[styles.iconGlow, { backgroundColor: cfg.glowColor }]} />

            {/* Icon circle */}
            <LinearGradient
              colors={cfg.gradient}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.iconText}>{cfg.icon}</Text>
            </LinearGradient>

            {/* Title */}
            <Text style={[styles.title, { color: cfg.accentColor }]}>{title}</Text>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: cfg.accentColor + '30' }]} />

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View
              style={[
                styles.buttonsRow,
                resolvedButtons.length === 1 && styles.buttonsRowSingle,
              ]}
            >
              {resolvedButtons.map((btn, idx) => {
                const isPrimary = btn.style === 'primary' || (resolvedButtons.length === 1);
                const isCancel = btn.style === 'cancel';

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.button,
                      resolvedButtons.length === 1 && styles.buttonFull,
                      isCancel && styles.buttonCancel,
                      isPrimary && !isCancel && styles.buttonPlaceholder,
                    ]}
                    onPress={() => handleButtonPress(btn)}
                    activeOpacity={0.75}
                  >
                    {isPrimary && !isCancel ? (
                      <LinearGradient
                        colors={cfg.gradient}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.buttonPrimaryText}>{btn.text}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.buttonCancelText}>{btn.text}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Hook for imperative usage ────────────────────────────────────────────────

export interface ModalState {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  buttons?: ModalButton[];
}

export function usePremiumModal() {
  const [state, setState] = React.useState<ModalState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const show = React.useCallback(
    (
      type: ModalType,
      title: string,
      message: string,
      buttons?: ModalButton[]
    ) => {
      setState({ visible: true, type, title, message, buttons });
    },
    []
  );

  const hide = React.useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showError = React.useCallback(
    (title: string, message: string, buttons?: ModalButton[]) =>
      show('error', title, message, buttons),
    [show]
  );

  const showSuccess = React.useCallback(
    (title: string, message: string, buttons?: ModalButton[]) =>
      show('success', title, message, buttons),
    [show]
  );

  const showWarning = React.useCallback(
    (title: string, message: string, buttons?: ModalButton[]) =>
      show('warning', title, message, buttons),
    [show]
  );

  const showInfo = React.useCallback(
    (title: string, message: string, buttons?: ModalButton[]) =>
      show('info', title, message, buttons),
    [show]
  );

  const modalProps: PremiumModalProps = {
    ...state,
    onDismiss: hide,
  };

  return { show, hide, showError, showSuccess, showWarning, showInfo, modalProps };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  card: {
    width: Math.min(SCREEN_W - 48, 360),
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    alignItems: 'center',
    // Glass card base
    backgroundColor: '#1A1A2E',
    overflow: 'hidden',
    // Elevation for Android
    elevation: 24,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
  },
  glassBorder: {
    position: 'absolute',
    inset: 0,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  iconGlow: {
    position: 'absolute',
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
    // Inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 34,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  buttonsRowSingle: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonPlaceholder: {
    // gradient handled inside
  },
  buttonGradient: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  buttonPrimaryText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    height: 48,
  },
  buttonCancelText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
});
