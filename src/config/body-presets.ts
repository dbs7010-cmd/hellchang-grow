import { BodyParameters } from '@/types/body';

/**
 * 체형 프리셋 ID. 표시 문자열은 BodyPresetLabels에서 별도로 관리한다.
 * UI 표시 명칭은 추후 더 중립적인 표현으로 바뀔 수 있으므로 ID 자체는 바꾸지 않는다.
 */
export type BodyPresetId = 'lean' | 'balanced' | 'sturdy';

export const BodyPresetIds: BodyPresetId[] = ['lean', 'balanced', 'sturdy'];

export const BodyPresetLabels: Record<BodyPresetId, string> = {
  lean: '마른 편',
  balanced: '보통 체형',
  sturdy: '든든한 체형',
};

export const BodyPresetDescriptions: Record<BodyPresetId, string> = {
  lean: '전체적으로 가벼운 체형에서 시작해요.',
  balanced: '평균적인 체형에서 시작해요.',
  sturdy: '체격이 있는 체형에서 시작해요.',
};

export const BodyPresetDefaultParameters: Record<BodyPresetId, BodyParameters> = {
  lean: { size: 25, tone: 40 },
  balanced: { size: 50, tone: 45 },
  sturdy: { size: 75, tone: 40 },
};

export const DefaultBodyPresetId: BodyPresetId = 'balanced';
