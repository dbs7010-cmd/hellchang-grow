/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GROWTH BALANCE CONFIG — 성장 계산의 모든 튜닝 숫자가 있는 단 하나의 자리
 *
 * 계산 코드(`utils/growth-calculation.ts`, `utils/growth-state.ts`)에는 숫자를 직접
 * 쓰지 않는다. 밸런스를 바꾸고 싶으면 이 파일만 고친다 (`app-config.ts`가 제품 상수를
 * 모으는 것과 같은 규칙이며, 표 형태의 밸런스 값이 많아 도메인 파일로 분리했다).
 *
 * 여기 있는 값은 전부 **게임 밸런스 초기값**이다. 의학적/생체역학적 기준이 아니며,
 * 사용자의 실제 신체 수치(체중/체지방률/골격근량)를 만들거나 바꾸지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const GrowthConfig = {
  /** 1RM 추정 */
  oneRepMax: {
    /**
     * Epley 계수. 1RM ≈ weight × (1 + reps / epleyDivisor).
     * 정밀 모델을 쓰지 않는다 — 상대 강도 구간을 나눌 수 있을 정도면 충분하다.
     */
    epleyDivisor: 30,
    /**
     * 이 반복수를 넘으면 1RM 추정을 하지 않는다. 20회 넘게 든 무게로 1RM을 역산하면
     * 실제와 크게 어긋나고, 그 값이 그대로 강도 보정에 들어가면 밸런스가 무너진다.
     */
    maxReliableReps: 15,
  },

  /** 부하 계산 */
  load: {
    /**
     * 맨몸 운동 부하를 계산해야 하는데 체중을 모를 때 쓰는 값(kg).
     * 계산 입력으로만 쓰이며 신체 기록에 절대 저장되지 않는다 — 실제 체중은
     * 사용자 입력이나 신뢰 가능한 측정 소스에서만 온다.
     */
    assumedBodyWeightKg: 70,
    /** 이 값을 넘는 세트 중량은 오입력으로 보고 잘라낸다 (600kg 벤치는 SP 폭증 금지). */
    maxPlausibleWeightKg: 500,
  },

  /** 맨몸 운동에서 체중의 몇 배가 걸리는지 (동작 패턴별 기본값) */
  bodyWeightLoadFactors: {
    /** 풀업/친업 — 체중 거의 전부 */
    verticalPull: 1,
    /** 딥스 — 체중 대부분 */
    verticalPress: 0.95,
    /** 푸쉬업 — 체중의 일부만 손에 실린다 */
    horizontalPress: 0.65,
    /** 맨몸 스쿼트/런지 계열 */
    lowerBody: 0.6,
    /** 플랭크/크런치 등 */
    core: 0.5,
    /** 버피 등 */
    cardio: 0.5,
    /** 그 밖(중량 운동 포함, 실제로는 쓰이지 않음) */
    default: 0.7,
  },

  /**
   * 상대 강도(=부하 / 추정 1RM) 구간별 자극 배수. 위에서부터 훑어 처음 맞는 구간을 쓴다.
   * 90% 이상에서 배수를 더 키우지 않는 것이 의도다 — 무리한 중량이 SP 폭증으로
   * 이어지면 게임이 위험한 운동을 유도하게 된다.
   */
  intensityBands: [
    { minRatio: 0.9, multiplier: 1.25 },
    { minRatio: 0.8, multiplier: 1.15 },
    { minRatio: 0.65, multiplier: 1 },
    { minRatio: 0.5, multiplier: 0.85 },
    { minRatio: 0.3, multiplier: 0.6 },
    { minRatio: 0, multiplier: 0.35 },
  ],
  intensity: {
    /** 1RM을 추정할 수 없을 때(기록 부족/맨몸 시간 종목) 쓰는 중립 배수 */
    unknownOneRepMax: 0.8,
    /** 상대 강도는 이 값에서 잘린다. 1RM보다 훨씬 무거운 입력이 무한 보너스가 되지 않게. */
    maxRatio: 1.1,
  },

  /** 반복수 → 자극 (선형이 아니라 포화한다) */
  reps: {
    /**
     * 한 세트에서 인정하는 유효 반복의 상한. 1kg × 1000회를 넣어도 여기서 멈춘다.
     * effectiveReps = maxEffectiveReps × (1 − e^(−reps / saturationScale))
     */
    maxEffectiveReps: 12,
    saturationScale: 6,
  },

  /** 같은 부위를 계속 자극할 때의 효율 감소 (세션 안에서 누적) */
  fatigue: {
    /** 유효 세트 1회당 감소 계수. 클수록 빨리 떨어진다. */
    decayPerSet: 0.12,
    /** 아무리 많이 해도 이 아래로는 떨어지지 않는다 — 정상 고볼륨을 과하게 처벌하지 않는다. */
    minMultiplier: 0.4,
  },

  /** SP 환산 */
  sp: {
    /** 유효 반복 1회당 기본 SP. 전체 성장 속도를 한 번에 조절하는 손잡이다. */
    perEffectiveRep: 1,
    /** 소수점 자리수 (저장값이 끝없이 길어지지 않게) */
    decimals: 2,
  },

  /** 하루 상한 — 끊지 않고 효율을 떨어뜨린다 */
  dailyCap: {
    /** 부위별 하루 SP가 이 값을 넘어가면 */
    softCapSpPerMuscle: 400,
    /** 초과분은 이 효율로만 쌓인다 */
    overflowEfficiency: 0.25,
  },

  /** 결과 화면 연출용 pump (저장하지 않는 일시값) */
  pump: {
    /** 피로도/하루 상한을 적용하기 전의 자극에 곱한다 — 많이 한 날은 크게 부푼다. */
    multiplier: 1,
    /** 표시가 과해지지 않도록 부위별 상한 */
    maxPerMuscle: 100,
  },

  /**
   * 성장 단계 threshold — 부위별 누적 SP가 이 값을 넘으면 그 stage가 된다.
   * 비선형이다: 0→1은 첫 주에 닿도록 빠르게, 그 뒤로는 점점 느려지고, 5는 장기 목표다.
   * stage는 SP를 대체하지 않는다 — SP는 계속 쌓이고 stage는 여기서 다시 계산된다.
   * (그래서 이 값을 바꾸면 기존 사용자의 stage도 즉시 재평가된다.)
   */
  stageThresholds: [0, 300, 1200, 3600, 9000, 20000],
  stage: {
    /**
     * 한 번의 운동으로 올라갈 수 있는 최대 단계 수. 한 세션에 2단계씩 뛰면
     * "운동했더니 갑자기 다른 몸"이 된다 — 넘친 SP는 그대로 남아 다음 세션에 반영된다.
     */
    maxStagesPerSession: 1,
  },
} as const;

/** stage의 최댓값 (0부터 시작하므로 threshold 개수 − 1) */
export const MaxMuscleStage = GrowthConfig.stageThresholds.length - 1;
