export interface BodyParameters {
  /** 0-100, 체형 전체 볼륨 보정값 (placeholder, 시각적 반영은 이후 단계) */
  size: number;
  /** 0-100, 근육 톤/선명도 보정값 (placeholder, 시각적 반영은 이후 단계) */
  tone: number;
}

/**
 * 이 기록의 출처.
 *  - 'manual'    : 사용자가 직접 입력한 값 (= SELF_REPORTED)
 *  - 'photo'     : 사진과 함께 남긴 기록
 *  - 'future_ai' : AI 체형 분석 (미구현)
 *
 * TODO(body-source): 외부 측정 연동이 들어오면 INBODY / HEALTH_CONNECT / WEARABLE을
 * 여기에 추가하고, "직접 입력인가 측정값인가"를 구분할 verification 필드를 함께 만든다.
 * 지금은 연동이 하나도 없으므로 그 구조를 미리 만들지 않는다 — 온보딩/히스토리에서 들어오는
 * 체지방률·골격근량은 전부 'manual'(SELF_REPORTED)이다.
 */
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
