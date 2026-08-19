import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingChoice, OnboardingStep } from '@/components/onboarding/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { BodyPresetDescriptions, BodyPresetIds, BodyPresetLabels } from '@/config/body-presets';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';
import { useTheme } from '@/hooks/use-theme';
import {
  BodyFatPercentRange,
  SkeletalMuscleRangeKg,
  validateOptionalNumber,
} from '@/utils/profile-validation';

/**
 * 온보딩 03 — 현재 몸 상태.
 *
 * V1에서 체형 분석을 하지 않는다. 여기서 고르는 건 기존 BodyPresetId 하나뿐이고,
 * 이 값은 실제로 쓰인다 — UserProfile.bodyPresetId로 저장돼 설정의 [현재 체형]에 보이고,
 * 함께 정해지는 bodyParameters(size/tone)가 캐릭터 실루엣을 그린다. 그래서 이 단계를
 * 생략하지 않았다.
 *
 * 체지방률/골격근량은 순수 선택 입력이다. 모르면 그냥 넘어가고, 아는 사람만 넣는다 —
 * 지금은 전부 사용자가 직접 넣은 값(SELF_REPORTED)이고 앱이 추정하지 않는다.
 * TODO(body-source): InBody / Health Connect / 웨어러블 연동이 생기면 이 영역에
 * "어디서 가져올까요?" 선택을 붙이고 BodyHistoryEntry.source로 구분한다.
 */
export default function OnboardingCurrentBodyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { draft, setBodyPreset, setBodyFatPercent, setSkeletalMuscleKg } = useOnboardingDraft();
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const fat = validateOptionalNumber(draft.bodyFatPercent, BodyFatPercentRange, '체지방률');
    if (!fat.ok) {
      setError(fat.error);
      return;
    }
    const muscle = validateOptionalNumber(draft.skeletalMuscleKg, SkeletalMuscleRangeKg, '골격근량');
    if (!muscle.ok) {
      setError(muscle.error);
      return;
    }
    setError(null);
    router.push('/goal');
  };

  return (
    <OnboardingStep
      step={2}
      title="지금 몸은 어떤가요?"
      subtitle="정확하지 않아도 괜찮아요. 캐릭터 시작 모습에만 쓰여요."
      footer={<PrimaryButton label="다음" variant="gold" size="large" onPress={handleNext} />}>
      {BodyPresetIds.map((presetId) => (
        <OnboardingChoice
          key={presetId}
          label={BodyPresetLabels[presetId]}
          description={BodyPresetDescriptions[presetId]}
          selected={draft.bodyPresetId === presetId}
          onPress={() => setBodyPreset(presetId)}
        />
      ))}

      {/* 선택 입력. 접혀 있는 게 기본이라 모르는 사람의 진행을 막지 않는다. */}
      {detailOpen ? (
        <View style={styles.detailBlock}>
          <ThemedText type="sectionTitle">알고 있는 수치 (선택)</ThemedText>
          <TextField
            label="체지방률 (%)"
            keyboardType="numeric"
            inputMode="numeric"
            value={draft.bodyFatPercent}
            onChangeText={(text) => {
              setBodyFatPercent(text);
              if (error) setError(null);
            }}
            placeholder="예: 18.4"
          />
          <TextField
            label="골격근량 (kg)"
            keyboardType="numeric"
            inputMode="numeric"
            value={draft.skeletalMuscleKg}
            onChangeText={(text) => {
              setSkeletalMuscleKg(text);
              if (error) setError(null);
            }}
            placeholder="예: 33.1"
          />
          <ThemedText type="caption" themeColor="textSecondary">
            인바디 등에서 직접 잰 값만 넣어요. 몰라도 괜찮아요 — 비워두면 저장하지 않아요.
          </ThemedText>
          {error && (
            <ThemedText type="small" style={{ color: theme.mutedRed }}>
              {error}
            </ThemedText>
          )}
        </View>
      ) : (
        <Pressable onPress={() => setDetailOpen(true)} hitSlop={8} style={styles.detailToggle}>
          <ThemedText type="smallBold" style={{ color: theme.gold }}>
            체지방률·골격근량을 알고 있나요?
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            몰라도 괜찮아요. 나중에 히스토리에서 넣을 수 있어요.
          </ThemedText>
        </Pressable>
      )}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  detailBlock: {
    gap: Spacing.two,
  },
  detailToggle: {
    gap: 1,
    paddingVertical: Spacing.two,
  },
});
