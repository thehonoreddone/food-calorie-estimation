import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

export default function DietCheckScreen() {
  const { updateProfile } = useUser();

  const handleAnswer = (hasRestrictions: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!hasRestrictions) {
      updateProfile({ dietPreferences: ['standard'] });
    }
    router.push('/onboarding/health');
  };

  return (
    <OnboardingLayout
      stepKey="diet-check"
      title="Yiyecek kısıtlamalarınız veya alerjileriniz var mı?"
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🥦</Text>
        </View>
      }
    >
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => handleAnswer(true)}
          activeOpacity={0.75}
          style={styles.answerCard}
        >
          <Text style={styles.answerIcon}>✅</Text>
          <Text style={styles.answerText}>Evet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleAnswer(false)}
          activeOpacity={0.75}
          style={styles.answerCard}
        >
          <Text style={styles.answerIcon}>❌</Text>
          <Text style={styles.answerText}>Hayır</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: 'rgba(45,212,160,0.13)',
    borderWidth: 1, borderColor: 'rgba(45,212,160,0.28)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: NEON_GREEN, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  iconEmoji: { fontSize: 38 },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing['2xl'],
  },
  answerCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  answerIcon: { fontSize: 32 },
  answerText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#F0FDF4',
  },
});
