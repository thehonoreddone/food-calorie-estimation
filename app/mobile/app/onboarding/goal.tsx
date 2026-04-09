import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { useUser, Goal } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const goalOptions: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Kilo vermek' },
  { value: 'gain', label: 'Kas kazanmak ve yağ kaybetmek' },
  { value: 'maintain', label: 'Kilomu korumak' },
  { value: 'lose', label: 'Kilo vermeden daha sağlıklı beslenmek' },
];

export default function GoalScreen() {
  const { profile, updateProfile } = useUser();
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const handleSelect = (value: string, goalValue: Goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
    updateProfile({ goal: goalValue });
    // Auto-advance after short delay
    setTimeout(() => {
      router.push('/onboarding/discovery');
    }, 300);
  };

  return (
    <OnboardingLayout
      stepKey="goal"
      title="Burada ne yapıyorsunuz?"
      showBack={false}
      illustration={
        <Text style={{ fontSize: 64 }}>🌻</Text>
      }
    >
      <View style={styles.greeting}>
        <Text style={styles.greetingTitle}>
          Merhaba{profile.name ? ` ${profile.name}` : ''}!
        </Text>
      </View>

      <View style={styles.options}>
        {goalOptions.map((option, index) => {
          const key = `${option.value}-${index}`;
          const isSelected = selected === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleSelect(key, option.value)}
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
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginBottom: Spacing.xl,
  },
  greetingTitle: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  options: {
    gap: Spacing.md,
  },
  optionCard: {
    backgroundColor: '#EDF2F7',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  optionSelected: {
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[400],
  },
  optionText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  optionTextSelected: {
    color: Colors.primary[700],
  },
});
