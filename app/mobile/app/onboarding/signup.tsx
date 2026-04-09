import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const PRIVACY_URL = 'https://nutrino.app/privacy';
const TERMS_URL = 'https://nutrino.app/terms';

export default function SignupScreen() {
  const { completeOnboarding } = useUser();

  const handleEmailSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await completeOnboarding();
    router.replace('/auth/register');
  };

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await completeOnboarding();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.spacer} />

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationEmoji}>🌵</Text>
          <Text style={styles.illustrationEmoji2}>⚖️</Text>
        </View>

        <Text style={styles.title}>Yanıtlarınızı{'\n'}kaydedin</Text>
        <Text style={styles.subtitle}>
          Ayarlarınızı kaydetmek için{'\n'}hesabınızı kaydedin.
        </Text>

        <View style={styles.spacer} />

        {/* Sign up buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={handleEmailSignup}
            activeOpacity={0.7}
            style={[styles.socialButton, styles.emailButton, Shadows.sm]}
            accessibilityRole="button"
            accessibilityLabel="E-posta ile kayıt ol"
          >
            <Text style={styles.emailIcon}>✉️</Text>
            <Text style={styles.socialButtonText}>E-posta ile kayıt ol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.7}
            style={[styles.socialButton, styles.loginButton]}
            accessibilityRole="button"
            accessibilityLabel="Zaten hesabım var, giriş yap"
          >
            <Text style={styles.socialButtonTextDark}>Zaten hesabım var</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          Devam ederek{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Gizlilik Politikası
          </Text>
          {' '}ve{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
            Kullanım Koşulları
          </Text>
          {"'nı kabul ediyorum."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  illustrationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  illustrationEmoji2: {
    fontSize: 52,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emailButton: {
    backgroundColor: Colors.primary[500],
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.neutral[300],
  },
  emailIcon: {
    fontSize: 18,
  },
  socialButtonText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  socialButtonTextDark: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  termsText: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  termsLink: {
    color: Colors.primary[600],
    textDecorationLine: 'underline',
  },
});
