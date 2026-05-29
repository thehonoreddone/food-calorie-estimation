import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { isLoading, hasCompletedOnboarding, isAuthenticated } = useUser();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (isLoading || hasNavigated) return;

    // Use router.replace so this index route is REMOVED from the stack.
    // This prevents the back button from returning to the decision screen.
    if (isAuthenticated && hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else if (isAuthenticated && !hasCompletedOnboarding) {
      router.replace('/onboarding/welcome');
    } else if (!hasCompletedOnboarding) {
      router.replace('/onboarding/welcome');
    } else {
      router.replace('/auth/login');
    }

    setHasNavigated(true);
  }, [isLoading, isAuthenticated, hasCompletedOnboarding, hasNavigated, router]);

  // Always show loading while deciding where to go
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
