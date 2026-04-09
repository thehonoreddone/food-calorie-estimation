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

  // If user is already authenticated, skip onboarding entirely
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // Not authenticated: if onboarding not done, show onboarding first
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding/welcome" />;
  }

  // Onboarding done but not authenticated → login
  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
