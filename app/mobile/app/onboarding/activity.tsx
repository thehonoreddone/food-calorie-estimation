import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout } from '@/components/ui';
import { useUser, ActivityLevel } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const activityOptions: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Hareketsiz', desc: 'Masa başı iş, az hareket' },
  { value: 'light', label: 'Az Hareketli', desc: 'Hafif yürüyüş, haftada 1-2 egzersiz' },
  { value: 'moderate', label: 'Orta Düzey', desc: 'Haftada 3-5 gün egzersiz' },
  { value: 'active', label: 'Çok Aktif', desc: 'Yoğun egzersiz, fiziksel iş' },
];

export default function ActivityScreen() {
  const { profile, updateProfile } = useUser();
  const [selected, setSelected] = useState<ActivityLevel | undefined>(
    profile.activityLevel
  );

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
              activeOpacity={0.7}
              style={[
                styles.optionCard,
                isSelected && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionTitle,
                  isSelected && styles.optionTitleSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionDesc,
                  isSelected && styles.optionDescSelected,
                ]}
              >
                {option.desc}
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
    paddingTop: Spacing.md,
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
  optionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  optionTitleSelected: {
    color: Colors.primary[700],
  },
  optionDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  optionDescSelected: {
    color: Colors.primary[600],
  },
});
