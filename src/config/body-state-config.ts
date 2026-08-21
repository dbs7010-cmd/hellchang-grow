import type { MuscleGroupDetail } from '@/types/exercise';
import type { BodyShapeProfile } from '@/types/body-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BODY STATE BALANCE CONFIG — 단백이 몸 표현의 모든 튜닝 숫자
 *
 * `utils/body-state.ts`와 `utils/body-parameters.ts`에는 숫자를 직접 쓰지 않는다.
 * 표현 밸런스를 바꾸고 싶으면 이 파일만 고친다 (`growth-config.ts`가 성장 밸런스를
 * 모으는 것과 같은 규칙이며, 두 파일은 서로를 읽지 않는다 — 축이 다르다).
 *
 * 여기 있는 값은 전부 **게임 표현용**이다. 의학적 기준이 아니고, 실제 신체 수치를
 * 만들거나 바꾸지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BodyStateConfig = {
  /**
   * 근육 stage(0~5) → 시각적 크기(0~1). **선형이 아니다.**
   * 초반 변화는 미세하고, 후반으로 갈수록 폭이 커진다 — 마지막 단계는 평범한 운동
   * 체형이 아니라 과장된 단백이여야 하기 때문이다.
   */
  muscleStageVisualScale: [0, 0.08, 0.2, 0.4, 0.68, 1],

  /**
   * 전신 근육량 점수를 낼 때 부위별 가중치. 큰 근육이 실루엣을 더 많이 바꾼다 —
   * 팔만 키워서 전신 최대치가 되지 않게 한다. (합은 1이 아니어도 된다. 가중 평균이다.)
   */
  muscleMassWeights: {
    chest: 1.2,
    frontDelts: 0.5,
    sideDelts: 0.6,
    rearDelts: 0.4,
    biceps: 0.5,
    triceps: 0.5,
    lats: 1.1,
    upperBack: 0.9,
    abs: 0.5,
    glutes: 1,
    quads: 1.3,
    hamstrings: 0.9,
    calves: 0.4,
  } as Record<MuscleGroupDetail, number>,

  fat: {
    /**
     * 실제 입력된 체지방률(%) → fatStage. 위에서부터 훑어 처음 맞는 구간을 쓴다.
     * 성별로 다른 표를 강제하지 않는다 — 단백이 고유의 스타일화된 단계다.
     */
    percentBands: [
      { minPercent: 30, stage: 5 },
      { minPercent: 25, stage: 4 },
      { minPercent: 20, stage: 3 },
      { minPercent: 15, stage: 2 },
      { minPercent: 10, stage: 1 },
      { minPercent: 0, stage: 0 },
    ],
    /** 판단할 데이터가 아무것도 없을 때의 중립 단계 */
    defaultStage: 3,
    minStage: 0,
    maxStage: 5,
    /**
     * 실제 체지방률이 없을 때 쓰는 게임 추정 보정. 중립값에서 시작해 더하고 뺀다.
     * 이 값으로 만든 fatStage는 절대 "측정된 체지방률"로 표시되지 않는다.
     */
    estimate: {
      trend: { gaining: 1, stable: 0, losing: -1, unknown: 0 },
      nutrition: { poor: 1, normal: 0, good: -1, unknown: 0 },
      /** 추정에 쓸 최소 근거 개수. 하나(추세만/식단만)로는 추정하지 않고 중립을 쓴다. */
      minimumSignals: 2,
    },
  },

  /**
   * 체중 추세 판정. 하루 변동(식사/수분)에 반응하지 않도록 기간과 최소 기록 수를 둔다.
   */
  weightTrend: {
    /** 이 기간(일) 안의 기록만 본다 */
    windowDays: 21,
    /** 최소 이만큼의 기록이 있어야 판단한다 */
    minimumEntries: 2,
    /** 기간 내 변화량이 이 값(kg)을 넘어야 gaining/losing으로 본다 */
    significantChangeKg: 1,
  },

  definition: {
    /**
     * definition = leanness × (base + gain × muscleMassScore)
     *
     * base가 있으므로 마른 사람도 약간의 윤곽은 갖지만, 근육이 없으면 절대 강한
     * 데피니션이 나오지 않는다("마르기만 한 몸"과 "선명한 헬창"은 다르다).
     * leanness = 1 − fatStage / maxStage 이므로 지방이 높으면 근육이 많아도 가려진다.
     */
    base: 0.25,
    muscleGain: 0.75,
    maxStage: 5,
  },

  /** 체형 label 판정. 위에서부터 훑어 처음 맞는 것을 쓴다 (설명용 label일 뿐이다). */
  shapeProfiles: [
    { profile: 'massive', minMuscle: 0.8, minFat: 0.5 },
    { profile: 'muscular', minMuscle: 0.55, maxFat: 0.5 },
    { profile: 'bulky', minMuscle: 0.35, minFat: 0.6 },
    { profile: 'athletic', minMuscle: 0.3, maxFat: 0.6 },
    { profile: 'soft', minMuscle: 0, minFat: 0.55 },
    { profile: 'lean', minMuscle: 0, maxFat: 1 },
  ] as { profile: BodyShapeProfile; minMuscle: number; maxFat?: number; minFat?: number }[],

  parameters: {
    /** 어깨 폭은 측면 삼각근이 가장 많이 만든다 */
    shoulderWeights: { frontDelts: 0.35, sideDelts: 0.45, rearDelts: 0.2 },
    /** 등 너비는 광배, 두께는 상부 등이 주도한다 */
    backWidthWeights: { lats: 0.8, upperBack: 0.2 },
    backThicknessWeights: { lats: 0.35, upperBack: 0.65 },
    thighWeights: { quads: 0.6, hamstrings: 0.4 },
    armWeights: { biceps: 0.5, triceps: 0.5 },

    /** 전체 덩치에서 근육과 지방이 차지하는 비중 (근돼도 "크다"는 표현이 되도록) */
    overallMass: { muscle: 0.8, fat: 0.2 },
    /** 허리 두께: 지방이 주도하고 근육량이 조금 더한다 */
    waist: { base: 0.15, fat: 0.7, muscle: 0.15 },
    /**
     * 복부 선명도 = definition × (base + absMuscle × 복근 크기).
     * definition이 곱해지는 것이 핵심이다 — 복근을 아무리 키워도 지방에 덮여 있으면
     * 보이지 않는다("근돼"의 복근은 있지만 드러나지 않는다).
     */
    abdomen: { base: 0.5, absMuscle: 0.5 },
  },

  /**
   * 운동 직후 펌핑. **저장하지 않는 일시 보정**이며, 파라미터에 잠깐 얹었다 걷어낸다.
   * 앱을 다시 켜면 남아 있지 않다.
   */
  pump: {
    /** 이만큼의 pump 값이면 보정이 최대치에 도달한다 */
    referenceSp: 30,
    /** 부위 scale에 더해지는 최대 보정폭 */
    maxBoost: 0.08,
  },
} as const;
