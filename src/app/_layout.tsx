import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDataProvider, useAppData } from '@/context/app-data-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppDataProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </AppDataProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { loading, onboardingComplete } = useAppData();

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!onboardingComplete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingComplete}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session" />
      </Stack.Protected>
    </Stack>
  );
}
