import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Animated Icon */}
          <Animated.View entering={FadeInDown.duration(800)} style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🍽️</Text>
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.Text entering={FadeInUp.delay(200).duration(600)} style={styles.title}>
            Sayfa Bulunamadı
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text entering={FadeInUp.delay(400).duration(600)} style={styles.subtitle}>
            Aradığın sayfa mevcut değil veya taşınmış olabilir.
          </Animated.Text>

          {/* Back to Home Button */}
          <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.buttonContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.replace('/(tabs)')}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>🏠  Ana Sayfaya Dön</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>← Geri Git</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 52,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
});
