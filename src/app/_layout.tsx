import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDataProvider, useAppData } from '@/context/app-data-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // IRON GRAPHITE + WARM GOLD가 고정 캐논이라 네비게이션 chrome도 항상 다크로 맞춘다
  // (useTheme()이 시스템 설정과 무관하게 항상 Colors.dark를 쓰는 것과 동일한 이유).
  return (
    <ThemeProvider value={DarkTheme}>
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
        <Stack.Screen name="workout-start" />
        <Stack.Screen name="session" />
        <Stack.Screen name="pass" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="exercise-select" />
        <Stack.Screen name="exercise-detail" />
        <Stack.Screen name="routine-edit" />
        <Stack.Screen name="ai-chat" />
        {/*
          단백세상에서 막혔을 때 스탠리가 설명하는 APP 화면. WORLD 화면이 아니다 —
          WORLD가 넘긴 block을 받아 실제 운동으로 되돌리는 자리다.
        */}
        <Stack.Screen name="danbaek-block" />
      </Stack.Protected>
    </Stack>
  );
}
