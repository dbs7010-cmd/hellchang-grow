import { createContext, ReactNode, useContext, useState } from 'react';

import {
  BodyPresetDefaultParameters,
  BodyPresetId,
  DefaultBodyPresetId,
} from '@/config/body-presets';
import { BodyParameters } from '@/types/body';
import { GenderExpression, SetupMethod } from '@/types/user';

export interface OnboardingDraft {
  genderExpression: GenderExpression;
  bodyPresetId: BodyPresetId;
  bodyParameters: BodyParameters;
  weightKg: string;
  heightCm: string;
  setupMethod: SetupMethod;
  /** '내 사진으로 시작' 경로에서 고른 로컬 이미지 URI (source: 'photo' 온보딩 히스토리에 사용) */
  photoUri?: string;
}

interface OnboardingDraftContextValue {
  draft: OnboardingDraft;
  setGenderExpression: (value: GenderExpression) => void;
  setBodyPreset: (value: BodyPresetId) => void;
  setBodyParameters: (value: BodyParameters) => void;
  setWeightKg: (value: string) => void;
  setHeightCm: (value: string) => void;
  setPhotoUri: (value: string | undefined) => void;
}

const defaultDraft: OnboardingDraft = {
  genderExpression: 'male',
  bodyPresetId: DefaultBodyPresetId,
  bodyParameters: BodyPresetDefaultParameters[DefaultBodyPresetId],
  weightKg: '',
  heightCm: '',
  setupMethod: 'preset',
};

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);

  const value: OnboardingDraftContextValue = {
    draft,
    setGenderExpression: (value) => setDraft((prev) => ({ ...prev, genderExpression: value })),
    setBodyPreset: (value) =>
      setDraft((prev) => ({
        ...prev,
        bodyPresetId: value,
        bodyParameters: BodyPresetDefaultParameters[value],
      })),
    setBodyParameters: (value) => setDraft((prev) => ({ ...prev, bodyParameters: value })),
    setWeightKg: (value) => setDraft((prev) => ({ ...prev, weightKg: value })),
    setHeightCm: (value) => setDraft((prev) => ({ ...prev, heightCm: value })),
    setPhotoUri: (value) =>
      setDraft((prev) => ({
        ...prev,
        photoUri: value,
        setupMethod: value ? 'photo' : 'preset',
      })),
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
