import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { RuntimeBuildIdentity, RuntimeBuildIdentityLabel } from '@/config/runtime-build-identity';
import { AppDataProvider, useAppData } from '@/context/app-data-context';

SplashScreen.preventAutoHideAsync();

if (__DEV__) {
  console.info('[runtime-build-identity]', RuntimeBuildIdentity);
}

export default function RootLayout() {
  // IRON GRAPHITE + WARM GOLD가 고정 캐논이라 네비게이션 chrome도 항상 다크로 맞춘다
  // (useTheme()이 시스템 설정과 무관하게 항상 Colors.dark를 쓰는 것과 동일한 이유).
  return (
    <ThemeProvider value={DarkTheme}>
      <AppDataProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
        {__DEV__ && <RuntimeIdentityBadge />}
      </AppDataProvider>
    </ThemeProvider>
  );
}

function RuntimeIdentityBadge() {
  return (
    <View pointerEvents="none" style={styles.runtimeIdentityBadge}>
      <Text numberOfLines={1} style={styles.runtimeIdentityText}>
        {RuntimeBuildIdentityLabel}
      </Text>
    </View>
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
        <Stack.Screen name="workout-start" />
        <Stack.Screen name="session" />
        <Stack.Screen name="pass" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="exercise-select" />
        <Stack.Screen name="exercise-detail" />
        <Stack.Screen name="routine-edit" />
        <Stack.Screen name="ai-chat" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  runtimeIdentityBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
  },
  runtimeIdentityText: {
    maxWidth: '100%',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    color: '#ffcf4a',
    fontSize: 9,
    fontWeight: '700',
  },
});
