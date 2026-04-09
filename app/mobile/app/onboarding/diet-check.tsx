import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function DietCheckScreen() {
  const { updateProfile } = useUser();

  const handleAnswer = (hasRestrictions: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!hasRestrictions) {
      updateProfile({ dietPreferences: ['standard'] });
    }
    // If yes, we could navigate to a detailed diet selection screen,
    // but for simplicity we continue to health screen
    router.push('/onboarding/health');
  };

  return (
    <OnboardingLayout
      stepKey="diet-check"
      title="Yiyecek kısıtlamalarınız veya alerjileriniz var mı?"
      illustration={
        <View style={styles.illustrationRow}>
          <Text style={styles.illustrationEmoji}>🥦</Text>
          <Text style={styles.illustrationEmoji}>🥖</Text>
        </View>
      }
    >
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => handleAnswer(true)}
          activeOpacity={0.7}
          style={styles.answerCard}
        >
          <Text style={styles.answerText}>Evet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleAnswer(false)}
          activeOpacity={0.7}
          style={styles.answerCard}
        >
          <Text style={styles.answerText}>Hayır</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  illustrationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  illustrationEmoji: {
    fontSize: 72,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing['2xl'],
  },
  answerCard: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  answerText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});
