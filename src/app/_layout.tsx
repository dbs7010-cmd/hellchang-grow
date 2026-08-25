import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { AppDataProvider, useAppData } from '@/context/app-data-context';
import { resolveBootstrapScreen } from '@/utils/stored-state';

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
  const { loading, bootstrapFailed, onboardingComplete, reloadAppData } = useAppData();

  // 어떤 화면을 세울지는 순수 규칙이 정한다 (scripts/verify-storage-recovery.ts).
  const screen = resolveBootstrapScreen({ loading, bootstrapFailed, onboardingComplete });

  if (screen === 'splash') {
    return null;
  }

  /*
   * 저장된 데이터를 읽지 못한 채 부팅이 끝난 경우. 그냥 통과시키면 온보딩이 열리고,
   * 사용자가 그것을 완료하는 순간 멀쩡히 남아 있던 프로필과 기록을 덮어쓴다.
   * 그래서 진행시키지 않고, 있는 화면 부품으로 다시 시도할 기회만 준다.
   */
  if (screen === 'recovery') {
    return (
      <View style={styles.recovery}>
        <ThemedText type="heading">데이터를 불러오지 못했어요</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          저장된 기록은 그대로 있어요. 다시 시도해 주세요.
        </ThemedText>
        <PrimaryButton label="다시 시도" onPress={reloadAppData} />
      </View>
    );
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

const styles = StyleSheet.create({
  recovery: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
