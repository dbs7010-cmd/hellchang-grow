import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { resolveBootstrapScreen } from '@/utils/stored-state';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDataProvider, useAppData } from '@/context/app-data-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
  const screen = resolveBootstrapScreen({ loading, bootstrapFailed, onboardingComplete });

  if (screen === 'splash') return null;

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
        <Stack.Screen name="danbaek-world" />
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
