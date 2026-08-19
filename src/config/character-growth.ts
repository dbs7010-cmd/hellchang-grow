/**
 * 캐릭터 성장 단계 (V1).
 *
 * ── 경계선 ──────────────────────────────────────────────────────────────────
 * 이 단계는 "게임 아바타가 어떤 모습으로 보이는가"만 정한다.
 * 사용자의 실제 신체 수치(체중/체지방률/골격근량)는 절대 이 값으로 바뀌지 않는다 —
 * 히스토리의 [몸 변화]가 보여주는 숫자는 지금도 앞으로도 사용자가 직접 입력한 값뿐이다.
 * (REAL BODY != GAME PROGRESSION)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * HELL PASS Lv와 성장 단계는 별개다. PASS XP는 성장 신호 중 하나일 뿐이고,
 * UI에서 "Lv.3 = stage3"처럼 묶어 보여주지 않는다.
 */
export type CharacterGrowthStage = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5';

export const CharacterGrowthStages: CharacterGrowthStage[] = [
  'stage1',
  'stage2',
  'stage3',
  'stage4',
  'stage5',
];

/** 데이터가 없을 때 돌려주는 안전한 기본 단계. 높게 추측하지 않는다. */
export const DefaultCharacterGrowthStage: CharacterGrowthStage = 'stage1';

/**
 * 성장 계산에 쓰는 신호. 각 신호는 "그 데이터가 실제로 있을 때만" 참여한다 —
 * 없는 신호는 0점이 아니라 계산에서 아예 빠지고, 남은 신호끼리 가중치를 다시 정규화한다.
 * 그래야 체지방률을 한 번도 입력하지 않은 사용자가 불이익을 받지 않는다.
 */
export type CharacterGrowthSignal =
  /** 누적 총 볼륨(kg) — 얼마나 무겁게, 많이 들었나 */
  | 'workoutVolume'
  /** 누적 운동 세션 수 — 얼마나 꾸준히 했나 */
  | 'workoutSessions'
  /** HELL PASS 누적 XP — 게임 진행도 */
  | 'passXp'
  /** 사용자가 직접 입력한 골격근량/체지방률의 실제 변화 (2개 이상 기록이 있을 때만) */
  | 'bodyComposition';

/**
 * 신호별 가중치. 어느 하나가 단독으로 단계를 결정하지 않게 나눠둔다 —
 * 특히 체중 같은 단일 신체 수치로는 성장 단계가 정해지지 않는다.
 */
export const CharacterGrowthSignalWeights: Record<CharacterGrowthSignal, number> = {
  workoutVolume: 0.35,
  workoutSessions: 0.25,
  passXp: 0.2,
  bodyComposition: 0.2,
};

/**
 * 각 신호가 1.0(만점)에 도달하는 기준값. 여기까지 오면 그 신호는 더 이상 오르지 않는다.
 * 실제 사용 데이터가 쌓이면 조정할 값이라 화면이 아니라 여기에만 둔다.
 */
export const CharacterGrowthTargets = {
  /** 누적 총 볼륨(kg) */
  volumeKg: 400_000,
  /** 누적 운동 세션 수 */
  sessions: 200,
  /** 누적 HELL PASS XP */
  passXp: 3_000,
  /** 골격근량 +N kg 또는 체지방률 -N %p 를 만점으로 본다 */
  skeletalMuscleGainKg: 5,
  bodyFatDropPercent: 8,
} as const;

/**
 * 종합 진행도(0~1) → 단계 경계. 값이 경계 이상이면 그 단계다.
 * stage1은 0부터라 목록에 없다.
 */
export const CharacterGrowthStageThresholds: { stage: CharacterGrowthStage; min: number }[] = [
  { stage: 'stage5', min: 0.8 },
  { stage: 'stage4', min: 0.6 },
  { stage: 'stage3', min: 0.4 },
  { stage: 'stage2', min: 0.2 },
];

/** 개발/디버깅용 표기. 사용자 화면에 그대로 쓰지 않는다 (UI Lv 표기와 결합 금지). */
export const CharacterGrowthStageDebugLabels: Record<CharacterGrowthStage, string> = {
  stage1: 'STAGE 1',
  stage2: 'STAGE 2',
  stage3: 'STAGE 3',
  stage4: 'STAGE 4',
  stage5: 'STAGE 5',
};
