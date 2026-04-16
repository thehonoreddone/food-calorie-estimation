import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

const discoveryOptions = [
  { label: 'Instagram / Facebook', icon: '📸' },
  { label: 'TikTok',               icon: '🎵' },
  { label: 'TV',                   icon: '📺' },
  { label: 'Play Store / App Store', icon: '📱' },
  { label: 'Arkadaşlar / Aile',    icon: '👥' },
  { label: 'Influencer',           icon: '⭐' },
  { label: 'Arama motoru (Google, vb.)', icon: '🔍' },
  { label: 'Başka bir uygulamada reklam', icon: '📢' },
];

export default function DiscoveryScreen() {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
    setTimeout(() => {
      router.push('/onboarding/gender-age');
    }, 300);
  };

  return (
    <OnboardingLayout
      stepKey="discovery"
      title="Nutrino'yu nereden duydunuz?"
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🔍</Text>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {discoveryOptions.map((option) => {
          const isSelected = selected === option.label;
          return (
            <TouchableOpacity
              key={option.label}
              onPress={() => handleSelect(option.label)}
              activeOpacity={0.75}
              style={[styles.optionCard, isSelected && styles.optionSelected]}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
              {isSelected && (
                <View style={styles.checkDot}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(45,212,160,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,160,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  iconEmoji: { fontSize: 38 },
  scroll: { flex: 1 },
  scrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  optionSelected: {
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderColor: 'rgba(45,212,160,0.45)',
  },
  optionIcon: { fontSize: 20 },
  optionText: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
  },
  optionTextSelected: {
    color: NEON_GREEN,
    fontWeight: '700',
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NEON_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#030E08',
  },
});
