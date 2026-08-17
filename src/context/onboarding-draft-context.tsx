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
}

interface OnboardingDraftContextValue {
  draft: OnboardingDraft;
  setGenderExpression: (value: GenderExpression) => void;
  setBodyPreset: (value: BodyPresetId) => void;
  setBodyParameters: (value: BodyParameters) => void;
  setWeightKg: (value: string) => void;
  setHeightCm: (value: string) => void;
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
