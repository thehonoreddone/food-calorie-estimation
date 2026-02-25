import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const healthOptions = [
  'Hipertansiyon veya yüksek tansiyon',
  'Diyabet',
  'Depresyon',
  'Yeme bozuklukları (anoreksiya, bulimia)',
  'Diğer',
  'Hiçbiri',
];

export default function HealthScreen() {
  const [selected, setSelected] = useState<string[]>([]);

  const handleToggle = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value === 'Hiçbiri') {
      setSelected(['Hiçbiri']);
      return;
    }
    setSelected((prev) => {
      const without = prev.filter((v) => v !== 'Hiçbiri');
      if (without.includes(value)) {
        return without.filter((v) => v !== value);
      }
      return [...without, value];
    });
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/daily-time');
  };

  return (
    <OnboardingLayout
      stepKey="health"
      title="Aşağıdaki hastalıklardan birine sahip oldunuz mu?"
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {healthOptions.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              onPress={() => handleToggle(option)}
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
              {/* Checkbox */}
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Sonraki"
          onPress={handleContinue}
          disabled={selected.length === 0}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  optionCard: {
    backgroundColor: '#EDF2F7',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
    marginRight: Spacing.md,
  },
  optionTextSelected: {
    color: Colors.primary[700],
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
});
