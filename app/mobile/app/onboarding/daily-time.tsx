import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

const timeOptions = [
  { label: '0-5 dk',   icon: '⚡', desc: 'Hızlı ve etkili' },
  { label: '5-10 dk',  icon: '⏱️', desc: 'Dengeli takip' },
  { label: '10-15 dk', icon: '📊', desc: 'Detaylı analiz' },
];

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
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>⏰</Text>
        </View>
      }
    >
      <View style={styles.options}>
        {timeOptions.map((option) => {
          const isSelected = selected === option.label;
          return (
            <TouchableOpacity
              key={option.label}
              onPress={() => handleSelect(option.label)}
              activeOpacity={0.75}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <View style={[styles.emojiWrap, isSelected && styles.emojiWrapSelected]}>
                <Text style={styles.emoji}>{option.icon}</Text>
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={[styles.cardDesc, isSelected && styles.cardDescSelected]}>
                  {option.desc}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.checkDot}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
  options: { gap: Spacing.md, marginTop: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  cardSelected: {
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderColor: 'rgba(45,212,160,0.45)',
  },
  emojiWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiWrapSelected: { backgroundColor: 'rgba(45,212,160,0.18)' },
  emoji: { fontSize: 22 },
  textWrap: { flex: 1 },
  cardLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  cardLabelSelected: { color: NEON_GREEN },
  cardDesc: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 2,
  },
  cardDescSelected: { color: 'rgba(45,212,160,0.65)' },
  checkDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: NEON_GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', color: '#030E08' },
});
