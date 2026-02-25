import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const discoveryOptions = [
  'Instagram / Facebook',
  'TikTok',
  'TV',
  'Play Store / App Store',
  'Arkadaşlar / Aile',
  'Influencer',
  'Arama motoru (Google, vb.)',
  'Başka bir uygulamada reklam',
];

export default function DiscoveryScreen() {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
    // Auto-advance after short delay
    setTimeout(() => {
      router.push('/onboarding/gender-age');
    }, 300);
  };

  return (
    <OnboardingLayout
      stepKey="discovery"
      title="Nutrino'yu nereden duydunuz?"
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {discoveryOptions.map((option) => {
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
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
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
