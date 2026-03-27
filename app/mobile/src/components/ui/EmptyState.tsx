/**
 * EmptyState — Motivational empty state screens
 * Shows friendly, motivational content when no data is available.
 * Each variant has a unique emoji, message, and optional CTA.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { hapticMedium } from '../../utils/haptics';

type EmptyStateVariant =
  | 'no-meals'
  | 'no-history'
  | 'no-favorites'
  | 'streak-start'
  | 'first-scan'
  | 'error';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
  actionLabel?: string;
}

const EMPTY_STATES: Record<
  EmptyStateVariant,
  { emoji: string; title: string; message: string; defaultAction?: string }
> = {
  'no-meals': {
    emoji: '🍽️',
    title: 'Henüz öğün kaydı yok',
    message:
      'Bugün ne yediğini kaydetmeye başla! İlk fotoğrafını çek ve kalorilerini öğren.',
    defaultAction: 'İlk Yemeğini Tara',
  },
  'no-history': {
    emoji: '📊',
    title: 'Geçmiş boş',
    message:
      'Yemek taramalarınız burada görünecek. İlk taramanızı yaparak beslenme yolculuğunuza başlayın!',
    defaultAction: 'Hemen Başla',
  },
  'no-favorites': {
    emoji: '⭐',
    title: 'Henüz favori yemeğin yok',
    message:
      'Sık yediğin yemekleri favorilere ekle, kalori takibini daha kolay yap!',
  },
  'streak-start': {
    emoji: '🔥',
    title: 'Seri başlatmaya hazır mısın?',
    message:
      'Her gün en az bir yemeğini tara ve günlük serini korumaya başla! 7 gün üst üste seri yapanlar %90 daha başarılı!',
    defaultAction: 'Seriyi Başlat',
  },
  'first-scan': {
    emoji: '📸',
    title: 'İlk Taramanı Yap!',
    message:
      'Kameranı aç, yemeğinin fotoğrafını çek — yapay zeka saniyeler içinde kalorilerini hesaplasın!',
    defaultAction: 'Kamerayı Aç',
  },
  error: {
    emoji: '😔',
    title: 'Bir şeyler yanlış gitti',
    message: 'Lütfen tekrar deneyin. Sorun devam ederse bize bildirin.',
    defaultAction: 'Tekrar Dene',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  onAction,
  actionLabel,
}) => {
  const state = EMPTY_STATES[variant];

  const handlePress = () => {
    hapticMedium();
    onAction?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{state.emoji}</Text>
      <Text style={styles.title}>{state.title}</Text>
      <Text style={styles.message}>{state.message}</Text>

      {(onAction || state.defaultAction) && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>
            {actionLabel || state.defaultAction}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
