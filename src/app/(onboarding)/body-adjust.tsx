import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { Stepper } from '@/components/ui/stepper';
import { TextField } from '@/components/ui/text-field';
import { useAppData } from '@/context/app-data-context';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';

export default function BodyAdjustScreen() {
  const { draft, setBodyParameters, setWeightKg, setHeightCm } = useOnboardingDraft();
  const { completeOnboarding } = useAppData();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    const weightKg = Number(draft.weightKg);
    if (!draft.weightKg || Number.isNaN(weightKg) || weightKg <= 0) {
      setError('체중을 숫자로 입력해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({
        profile: {
          genderExpression: draft.genderExpression,
          bodyPresetId: draft.bodyPresetId,
          bodyParameters: draft.bodyParameters,
          weightKg,
          heightCm: draft.heightCm ? Number(draft.heightCm) : undefined,
          setupMethod: draft.setupMethod,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">체형을 조절해주세요</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        지금은 보정값만 저장돼요. 실제 모습 반영은 이후 업데이트에서 제공할 예정이에요.
      </ThemedText>

      <SectionCard>
        <Stepper
          label="체형 크기"
          value={draft.bodyParameters.size}
          onChange={(size) => setBodyParameters({ ...draft.bodyParameters, size })}
        />
        <Stepper
          label="근육 톤"
          value={draft.bodyParameters.tone}
          onChange={(tone) => setBodyParameters({ ...draft.bodyParameters, tone })}
        />
      </SectionCard>

      <SectionCard>
        <TextField
          label="체중 (kg)"
          keyboardType="numeric"
          value={draft.weightKg}
          onChangeText={setWeightKg}
          placeholder="예: 70"
        />
        <TextField
          label="키 (cm, 선택)"
          keyboardType="numeric"
          value={draft.heightCm}
          onChangeText={setHeightCm}
          placeholder="예: 170"
        />
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
      </SectionCard>

      <PrimaryButton label="시작하기" onPress={handleStart} disabled={submitting} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#D64545',
  },
});
