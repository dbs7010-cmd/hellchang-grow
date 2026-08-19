import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';
import { useTheme } from '@/hooks/use-theme';
import { GenderExpression } from '@/types/user';
import { HeightRangeCm, WeightRangeKg, validateRequiredNumber } from '@/utils/profile-validation';

const GENDER_OPTIONS: { id: GenderExpression; label: string }[] = [
  { id: 'male', label: '남성' },
  { id: 'female', label: '여성' },
];

/**
 * 온보딩 02 — 기본 정보 (성별 / 키 / 체중).
 *
 * 성별은 캐릭터 표현과 추천 컨텍스트의 여러 신호 중 하나일 뿐이다 — 이 값 하나로 목표나
 * 운동을 갈라놓지 않는다 (buildRecommendationContext 참고). 그래서 문구도 성별에 따라
 * 다른 약속을 하지 않는다.
 */
export default function OnboardingBasicsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { draft, setGenderExpression, setHeightCm, setWeightKg } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const height = validateRequiredNumber(draft.heightCm, HeightRangeCm, '키');
    if (!height.ok) {
      setError(height.error);
      return;
    }
    const weight = validateRequiredNumber(draft.weightKg, WeightRangeKg, '체중');
    if (!weight.ok) {
      setError(weight.error);
      return;
    }
    setError(null);
    router.push('/current-body');
  };

  return (
    <OnboardingStep
      step={1}
      title="기본 정보를 알려주세요"
      subtitle="기록과 캐릭터 표현에 쓰여요. 나중에 설정에서 바꿀 수 있어요."
      footer={<PrimaryButton label="다음" variant="gold" size="large" onPress={handleNext} />}>
      <View style={styles.block}>
        <ThemedText type="sectionTitle">성별</ThemedText>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((option) => (
            <PrimaryButton
              key={option.id}
              label={option.label}
              variant={draft.genderExpression === option.id ? 'gold' : 'secondary'}
              style={styles.genderButton}
              onPress={() => setGenderExpression(option.id)}
            />
          ))}
        </View>
      </View>

      <TextField
        label={`키 (cm)`}
        keyboardType="numeric"
        inputMode="numeric"
        value={draft.heightCm}
        onChangeText={(text) => {
          setHeightCm(text);
          if (error) setError(null);
        }}
        placeholder="예: 175"
        returnKeyType="next"
      />

      <TextField
        label="현재 체중 (kg)"
        keyboardType="numeric"
        inputMode="numeric"
        value={draft.weightKg}
        onChangeText={(text) => {
          setWeightKg(text);
          if (error) setError(null);
        }}
        placeholder="예: 70"
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />

      {/* 입력 중에는 경고를 띄우지 않는다 — [다음]을 눌렀을 때만 한 줄로 알려준다. */}
      {error && (
        <ThemedText type="small" style={{ color: theme.mutedRed }}>
          {error}
        </ThemedText>
      )}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  genderButton: {
    flex: 1,
  },
});
