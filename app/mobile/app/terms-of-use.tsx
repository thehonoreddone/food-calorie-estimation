import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme, getColors } from '@/contexts/ThemeContext';
import { useTranslation } from '@/i18n';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';

const APP_EMAIL = 'nutrinooapp@gmail.com';

// ─── Terms Data ─────────────────────────────────────────────────────────────

interface TermsSection { title: string; text: string }

const TERMS_TR: TermsSection[] = [
  { title: '1. Kabul Koşulları', text: 'Nutrino uygulamasını ("Uygulama") indirerek, yükleyerek veya kullanarak bu Kullanım Koşullarını kabul etmiş sayılırsınız. Koşulları kabul etmiyorsanız uygulamayı kullanmayınız.' },
  { title: '2. Hizmet Tanımı', text: 'Nutrino, yapay zeka destekli beslenme takibi ve kalori hesaplama uygulamasıdır. Fotoğraf analizi, manuel giriş, egzersiz takibi ve kişiselleştirilmiş diyet önerileri sunar.' },
  { title: '3. Kullanıcı Hesabı', text: '• Hesap oluştururken doğru ve güncel bilgi sağlamak kullanıcının sorumluluğundadır.\n• Hesap güvenliği (şifre gizliliği dahil) tamamen kullanıcının sorumluluğundadır.\n• 13 yaşından küçük bireyler uygulamayı kullanamazlar.\n• Hesabınızda tespit edilen yetkisiz kullanımı derhal bildirmelisiniz.' },
  { title: '4. Kullanım Kuralları', text: '• Uygulamayı yasa dışı amaçlarla kullanamazsınız.\n• Başka kullanıcıların hesaplarına erişemez veya erişmeye teşebbüs edemezsiniz.\n• Sistemi manipüle edemez, ters mühendislik yapamaz veya kötüye kullanamazsınız.\n• Otomatik veri toplama araçları (bot, spider vb.) kullanamazsınız.' },
  { title: '5. Besin ve Kalori Bilgileri', text: '• Uygulama tarafından sağlanan kalori ve besin değerleri tahmini niteliktedir.\n• Bu bilgiler tıbbi tavsiye yerine geçmez.\n• Diyabet, gıda alerjileri veya özel sağlık durumları için mutlaka doktorunuza danışınız.\n• Beslenme kararlarınızın sorumluluğu size aittir.' },
  { title: '6. Fikri Mülkiyet', text: '• Uygulamadaki tüm içerik, tasarım, logo, yazılım ve algoritmalar Nutrino\'ya aittir.\n• İzinsiz kopyalama, dağıtma veya değiştirme yasaktır.\n• Kullanıcı tarafından oluşturulan içerik (yemek fotoğrafları vb.) üzerindeki haklar kullanıcıya aittir.' },
  { title: '7. Sorumluluk Sınırlaması', text: '• Uygulama "olduğu gibi" (as-is) sunulmaktadır.\n• Belirli sağlık sonuçları garanti edilmez.\n• Uygulama kesintileri, veri kayıpları veya üçüncü taraf hizmet sorunlarından kaynaklanan zararlardan sorumlu tutulamayız.\n• Uygulama kullanımından doğan doğrudan veya dolaylı zararlardan azami yasal ölçüde sorumluluk reddedilir.' },
  { title: '8. Hesap Feshi', text: '• Kullanıcı hesabını istediği zaman silebilir.\n• Koşulların ihlali durumunda hesabınız önceden bildirimde bulunmaksızın askıya alınabilir veya silinebilir.\n• Hesap silme işlemi ile tüm verileriniz kalıcı olarak kaldırılır.' },
  { title: '9. Değişiklikler', text: '• Bu koşulları önceden bildirmeksizin değiştirme hakkını saklı tutarız.\n• Önemli değişiklikler uygulama içi bildirimle duyurulur.\n• Değişiklik sonrası uygulamayı kullanmaya devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.' },
  { title: '10. Uygulanacak Hukuk', text: 'Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.' },
  { title: '11. İletişim', text: `Kullanım koşulları hakkında sorularınız için:\n${APP_EMAIL}\nadresinden bize ulaşabilirsiniz.` },
];

const TERMS_EN: TermsSection[] = [
  { title: '1. Acceptance of Terms', text: 'By downloading, installing, or using the Nutrino application ("App"), you agree to these Terms of Service. If you do not agree, please do not use the application.' },
  { title: '2. Service Description', text: 'Nutrino is an AI-powered nutrition tracking and calorie estimation application. It provides photo analysis, manual food logging, exercise tracking, and personalized diet recommendations.' },
  { title: '3. User Accounts', text: '• Users are responsible for providing accurate and up-to-date information when creating an account.\n• Account security (including password confidentiality) is the user\'s responsibility.\n• Individuals under 13 years of age may not use the application.\n• You must immediately report any unauthorized use of your account.' },
  { title: '4. Usage Rules', text: '• You may not use the App for any illegal purposes.\n• You may not access or attempt to access other users\' accounts.\n• You may not manipulate, reverse engineer, or misuse the system.\n• Automated data collection tools (bots, spiders, etc.) are prohibited.' },
  { title: '5. Nutritional Information', text: '• Calorie and nutritional values provided by the App are estimates.\n• This information does not replace medical advice.\n• Consult your doctor for diabetes, food allergies, or special health conditions.\n• You are responsible for your dietary decisions.' },
  { title: '6. Intellectual Property', text: '• All content, designs, logos, software, and algorithms in the App belong to Nutrino.\n• Unauthorized copying, distribution, or modification is prohibited.\n• User-generated content (food photos, etc.) rights remain with the user.' },
  { title: '7. Limitation of Liability', text: '• The App is provided "as-is" without warranties.\n• Specific health outcomes are not guaranteed.\n• We cannot be held liable for damages arising from app interruptions, data loss, or third-party service issues.\n• Liability for direct or indirect damages from App use is disclaimed to the maximum extent permitted by law.' },
  { title: '8. Account Termination', text: '• Users may delete their account at any time.\n• In case of Terms violations, your account may be suspended or deleted without prior notice.\n• Account deletion permanently removes all your data.' },
  { title: '9. Changes', text: '• We reserve the right to modify these terms without prior notice.\n• Significant changes will be announced via in-app notifications.\n• Continued use of the App after changes constitutes acceptance of the new terms.' },
  { title: '10. Governing Law', text: 'These terms are governed by the laws of the Republic of Turkey. Istanbul Courts and Enforcement Offices shall have jurisdiction over any disputes.' },
  { title: '11. Contact', text: `For questions about these terms of service:\n${APP_EMAIL}` },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function TermsOfUseScreen() {
  const { isDark } = useTheme();
  const { t, lang } = useTranslation();
  const C = getColors(isDark);
  const terms = lang === 'en' ? TERMS_EN : TERMS_TR;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <StatusBar style={C.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('terms.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Last update */}
        <Text style={[styles.updateDate, { color: C.textMuted }]}>{t('terms.lastUpdate')}</Text>

        {/* Terms Sections */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.surfaceBorder }]}>
          {terms.map((section, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: C.surfaceBorder }]} />}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{section.title}</Text>
                <Text style={[styles.sectionText, { color: C.textSecondary }]}>{section.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={[styles.footerCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.footerText, { color: C.textMuted }]}>
            {lang === 'en'
              ? `By using Nutrino, you acknowledge that you have read and agree to these Terms of Service.\n\n${APP_EMAIL}`
              : `Nutrino'yu kullanarak bu Kullanım Koşullarını okuduğunuzu ve kabul ettiğinizi beyan etmiş olursunuz.\n\n${APP_EMAIL}`
            }
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  updateDate: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: FontSize.xs,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  footerCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.xs,
    lineHeight: 20,
    textAlign: 'center',
  },
});
