import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { isLoading, hasCompletedOnboarding, isAuthenticated } = useUser();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  // Route based on user state
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
