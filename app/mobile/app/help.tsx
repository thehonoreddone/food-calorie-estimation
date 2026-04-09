import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PrimaryButton } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';

const FAQ_ITEMS = [
  {
    question: 'Nutrino nasıl çalışır?',
    answer: 'Yemeğinizin fotoğrafını çekin, yapay zeka modeli yemeği tanır ve tahmini kalori değerini hesaplar.',
  },
  {
    question: 'Kaç yemek türünü tanıyabilir?',
    answer: '201 farklı yemek türünü tanıyabilir. Türk mutfağı dahil birçok uluslararası yemek desteklenir.',
  },
  {
    question: 'Kalori değerleri ne kadar doğru?',
    answer: 'Yapay zeka tahmini porsiyon boyutu ve yemek türüne göre hesaplanır. Kesin değil, yaklaşık değerlerdir.',
  },
  {
    question: 'İnternet bağlantısı gerekli mi?',
    answer: 'Evet, yemek analizi için sunucu bağlantısı gereklidir. Geçmiş kayıtlarınız çevrimdışı görüntülenebilir.',
  },
  {
    question: 'Verilerim güvende mi?',
    answer: 'Verileriniz cihazınızda yerel olarak saklanır. Fotoğraflarınız sadece analiz için sunucuya gönderilir.',
  },
];

export default function HelpScreen() {
  const { profile } = useUser();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<string>('general');
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const categories = [
    { value: 'general', label: '💬 Genel' },
    { value: 'bug', label: '🐛 Hata' },
    { value: 'feature', label: '✨ Öneri' },
    { value: 'other', label: '📝 Diğer' },
  ];

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Hata', 'Lütfen geri bildiriminizi yazın.');
      return;
    }

    setIsSending(true);
    try {
      // 1. Save to Firestore feedback collection
      await addDoc(collection(db, 'feedback'), {
        category: feedbackCategory,
        message: feedbackText.trim(),
        userEmail: profile.email || 'anonymous',
        userName: profile.name || 'Anonim',
        createdAt: serverTimestamp(),
        status: 'new',
      });

      // 2. Also open mailto as fallback / direct email
      const subject = encodeURIComponent(`[Nutrino ${feedbackCategory}] Kullanıcı Geri Bildirimi`);
      const body = encodeURIComponent(
        `Kategori: ${feedbackCategory}\n` +
        `Kullanıcı: ${profile.name || 'Anonim'}\n` +
        `E-posta: ${profile.email || '-'}\n\n` +
        `Mesaj:\n${feedbackText.trim()}`
      );
      const mailUrl = `mailto:nutrinooapp@gmail.com?subject=${subject}&body=${body}`;

      setSubmitted(true);
      setFeedbackText('');

      Alert.alert(
        'Teşekkürler! 🎉',
        'Geri bildiriminiz kaydedildi. E-posta ile de göndermek ister misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          {
            text: 'E-posta Gönder',
            onPress: () => Linking.openURL(mailUrl).catch(() => {}),
          },
        ],
      );
    } catch (error) {
      console.error('Feedback save error:', error);
      // Fallback: just open mailto
      const subject = encodeURIComponent(`[Nutrino ${feedbackCategory}] Kullanıcı Geri Bildirimi`);
      const body = encodeURIComponent(`Mesaj:\n${feedbackText.trim()}`);
      const mailUrl = `mailto:nutrinooapp@gmail.com?subject=${subject}&body=${body}`;

      Alert.alert(
        'Geri Bildirim',
        'Kayıt sırasında hata oluştu. E-posta ile göndermek ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'E-posta Gönder',
            onPress: () => Linking.openURL(mailUrl).catch(() => {}),
          },
        ],
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleContact = () => {
    Linking.openURL('mailto:nutrinooapp@gmail.com?subject=Nutrino Destek').catch(() => {
      Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yardım</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* FAQ Section */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>❓ Sık Sorulan Sorular</Text>
          {FAQ_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              style={styles.faqItem}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqArrow}>
                  {expandedFaq === index ? '▲' : '▼'}
                </Text>
              </View>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback Form */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>📝 Geri Bildirim</Text>

          {/* Category Selection */}
          <View style={styles.categoryRow}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setFeedbackCategory(cat.value)}
                style={[
                  styles.categoryChip,
                  feedbackCategory === cat.value && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    feedbackCategory === cat.value && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.feedbackInput}
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="Düşüncelerinizi paylaşın..."
            placeholderTextColor={Colors.text.light}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <PrimaryButton
            title={isSending ? 'Gönderiliyor...' : submitted ? 'Gönderildi ✓' : 'Gönder'}
            onPress={handleSubmitFeedback}
            disabled={submitted || isSending}
          />
        </View>

        {/* Contact Section */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>📧 İletişim</Text>
          <Text style={styles.contactText}>
            Daha fazla yardıma mı ihtiyacınız var? Bize doğrudan ulaşabilirsiniz.
          </Text>
          <TouchableOpacity onPress={handleContact} style={styles.contactButton}>
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={styles.contactLabel}>nutrinooapp@gmail.com</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Nutrino v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Yapay Zeka ile Sağlıklı Beslenme</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  faqItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  faqArrow: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
  },
  faqAnswer: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  feedbackInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  contactText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  contactIcon: {
    fontSize: 20,
  },
  contactLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  appInfoText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.light,
  },
  appInfoSubtext: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    marginTop: 2,
  },
});
