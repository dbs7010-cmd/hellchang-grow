export interface BodyParameters {
  /** 0-100, 체형 전체 볼륨 보정값 (placeholder, 시각적 반영은 이후 단계) */
  size: number;
  /** 0-100, 근육 톤/선명도 보정값 (placeholder, 시각적 반영은 이후 단계) */
  tone: number;
}

export type BodyHistorySource = 'manual' | 'photo' | 'future_ai';

export interface BodyHistoryEntry {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  bodyPresetId?: string;
  bodyParameters?: BodyParameters;
  source: BodyHistorySource;
  photoReference?: string;
}
