import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { OnboardingDraftProvider } from '@/context/onboarding-draft-context';

export default function OnboardingLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <OnboardingDraftProvider>
      <Stack
        screenOptions={{
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </OnboardingDraftProvider>
  );
}
