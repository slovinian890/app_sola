import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { isLoggedIn, hasProfile } from '@/services/authService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is logged in
      const loggedIn = await isLoggedIn();
      const route = segments[0];

      if (!loggedIn) {
        // User not logged in, redirect to sign in
        if (route !== 'signin' && route !== 'verify') {
          router.replace('/signin');
        }
      } else {
        // User is logged in, check if they have profile
        const hasUserProfile = await hasProfile();
        
        if (!hasUserProfile) {
          // User needs to set up profile
          if (route !== 'profile') {
            router.replace('/(tabs)/profile');
          }
        } else {
          // User is fully set up
          if (route === 'signin' || route === 'verify') {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/signin');
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.running} />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});

