import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { useUser, Goal } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

const goalOptions: { value: Goal; label: string; icon: string }[] = [
  { value: 'lose',     label: 'Kilo vermek',                        icon: '🔥' },
  { value: 'gain',     label: 'Kas kazanmak ve yağ kaybetmek',      icon: '💪' },
  { value: 'maintain', label: 'Kilomu korumak',                     icon: '⚖️' },
  { value: 'lose',     label: 'Kilo vermeden daha sağlıklı beslenmek', icon: '🥗' },
];

export default function GoalScreen() {
  const { profile, updateProfile } = useUser();
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const handleSelect = (value: string, goalValue: Goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
    updateProfile({ goal: goalValue });
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
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🌻</Text>
        </View>
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
              activeOpacity={0.75}
              style={[styles.optionCard, isSelected && styles.optionSelected]}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
              {isSelected && <View style={styles.checkDot}><Text style={styles.checkMark}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  greetingTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#F0FDF4',
    textAlign: 'center',
  },
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
  iconEmoji: {
    fontSize: 38,
  },
  options: {
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  optionSelected: {
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderColor: 'rgba(45,212,160,0.45)',
  },
  optionIcon: {
    fontSize: 22,
  },
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
