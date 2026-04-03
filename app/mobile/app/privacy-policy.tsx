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
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Son güncelleme: 3 Nisan 2026</Text>

        <Section title="1. Hakkımızda">
          Nutrino, yemek fotoğraflarından kalori tahmini yapan bir mobil uygulamadır.
          Bu gizlilik politikası, kişisel verilerinizin nasıl toplandığını, kullanıldığını
          ve korunduğunu açıklar.
        </Section>

        <Section title="2. Topladığımız Veriler">
          {`• E-posta adresi ve kullanıcı adı (kayıt sırasında)
• Yemek fotoğrafları (analiz için gönderilir)
• Günlük beslenme verileri (öğünler, kaloriler)
• Fiziksel bilgiler (boy, kilo, yaş — kalori hesaplama için)
• Adım sayısı ve uyku verileri (Health Connect izni ile)
• Cihaz bilgileri ve crash raporları (Sentry ile)`}
        </Section>

        <Section title="3. Verilerin Kullanımı">
          {`Topladığımız veriler yalnızca aşağıdaki amaçlarla kullanılır:

• Kişiselleştirilmiş beslenme önerileri sunmak
• Kalori takibi ve sağlık hedefleri hesaplamak
• Yemek tanıma modelinin doğruluğunu artırmak
• Uygulama hatalarını tespit etmek ve düzeltmek
• Kullanıcı deneyimini iyileştirmek`}
        </Section>

        <Section title="4. Veri Paylaşımı">
          {`Kişisel verilerinizi üçüncü taraflarla paylaşmayız. Ancak aşağıdaki hizmet sağlayıcıları kullanıyoruz:

• Google Firebase (kimlik doğrulama ve veri depolama)
• Google Cloud (ML model işleme)
• Sentry (hata takibi)

Bu sağlayıcılar kendi gizlilik politikalarına tabidir.`}
        </Section>

        <Section title="5. Veri Güvenliği">
          {`Verilerinizi korumak için endüstri standardı güvenlik önlemleri uyguluyoruz:

• Firebase Authentication ile güvenli kimlik doğrulama
• HTTPS üzerinden şifreli veri aktarımı
• Firestore güvenlik kuralları ile veri izolasyonu
• Hassas bilgiler cihazda şifreli olarak saklanır (SecureStore)`}
        </Section>

        <Section title="6. Kullanıcı Hakları">
          {`Aşağıdaki haklara sahipsiniz:

• Verilerinize erişim talep etme
• Verilerinizin düzeltilmesini isteme
• Hesabınızı ve tüm verilerinizi silme (Profil → Hesabı Sil)
• Bildirim tercihlerinizi değiştirme
• Health Connect izinlerini iptal etme`}
        </Section>

        <Section title="7. Çerezler ve İzleme">
          Nutrino mobil uygulaması çerez kullanmaz. Analitik verileri anonim olarak
          toplanır ve kişisel kimlikle ilişkilendirilmez.
        </Section>

        <Section title="8. Çocukların Gizliliği">
          Uygulamamız 13 yaş altı çocuklara yönelik değildir. Bilerek 13 yaş altı
          kullanıcılardan kişisel veri toplamayız.
        </Section>

        <Section title="9. Değişiklikler">
          Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişikliklerde
          uygulama içi bildirim göndeririz. Güncel sürüm her zaman bu sayfada
          yayınlanacaktır.
        </Section>

        <Section title="10. İletişim">
          {`Gizlilik ile ilgili sorularınız için:
📧 nutrino.app@gmail.com`}
        </Section>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#fff',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  lastUpdated: {
    fontSize: FontSize.sm,
    color: '#666',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#eee',
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    fontSize: FontSize.sm,
    color: '#aaa',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
});
