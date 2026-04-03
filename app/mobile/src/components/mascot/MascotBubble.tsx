import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontSize, BorderRadius, Shadows } from '@/constants/theme';

interface MascotBubbleProps {
  message: string;
  visible: boolean;
  /** Position relative to mascot: 'right', 'top', or 'inline' */
  position?: 'right' | 'top' | 'inline';
}

export function MascotBubble({ message, visible, position = 'right' }: MascotBubbleProps) {
  if (!visible || !message) return null;

  if (position === 'inline') {
    return (
      <Animated.View
        entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
        exiting={FadeOut.duration(300)}
        style={styles.inlineBubble}
      >
        <Text style={styles.inlineText}>{message}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(300)}
      style={[
        styles.bubble,
        position === 'top' ? styles.bubbleTop : styles.bubbleRight,
      ]}
    >
      {/* Triangle pointer */}
      <View
        style={[
          styles.pointer,
          position === 'top' ? styles.pointerBottom : styles.pointerLeft,
        ]}
      />
      <Text style={styles.bubbleText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 200,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  bubbleRight: {
    marginLeft: 8,
  },
  bubbleTop: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 12,
    alignSelf: 'center',
  },
  pointer: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  pointerLeft: {
    left: -8,
    top: '40%',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: Colors.surface,
  },
  pointerBottom: {
    bottom: -8,
    left: '40%',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.surface,
  },
  bubbleText: {
    fontSize: FontSize.xs,
    color: Colors.text.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
  // Inline mode — no card, just text
  inlineBubble: {
    paddingVertical: 2,
    paddingRight: 4,
  },
  inlineText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
