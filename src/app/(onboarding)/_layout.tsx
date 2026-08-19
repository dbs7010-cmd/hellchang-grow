import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { OnboardingDraftProvider } from '@/context/onboarding-draft-context';

export default function OnboardingLayout() {
  const colors = Colors.dark;

  return (
    <OnboardingDraftProvider>
      <Stack
        screenOptions={{
          // 각 단계가 OnboardingStep 안에서 진행 표시 + 뒤로가기를 직접 그린다.
          // 네이티브 헤더를 켜두면 빈 헤더 바와 뒤로가기 버튼이 이중으로 생긴다.
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </OnboardingDraftProvider>
  );
}
