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
  /**
   * 골격근량(kg). 인바디 등 외부 측정값을 사용자가 직접 넣는 자리다 —
   * 앱이 운동 기록으로부터 추정해서 채우지 않는다. 없으면 UI에서 '-'로 표시한다.
   */
  skeletalMuscleKg?: number;
  bodyPresetId?: string;
  bodyParameters?: BodyParameters;
  source: BodyHistorySource;
  photoReference?: string;
}
