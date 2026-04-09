import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { ONBOARDING_CATEGORIES } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingLayoutProps {
  children: React.ReactNode;
  /** The step key, e.g. 'goal', 'body-info' */
  stepKey: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** Optional illustration element rendered above the title */
  illustration?: React.ReactNode;
}

export function OnboardingLayout({
  children,
  stepKey,
  title,
  subtitle,
  showBack = true,
  illustration,
}: OnboardingLayoutProps) {
  // Find which category this step belongs to
  const categoryIndex = ONBOARDING_CATEGORIES.findIndex((c) =>
    (c.steps as readonly string[]).includes(stepKey)
  );
  const category = ONBOARDING_CATEGORIES[categoryIndex] ?? ONBOARDING_CATEGORIES[0];

  // Find step index inside category for intra-segment progress
  const stepIndexInCategory = (category.steps as readonly string[]).indexOf(stepKey);
  const stepsInCategory = category.steps.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Category Badge + Segmented Progress */}
      <View style={styles.topSection}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{category.label}</Text>
        </View>

        {/* Segmented progress bar */}
        <View style={styles.segmentRow}>
          {ONBOARDING_CATEGORIES.map((cat, idx) => {
            const isActive = idx === categoryIndex;
            const isCompleted = idx < categoryIndex;
            // For active category, fill proportionally
            const fillPercent = isCompleted
              ? 100
              : isActive
              ? ((stepIndexInCategory + 1) / stepsInCategory) * 100
              : 0;
            return (
              <View key={cat.key} style={styles.segmentTrack}>
                <View
                  style={[
                    styles.segmentFill,
                    {
                      width: `${fillPercent}%`,
                      backgroundColor: isCompleted || isActive
                        ? Colors.accent.orange
                        : Colors.neutral[200],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Optional illustration */}
      {illustration && <View style={styles.illustrationContainer}>{illustration}</View>}

      {/* Title & Subtitle */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Back button at bottom-left */}
      {showBack && (
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.orange,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    marginBottom: Spacing.md,
  },
  badgeText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  illustrationContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  backRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.sm,
  },
  backCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.text.primary,
    marginTop: -2,
  },
});
