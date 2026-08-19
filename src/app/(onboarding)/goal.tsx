import { useRouter } from 'expo-router';

import { OnboardingChoice, OnboardingStep } from '@/components/onboarding/onboarding-step';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BodyGoalIds, BodyGoalOnboardingCopy } from '@/config/body-goals';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';

/**
 * 온보딩 04 — 운동 목표. 온보딩에서 가장 중요한 한 화면이다.
 *
 * 기존 BodyGoalId(fat_cut / strength_up / balanced)를 그대로 쓰고, 단일 Primary Goal만
 * 고른다 (V1에서 복수 목표는 만들지 않는다).
 *
 * 고르지 않으면 다음으로 넘어갈 수 없다 — 조용히 balanced로 저장해버리지 않는다.
 * 남녀 모두 같은 세 가지를 본다. 성별에 따라 목표를 갈라놓지 않는다.
 */
export default function OnboardingGoalScreen() {
  const router = useRouter();
  const { draft, setBodyGoal } = useOnboardingDraft();

  return (
    <OnboardingStep
      step={3}
      title="어떤 몸을 만들고 싶나요?"
      subtitle="하나만 골라주세요. 언제든 설정에서 바꿀 수 있어요."
      footer={
        <PrimaryButton
          label="다음"
          variant="gold"
          size="large"
          disabled={draft.bodyGoal === null}
          onPress={() => router.push('/done')}
        />
      }>
      {BodyGoalIds.map((goal) => (
        <OnboardingChoice
          key={goal}
          icon={BodyGoalOnboardingCopy[goal].icon}
          label={BodyGoalOnboardingCopy[goal].label}
          description={BodyGoalOnboardingCopy[goal].description}
          selected={draft.bodyGoal === goal}
          onPress={() => setBodyGoal(goal)}
        />
      ))}
    </OnboardingStep>
  );
}
