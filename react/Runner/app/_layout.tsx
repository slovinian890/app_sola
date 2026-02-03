import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDemoData } from '@/services/dataService';
import AuthGuard from '@/components/auth-guard';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize demo data on app start
    initializeDemoData();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="signin" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="verify" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthGuard>
    </ThemeProvider>
  );
}
