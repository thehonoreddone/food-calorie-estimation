import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '@/components/ui';
import { useUser, ActivityLevel } from '@/contexts/UserContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

const activityOptions: { value: ActivityLevel; label: string; desc: string; icon: string }[] = [
  { value: 'sedentary', label: 'Hareketsiz',    desc: 'Masa başı iş, az hareket',          icon: '🪑' },
  { value: 'light',     label: 'Az Hareketli',  desc: 'Hafif yürüyüş, haftada 1-2 egzersiz', icon: '🚶' },
  { value: 'moderate',  label: 'Orta Düzey',    desc: 'Haftada 3-5 gün egzersiz',           icon: '🏃' },
  { value: 'active',    label: 'Çok Aktif',     desc: 'Yoğun egzersiz, fiziksel iş',       icon: '💪' },
];

export default function ActivityScreen() {
  const { profile, updateProfile } = useUser();
  const [selected, setSelected] = useState<ActivityLevel | undefined>(profile.activityLevel);

  const handleSelect = (value: ActivityLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
    updateProfile({ activityLevel: value });
    setTimeout(() => {
      router.push('/onboarding/diet-check');
    }, 300);
  };

  return (
    <OnboardingLayout
      stepKey="activity"
      title="Aktivite seviyeniz nedir?"
      subtitle="Günlük hareketlilik düzeyinizi seçin"
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🏃</Text>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activityOptions.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.75}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <View style={[styles.emojiWrap, isSelected && styles.emojiWrapSelected]}>
                <Text style={styles.emoji}>{option.icon}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
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
      </ScrollView>
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
    paddingBottom: Spacing['3xl'],
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
  emojiWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiWrapSelected: {
    backgroundColor: 'rgba(45,212,160,0.18)',
  },
  emoji: { fontSize: 22 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  cardTitleSelected: { color: NEON_GREEN },
  cardDesc: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 2,
  },
  cardDescSelected: { color: 'rgba(45,212,160,0.70)' },
  checkDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: NEON_GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', color: '#030E08' },
});
