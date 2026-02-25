import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PrimaryButton } from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const privacyPoints = [
  {
    icon: '🍎',
    text: 'Kişisel verileriniz yalnızca beslenme önerilerimizi kişiselleştirmek için kullanılır',
  },
  {
    icon: '🔒',
    text: 'Kişisel verilerinizi ticari amaçlarla paylaşmıyoruz',
  },
  {
    icon: '🎭',
    text: 'Verileriniz gizli kalır',
  },
];

export default function PrivacyScreen() {
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (accepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/signup');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationEmoji}>🚪</Text>
        </View>

        <Text style={styles.title}>Kişisel verileriniz{'\n'}güvende</Text>

        {/* Privacy Points */}
        <View style={styles.pointsList}>
          {privacyPoints.map((point, index) => (
            <View key={index} style={styles.pointRow}>
              <View style={styles.pointIcon}>
                <Text style={styles.pointIconText}>{point.icon}</Text>
              </View>
              <Text style={styles.pointText}>{point.text}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <View style={styles.linksRow}>
          <Text style={styles.link}>Kullanım Koşulları</Text>
          <Text style={styles.linkDot}> · </Text>
          <Text style={styles.link}>Gizlilik Politikası</Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAccepted(!accepted);
          }}
          activeOpacity={0.7}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            Kullanım Şartlarını okudum ve kabul ettim, gizlilik politikası
            kapsamında verilerimin (özellikle sağlık verilerin) işlenme
            koşullarını kabul ettim
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backCircle}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.continueButton}>
            <PrimaryButton
              title="Devam Et"
              onPress={handleContinue}
              disabled={!accepted}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  illustrationEmoji: {
    fontSize: 80,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: Spacing['2xl'],
  },
  pointsList: {
    width: '100%',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  pointIconText: {
    fontSize: 22,
  },
  pointText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  linksRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  link: {
    fontSize: FontSize.sm,
    color: Colors.primary[600],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkDot: {
    fontSize: FontSize.sm,
    color: Colors.text.light,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: Spacing.md,
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.text.primary,
  },
  continueButton: {
    flex: 1,
  },
});
