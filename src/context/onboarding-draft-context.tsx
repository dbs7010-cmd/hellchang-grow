import { createContext, ReactNode, useContext, useState } from 'react';

import { BodyGoalId } from '@/config/body-goals';
import { BodyPresetDefaultParameters, BodyPresetId, DefaultBodyPresetId } from '@/config/body-presets';
import { BodyParameters } from '@/types/body';
import { GenderExpression, SetupMethod } from '@/types/user';

/**
 * 온보딩 중에만 사는 임시 form state.
 *
 * 여기에 중복 프로필 상태를 만들지 않는다 — 최종 저장은 마지막 단계에서
 * completeOnboarding() 한 번으로만 일어나고, 그 뒤 수정은 설정의 updateProfile()이 맡는다.
 */
export interface OnboardingDraft {
  genderExpression: GenderExpression;
  heightCm: string;
  weightKg: string;
  bodyPresetId: BodyPresetId;
  bodyParameters: BodyParameters;
  /**
   * 운동 목표. null은 "아직 안 고름"이다 — 조용히 기본값을 저장하지 않으려고
   * 일부러 optional이 아니라 명시적 null로 둔다.
   */
  bodyGoal: BodyGoalId | null;
  /** 선택 입력. 모르면 빈 문자열 그대로 두고 저장하지 않는다. */
  bodyFatPercent: string;
  skeletalMuscleKg: string;
  setupMethod: SetupMethod;
}

interface OnboardingDraftContextValue {
  draft: OnboardingDraft;
  setGenderExpression: (value: GenderExpression) => void;
  setHeightCm: (value: string) => void;
  setWeightKg: (value: string) => void;
  setBodyPreset: (value: BodyPresetId) => void;
  setBodyGoal: (value: BodyGoalId) => void;
  setBodyFatPercent: (value: string) => void;
  setSkeletalMuscleKg: (value: string) => void;
}

const defaultDraft: OnboardingDraft = {
  genderExpression: 'male',
  heightCm: '',
  weightKg: '',
  bodyPresetId: DefaultBodyPresetId,
  bodyParameters: BodyPresetDefaultParameters[DefaultBodyPresetId],
  bodyGoal: null,
  bodyFatPercent: '',
  skeletalMuscleKg: '',
  setupMethod: 'preset',
};

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);

  const value: OnboardingDraftContextValue = {
    draft,
    setGenderExpression: (value) => setDraft((prev) => ({ ...prev, genderExpression: value })),
    setHeightCm: (value) => setDraft((prev) => ({ ...prev, heightCm: value })),
    setWeightKg: (value) => setDraft((prev) => ({ ...prev, weightKg: value })),
    // 체형 프리셋은 캐릭터 실루엣이 쓰는 bodyParameters(size/tone)의 시작값도 함께 정한다.
    setBodyPreset: (value) =>
      setDraft((prev) => ({
        ...prev,
        bodyPresetId: value,
        bodyParameters: BodyPresetDefaultParameters[value],
      })),
    setBodyGoal: (value) => setDraft((prev) => ({ ...prev, bodyGoal: value })),
    setBodyFatPercent: (value) => setDraft((prev) => ({ ...prev, bodyFatPercent: value })),
    setSkeletalMuscleKg: (value) => setDraft((prev) => ({ ...prev, skeletalMuscleKg: value })),
  };

  return (
    <OnboardingDraftContext.Provider value={value}>{children}</OnboardingDraftContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingDraftContextValue {
  const context = useContext(OnboardingDraftContext);
  if (!context) {
    throw new Error('useOnboardingDraft must be used within OnboardingDraftProvider');
  }
  return context;
}
