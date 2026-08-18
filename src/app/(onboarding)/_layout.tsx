import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { OnboardingDraftProvider } from '@/context/onboarding-draft-context';

export default function OnboardingLayout() {
  const colors = Colors.dark;

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
