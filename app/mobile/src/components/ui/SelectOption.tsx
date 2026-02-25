import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, Shadows, Spacing } from '@/constants/theme';

interface SelectOptionProps {
  icon: string;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function SelectOption({
  icon,
  title,
  description,
  selected,
  onPress,
  size = 'md',
}: SelectOptionProps) {
  const iconSizes = { sm: 28, md: 36, lg: 48 };
  const titleSizes = { sm: FontSize.sm, md: FontSize.base, lg: FontSize.lg };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        selected && styles.selected,
        selected ? Shadows.md : Shadows.sm,
      ]}
    >
      <View style={styles.content}>
        <Text style={{ fontSize: iconSizes[size] }}>{icon}</Text>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              { fontSize: titleSizes[size] },
              selected && styles.selectedTitle,
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text style={[styles.description, selected && styles.selectedDescription]}>
              {description}
            </Text>
          )}
        </View>
      </View>

      {/* Selection indicator */}
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Spacing.sm,
  },
  selected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  selectedTitle: {
    color: Colors.primary[700],
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  selectedDescription: {
    color: Colors.primary[600],
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary[500],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary[500],
  },
});
