import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const APP_EMAIL = 'nutrinooapp@gmail.com';
const PRIVACY_LAST_UPDATE = '11 Şubat 2025';

type Tab = 'contact' | 'privacy';

export default function ContactPrivacyScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurunuz.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }
    setSending(true);
    try {
      const subject = encodeURIComponent(`İletişim Formu - ${name}`);
      const body = encodeURIComponent(`Ad: ${name}\nE-posta: ${email}\n\nMesaj:\n${message}`);
      await Linking.openURL(`mailto:${APP_EMAIL}?subject=${subject}&body=${body}`);
      setName('');
      setEmail('');
      setMessage('');
      Alert.alert('Teşekkürler!', 'Mesajınız başarıyla oluşturuldu.');
    } catch {
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyiniz.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İletişim & Gizlilik</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'contact' && styles.tabBtnActive]}
            onPress={() => setActiveTab('contact')}
          >
            <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
              📬 İletişim
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'privacy' && styles.tabBtnActive]}
            onPress={() => setActiveTab('privacy')}
          >
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
              🔒 Gizlilik
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'contact' ? (
          <>
            {/* Contact Info */}
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.cardTitle}>📧 Bize Ulaşın</Text>
              <Text style={styles.cardDesc}>
                Soru, öneri veya şikayetleriniz için aşağıdaki formu
                doldurabilir veya doğrudan e-posta gönderebilirsiniz.
              </Text>
              <TouchableOpacity
                style={styles.emailBtn}
                onPress={() => Linking.openURL(`mailto:${APP_EMAIL}`)}
              >
                <Text style={styles.emailBtnText}>✉️ {APP_EMAIL}</Text>
              </TouchableOpacity>
            </View>

            {/* Contact Form */}
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.cardTitle}>📝 İletişim Formu</Text>
              <Text style={styles.inputLabel}>Adınız</Text>
              <TextInput
                style={styles.input}
                placeholder="Adınızı giriniz"
                placeholderTextColor="#555"
                value={name}
                onChangeText={setName}
              />
              <Text style={styles.inputLabel}>E-posta Adresiniz</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@mail.com"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Mesajınız</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mesajınızı buraya yazınız..."
                placeholderTextColor="#555"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={sending}
              >
                <Text style={styles.sendBtnText}>
                  {sending ? 'Gönderiliyor...' : 'Gönder'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Social / FAQ Section */}
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.cardTitle}>❓ Sıkça Sorulan Sorular</Text>
              <FAQItem
                q="Kalori hesaplaması nasıl yapılıyor?"
                a="Yapay zeka modelimiz fotoğraftaki yiyeceği tanımlayıp, porsiyon büyüklüğüne göre besin değerlerini hesaplar."
              />
              <FAQItem
                q="Verilerim güvende mi?"
                a="Tüm verileriniz Firebase altyapısında şifreli olarak saklanır ve üçüncü taraflarla paylaşılmaz."
              />
              <FAQItem
                q="Hedef kiloma nasıl ulaşabilirim?"
                a="Profil ayarlarınızdan hedef kilonuzu belirledikten sonra, günlük kalori hedefiniz otomatik hesaplanır."
              />
            </View>
          </>
        ) : (
          <>
            {/* Privacy Policy */}
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.cardTitle}>🔒 Gizlilik Politikası</Text>
              <Text style={styles.updateDate}>Son güncelleme: {PRIVACY_LAST_UPDATE}</Text>

              <PolicySection
                title="1. Toplanan Veriler"
                text="Uygulamamız aşağıdaki verileri toplar ve işler:\n• Hesap bilgileri (ad, e-posta, yaş, cinsiyet)\n• Fiziksel bilgiler (boy, kilo, aktivite seviyesi)\n• Yemek fotoğrafları ve besin kayıtları\n• Kilo takip verileri\n• Uygulama kullanım istatistikleri"
              />
              <PolicySection
                title="2. Verilerin Kullanımı"
                text="Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılır:\n• Kişiselleştirilmiş kalori ve diyet önerileri\n• Yemek tanıma ve besin analizi\n• Kilo ve sağlık takibi\n• Uygulama performansının iyileştirilmesi"
              />
              <PolicySection
                title="3. Veri Güvenliği"
                text="Verileriniz Google Firebase altyapısında, endüstri standartlarında şifreleme ile korunmaktadır. Yetkisiz erişime karşı güvenlik önlemleri uygulanmaktadır."
              />
              <PolicySection
                title="4. Üçüncü Taraflar"
                text="Kişisel verileriniz hiçbir üçüncü taraf ile ticari amaçlı paylaşılmaz. Yalnızca hizmet sağlayıcılarımız (Firebase, AI modelleri) ile teknik gereklilikler doğrultusunda paylaşılır."
              />
              <PolicySection
                title="5. Veri Silme Hakkı"
                text="Hesabınızı ve tüm verilerinizi istediğiniz zaman silme hakkına sahipsiniz. Silme talebinizi uygulama içinden veya e-posta ile iletebilirsiniz."
              />
              <PolicySection
                title="6. Çerezler ve İzleme"
                text="Mobil uygulamamız çerez kullanmaz. Yalnızca anonim kullanım istatistikleri iyileştirme amacıyla toplanabilir."
              />
              <PolicySection
                title="7. İletişim"
                text={`Gizlilik politikamız ile ilgili sorularınız için:\n${APP_EMAIL} adresinden bize ulaşabilirsiniz.`}
              />
            </View>

            {/* KVKK */}
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.cardTitle}>📋 KVKK Aydınlatma Metni</Text>
              <Text style={styles.policyText}>
                6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel
                verileriniz veri sorumlusu sıfatıyla tarafımızca işlenmektedir.{'\n\n'}
                Kişisel verileriniz; hizmetlerimizin sunulması, iyileştirilmesi ve yasal
                yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.{'\n\n'}
                KVKK kapsamındaki haklarınızı kullanmak için {APP_EMAIL} adresine
                başvurabilirsiniz.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen(!open)}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{q}</Text>
        <Text style={styles.faqArrow}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

function PolicySection({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.policySection}>
      <Text style={styles.policySectionTitle}>{title}</Text>
      <Text style={styles.policyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['4xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.base, color: '#aaa', fontWeight: '500' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.primary[500] },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', marginBottom: Spacing.sm },
  cardDesc: { fontSize: FontSize.sm, color: '#999', lineHeight: 22, marginBottom: Spacing.md },
  emailBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  emailBtnText: { fontSize: FontSize.sm, color: Colors.primary[400], fontWeight: '600' },
  inputLabel: { fontSize: FontSize.sm, color: '#aaa', fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: { height: 120 },
  sendBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  sendBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  faqItem: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingVertical: Spacing.md,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: FontSize.sm, color: '#ccc', fontWeight: '600', flex: 1 },
  faqArrow: { fontSize: FontSize.xs, color: '#666', marginLeft: Spacing.sm },
  faqA: { fontSize: FontSize.xs, color: '#888', lineHeight: 20, marginTop: Spacing.xs },
  updateDate: { fontSize: FontSize.xs, color: '#666', marginBottom: Spacing.lg },
  policySection: { marginBottom: Spacing.lg },
  policySectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#ddd', marginBottom: 6 },
  policyText: { fontSize: FontSize.xs, color: '#999', lineHeight: 20 },
});
