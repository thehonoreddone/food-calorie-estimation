import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const timeOptions = ['0-5 dk', '5-10 dk', '10-15 dk'];

export default function DailyTimeScreen() {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
    setTimeout(() => {
      router.push('/onboarding/privacy');
    }, 300);
  };

  return (
    <OnboardingLayout
      stepKey="daily-time"
      title="Programınızı günlük hayatınıza uyacak şekilde uyarlayacağız"
      subtitle="Nutrino'ya günde ne kadar zaman ayırmak istersiniz?"
    >
      <View style={styles.options}>
        {timeOptions.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => handleSelect(option)}
              activeOpacity={0.7}
              style={[
                styles.optionCard,
                isSelected && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  optionCard: {
    backgroundColor: '#EDF2F7',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  optionSelected: {
    backgroundColor: Colors.accent.orange + '20',
    borderWidth: 2,
    borderColor: Colors.accent.orange,
  },
  optionText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  optionTextSelected: {
    color: Colors.accent.orange,
    fontWeight: '700',
  },
});
