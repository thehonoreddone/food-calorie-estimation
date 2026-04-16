import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, FontSize, Shadows } from '@/constants/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'filled',
  size = 'lg',
  icon,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const sizeStyles = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: FontSize.sm },
    md: { height: 48, paddingHorizontal: 20, fontSize: FontSize.base },
    lg: { height: 56, paddingHorizontal: 24, fontSize: FontSize.lg },
  };

  const currentSize = sizeStyles[size];

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading }}
        style={[
          styles.base,
          {
            height: currentSize.height,
            paddingHorizontal: currentSize.paddingHorizontal,
            borderWidth: 2,
            borderColor: Colors.primary[500],
            backgroundColor: 'transparent',
          },
          disabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary[500]} />
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize: currentSize.fontSize, color: Colors.primary[500] },
              textStyle,
            ]}
          >
            {icon ? `${icon}  ${title}` : title}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading }}
        style={[
          styles.base,
          {
            height: currentSize.height,
            paddingHorizontal: currentSize.paddingHorizontal,
            backgroundColor: 'transparent',
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: currentSize.fontSize,
              color: Colors.text.secondary,
              fontWeight: '500',
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  // Filled (default)
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={disabled ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.04)'] : ['#4ade80', '#2DD4A0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.base,
          styles.gradient,
          {
            height: currentSize.height,
            paddingHorizontal: currentSize.paddingHorizontal,
          },
          !disabled && Shadows.xl,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#030E08" />
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize: currentSize.fontSize, color: disabled ? 'rgba(255,255,255,0.30)' : '#030E08' },
              textStyle,
            ]}
          >
            {icon ? `${icon}  ${title}` : title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradient: {
    borderRadius: BorderRadius['3xl'],
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
