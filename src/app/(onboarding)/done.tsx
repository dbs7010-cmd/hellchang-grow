import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BodyGoalOnboardingCopy } from '@/config/body-goals';
import { BodyPresetLabels } from '@/config/body-presets';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';
import { useTheme } from '@/hooks/use-theme';
import {
  BodyFatPercentRange,
  HeightRangeCm,
  SkeletalMuscleRangeKg,
  WeightRangeKg,
  validateOptionalNumber,
  validateRequiredNumber,
} from '@/utils/profile-validation';

/**
 * 온보딩 05 — 완료.
 *
 * 고른 값을 그대로 되짚어 주고 한 번에 저장한다. 여기서 AI/구독/광고 이야기는 하지 않는다.
 * 저장은 기존 completeOnboarding() 한 경로만 쓴다 — 온보딩 전용 저장소를 만들지 않는다.
 * 저장이 끝나면 onboardingComplete 플래그가 켜지고, 루트의 Stack.Protected가 홈으로 넘긴다.
 */
export default function OnboardingDoneScreen() {
  const theme = useTheme();
  const { draft } = useOnboardingDraft();
  const { completeOnboarding } = useAppData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goal = draft.bodyGoal;

  const handleStart = async () => {
    // 각 단계에서 이미 검증했지만, 저장 직전에 한 번 더 확인한다 —
    // 뒤로 갔다 오는 경로가 있어도 잘못된 값이 저장되지 않게.
    // 항목별로 하나씩 걸러야 타입이 좁혀지고, 어디가 잘못됐는지도 그대로 알려줄 수 있다.
    const height = validateRequiredNumber(draft.heightCm, HeightRangeCm, '키');
    if (!height.ok) return setError(height.error);
    const weight = validateRequiredNumber(draft.weightKg, WeightRangeKg, '체중');
    if (!weight.ok) return setError(weight.error);
    if (!goal) return setError('운동 목표를 골라주세요.');
    const fat = validateOptionalNumber(draft.bodyFatPercent, BodyFatPercentRange, '체지방률');
    if (!fat.ok) return setError(fat.error);
    const muscle = validateOptionalNumber(draft.skeletalMuscleKg, SkeletalMuscleRangeKg, '골격근량');
    if (!muscle.ok) return setError(muscle.error);

    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({
        profile: {
          genderExpression: draft.genderExpression,
          bodyPresetId: draft.bodyPresetId,
          bodyParameters: draft.bodyParameters,
          heightCm: height.value,
          weightKg: weight.value,
          bodyGoal: goal,
          setupMethod: draft.setupMethod,
        },
        bodyFatPercent: fat.value,
        skeletalMuscleKg: muscle.value,
      });
    } catch {
      setSubmitting(false);
      setError('저장하지 못했어요. 다시 시도해주세요.');
    }
  };

  return (
    <OnboardingStep
      step={4}
      title="준비 완료"
      subtitle="이대로 시작할게요. 전부 나중에 바꿀 수 있어요."
      footer={
        <PrimaryButton
          label="헬창키우기 시작"
          variant="gold"
          size="large"
          disabled={submitting || !goal}
          onPress={handleStart}
        />
      }>
      {goal && (
        <ThemedView type="backgroundElement" style={[styles.goalCard, { borderColor: theme.gold }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            내 목표
          </ThemedText>
          <View style={styles.goalRow}>
            <ThemedText style={styles.goalIcon}>{BodyGoalOnboardingCopy[goal].icon}</ThemedText>
            <ThemedText type="heading" style={{ color: theme.gold }}>
              {BodyGoalOnboardingCopy[goal].label}
            </ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {BodyGoalOnboardingCopy[goal].description}
          </ThemedText>
        </ThemedView>
      )}

      <View style={styles.summary}>
        <SummaryLine label="성별" value={draft.genderExpression === 'female' ? '여성' : '남성'} />
        <SummaryLine label="키 / 체중" value={`${draft.heightCm}cm / ${draft.weightKg}kg`} />
        <SummaryLine label="현재 체형" value={BodyPresetLabels[draft.bodyPresetId]} />
        {draft.bodyFatPercent.trim() !== '' && (
          <SummaryLine label="체지방률" value={`${draft.bodyFatPercent}%`} />
        )}
        {draft.skeletalMuscleKg.trim() !== '' && (
          <SummaryLine label="골격근량" value={`${draft.skeletalMuscleKg}kg`} />
        )}
      </View>

      {error && (
        <ThemedText type="small" style={{ color: theme.mutedRed }}>
          {error}
        </ThemedText>
      )}
    </OnboardingStep>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalIcon: {
    fontSize: 24,
  },
  summary: {
    gap: Spacing.two,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
