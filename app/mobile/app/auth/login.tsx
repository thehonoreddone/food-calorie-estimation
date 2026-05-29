import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PrimaryButton, PremiumModal, usePremiumModal } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { firebaseResetPassword, getFirebaseErrorMessage } from '@/services/firebaseAuth';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const { modalProps, showError } = usePremiumModal();

  const handleForgotPassword = () => {
    setResetEmail(email); // pre-fill from login form
    setResetSent(false);
    setResetError('');
    setResetLoading(false);
    setShowForgotModal(true);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) {
      setResetError('Lütfen e-posta adresinizi girin.');
      return;
    }
    // Basic email format check
    if (!/\S+@\S+\.\S+/.test(resetEmail.trim())) {
      setResetError('Geçerli bir e-posta adresi girin.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    try {
      await firebaseResetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      setResetError(getFirebaseErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Eksik Bilgi', 'Lütfen e-posta adresinizi ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        showError('Giriş Başarısız', result.error ?? 'Bilgilerinizi kontrol edin.');
      }
    } catch {
      showError('Bir Sorun Oluştu', 'Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password Premium Modal ────────────────────────────────────────
  const renderForgotPasswordModal = () => (
    <Modal visible={showForgotModal} transparent animationType="fade">
      <View style={fpStyles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={fpStyles.keyboardView}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={fpStyles.card}>
            {/* Close button */}
            <TouchableOpacity
              style={fpStyles.closeBtn}
              onPress={() => setShowForgotModal(false)}
              activeOpacity={0.7}
            >
              <Text style={fpStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {!resetSent ? (
              /* ── Step 1: Email Input ── */
              <>
                {/* Icon */}
                <Animated.View entering={FadeIn.delay(100).duration(500)} style={fpStyles.iconWrap}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
                    style={fpStyles.iconCircle}
                  >
                    <Text style={fpStyles.iconEmoji}>🔐</Text>
                  </LinearGradient>
                </Animated.View>

                {/* Title */}
                <Animated.Text entering={FadeInUp.delay(150).duration(400)} style={fpStyles.title}>
                  Şifre Sıfırlama
                </Animated.Text>
                <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={fpStyles.description}>
                  E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz. Bağlantıya tıklayarak yeni şifrenizi belirleyebilirsiniz.
                </Animated.Text>

                {/* Email Input */}
                <Animated.View entering={FadeInUp.delay(250).duration(400)} style={fpStyles.inputGroup}>
                  <Text style={fpStyles.inputLabel}>E-posta Adresi</Text>
                  <View style={fpStyles.inputContainer}>
                    <Text style={fpStyles.inputIcon}>📧</Text>
                    <TextInput
                      style={fpStyles.input}
                      placeholder="ornek@email.com"
                      placeholderTextColor="#64748b"
                      value={resetEmail}
                      onChangeText={(t) => { setResetEmail(t); setResetError(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoFocus
                      editable={!resetLoading}
                    />
                  </View>
                </Animated.View>

                {/* Error */}
                {!!resetError && (
                  <Animated.View entering={FadeIn.duration(300)} style={fpStyles.errorContainer}>
                    <Text style={fpStyles.errorIcon}>⚠️</Text>
                    <Text style={fpStyles.errorText}>{resetError}</Text>
                  </Animated.View>
                )}

                {/* Send Button */}
                <Animated.View entering={FadeInUp.delay(300).duration(400)} style={fpStyles.buttonWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleSendResetEmail}
                    disabled={resetLoading}
                  >
                    <LinearGradient
                      colors={resetLoading ? ['#475569', '#475569'] : ['#22c55e', '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={fpStyles.sendBtn}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={fpStyles.sendBtnText}>📩  Sıfırlama Bağlantısı Gönder</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Cancel */}
                <TouchableOpacity
                  style={fpStyles.cancelBtn}
                  onPress={() => setShowForgotModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={fpStyles.cancelBtnText}>Vazgeç</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2: Success ── */
              <>
                {/* Success Icon */}
                <Animated.View entering={FadeIn.duration(600)} style={fpStyles.iconWrap}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                    style={fpStyles.successCircle}
                  >
                    <Text style={fpStyles.successEmoji}>✅</Text>
                  </LinearGradient>
                </Animated.View>

                <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={fpStyles.title}>
                  Bağlantı Gönderildi!
                </Animated.Text>
                <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={fpStyles.description}>
                  <Text style={fpStyles.emailHighlight}>{resetEmail}</Text> adresine şifre sıfırlama bağlantısı başarıyla gönderildi.
                </Animated.Text>

                {/* Instructions */}
                <Animated.View entering={FadeInUp.delay(300).duration(400)} style={fpStyles.instructionsCard}>
                  <View style={fpStyles.instructionRow}>
                    <Text style={fpStyles.instructionNum}>1</Text>
                    <Text style={fpStyles.instructionText}>E-posta kutunuzu kontrol edin</Text>
                  </View>
                  <View style={fpStyles.instructionRow}>
                    <Text style={fpStyles.instructionNum}>2</Text>
                    <Text style={fpStyles.instructionText}>Bağlantıya tıklayarak yeni şifrenizi belirleyin</Text>
                  </View>
                  <View style={fpStyles.instructionRow}>
                    <Text style={fpStyles.instructionNum}>3</Text>
                    <Text style={fpStyles.instructionText}>Yeni şifrenizle giriş yapın</Text>
                  </View>
                </Animated.View>

                {/* Spam note */}
                <Animated.Text entering={FadeInUp.delay(400).duration(400)} style={fpStyles.spamNote}>
                  💡 E-posta gelmezse spam/gereksiz klasörünü kontrol edin.
                </Animated.Text>

                {/* Close */}
                <Animated.View entering={FadeInUp.delay(500).duration(400)} style={fpStyles.buttonWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowForgotModal(false)}
                  >
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={fpStyles.sendBtn}
                    >
                      <Text style={fpStyles.sendBtnText}>Tamam, Giriş Yapacağım</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={[Colors.primary[500], Colors.primary[600]]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoEmoji}>🍽️</Text>
            </LinearGradient>
            <Text style={styles.title}>Hoş Geldiniz</Text>
            <Text style={styles.subtitle}>
              Hesabınıza giriş yapın
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta</Text>
              <View style={[styles.inputContainer, Shadows.sm]}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ornek@email.com"
                  placeholderTextColor={Colors.text.light}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şifre</Text>
              <View style={[styles.inputContainer, Shadows.sm]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.text.light}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              accessibilityRole="button"
              accessibilityLabel="Şifremi unuttum"
            >
              <Text style={styles.forgotPasswordText}>
                Şifremi Unuttum
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <PrimaryButton
              title="Giriş Yap"
              onPress={handleLogin}
              loading={loading}
            />
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.registerLink}>Kayıt Olun</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Premium Modal (for login errors) */}
      <PremiumModal {...modalProps} />

      {/* Forgot Password Premium Modal */}
      {renderForgotPasswordModal()}
    </SafeAreaView>
  );
}

// ─── Forgot Password Modal Styles ────────────────────────────────────────────
const fpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  iconEmoji: {
    fontSize: 36,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  emailHighlight: {
    color: '#22c55e',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#f1f5f9',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#fca5a5',
    lineHeight: 18,
  },
  buttonWrap: {
    marginTop: 4,
  },
  sendBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
    marginRight: 12,
    overflow: 'hidden',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  spamNote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
});

// ─── Main Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
  },
  forgotPasswordText: {
    fontSize: FontSize.sm,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  actions: {
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },
  registerLink: {
    fontSize: FontSize.base,
    color: Colors.primary[600],
    fontWeight: '700',
  },
});
