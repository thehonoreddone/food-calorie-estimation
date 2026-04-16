import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

const healthOptions = [
  { label: 'Hipertansiyon veya yüksek tansiyon', icon: '❤️' },
  { label: 'Diyabet',                             icon: '🩺' },
  { label: 'Depresyon',                           icon: '🧠' },
  { label: 'Yeme bozuklukları (anoreksiya, bulimia)', icon: '⚠️' },
  { label: 'Diğer',                               icon: '📋' },
  { label: 'Hiçbiri',                             icon: '✅' },
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
      if (without.includes(value)) return without.filter((v) => v !== value);
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
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🩺</Text>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {healthOptions.map((option) => {
          const isSelected = selected.includes(option.label);
          return (
            <TouchableOpacity
              key={option.label}
              onPress={() => handleToggle(option.label)}
              activeOpacity={0.75}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <Text style={styles.cardIcon}>{option.icon}</Text>
              <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>
                {option.label}
              </Text>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        onPress={handleContinue}
        disabled={selected.length === 0}
        activeOpacity={0.85}
        style={styles.btnWrap}
      >
        <LinearGradient
          colors={selected.length > 0 ? ['#4ade80', '#2DD4A0'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          <Text style={[styles.btnText, selected.length === 0 && styles.btnTextDisabled]}>
            Sonraki →
          </Text>
        </LinearGradient>
      </TouchableOpacity>
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
  scroll: { flex: 1 },
  scrollContent: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
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
  cardIcon: { fontSize: 20 },
  cardText: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
  },
  cardTextSelected: { color: NEON_GREEN },
  checkbox: {
    width: 26, height: 26, borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: NEON_GREEN,
    borderColor: NEON_GREEN,
  },
  checkmark: { color: '#030E08', fontSize: 14, fontWeight: '800' },
  btnWrap: {
    marginTop: Spacing.sm,
    marginBottom: Spacing['3xl'],
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  },
  btn: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius['3xl'],
  },
  btnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#030E08',
  },
  btnTextDisabled: { color: 'rgba(255,255,255,0.30)' },
});
