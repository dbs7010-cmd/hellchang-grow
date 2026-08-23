/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GYM BATTLE CORE v1 — 도메인 타입
 *
 * Battle은 운동의 **하위(downstream) 게임 시스템**이다. 완료된 운동 결과를 소비할 뿐,
 * WorkoutSession/Growth/BodyState를 바꾸지 않는다. 그래서 이 파일은 게임 상태에 필요한
 * 값만 정의하고, 운동 기록이나 성장 상태를 복제하지 않는다.
 *
 * 실제 신체 수치(체중/체지방/골격근량)는 여기 절대 들어오지 않는다.
 * REAL BODY DATA != BATTLE POWER — 전투력은 이미 검증된 **수행량**에서만 나온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BattleOutcome = 'win' | 'loss' | 'duplicate';

/** v1은 일반 적과 보스만 구분한다. 별도의 보스 엔진을 만들지 않는 확장 지점이다. */
export type BattleEnemyType = 'normal' | 'boss';

/**
 * 완료된 운동 하나에서 뽑아낸 **불변 스냅샷**. 진행 중인 세션을 참조하지 않는다.
 * 만드는 곳은 `utils/battle-input.ts` 하나뿐이다.
 *
 * 횟수(reps)를 담지 않는 이유: 시간 기반 운동은 `reps`에 **초**를 저장하므로, 그대로
 * 더하면 45초 플랭크가 벤치 10회보다 4배 강해진다. 유효 세트 판정은 이미 기존 운동
 * 규칙(isEffectiveSet)이 끝냈으므로 Battle은 세트 수와 볼륨만 본다.
 */
export type BattleInput = Readonly<{
  /** 완료된 운동의 idempotency key (세션 id). 같은 값이면 두 번 반영하지 않는다. */
  workoutId: string;
  completedSetCount: number;
  totalVolumeKg: number;
}>;

/**
 * 저장되는 게임 상태. **이것이 전부다** — 운동 히스토리도, 성장 상태도, BodyParameters도
 * 복제하지 않는다. 그 값들이 필요하면 각자의 authoritative source에서 읽는다.
 *
 * `stageProgress`는 곧 **현재 적에게 누적으로 준 피해**다. 적 HP를 따로 저장하지 않는다 —
 * 남은 HP는 `progressRequired - stageProgress`로 언제든 구할 수 있다.
 */
export type BattleState = Readonly<{
  version: number;
  currentStage: number;
  stageProgress: number;
  /** 게임 쪽 피로도(0~100). 실제 recovery/nutrition 데이터와 무관하다. */
  fatigue: number;
  lastResolvedWorkoutId: string | null;
}>;

/**
 * Stage 하나가 곧 적 하나다. 보상은 stage clear에만 붙는다.
 *
 * `enemyId`는 화면 표현과 분리된 **안정적인 식별자**다 — 나중에 적/보스 이미지가 붙어도
 * 이 값은 바뀌지 않는다. 이름/이미지가 바뀌어도 저장된 진행도가 어긋나지 않게 하기 위해서다.
 */
export type BattleStageDefinition = Readonly<{
  stage: number;
  enemyId: string;
  enemyName: string;
  enemyType: BattleEnemyType;
  /** 적의 최대 HP. 누적 피해(stageProgress)가 이 값에 닿으면 stage clear다. */
  progressRequired: number;
  fatigueCost: number;
  reward: BattleStageReward;
}>;

export type BattleStageReward = Readonly<{
  /** stage clear 보너스 재화. */
  clearCoins: number;
  /** clear 시 주어지는 해금 토큰. 아직 인벤토리는 없고 계약만 있다. */
  unlockToken: string | null;
}>;

/**
 * 이번 전투의 보상. **Workout XP/streak/Muscle SP와 완전히 별개의 게임 재화다** —
 * Battle은 기존 보상을 다시 지급하지 않는다.
 */
export type BattleReward = Readonly<{
  coins: number;
  unlockToken: string | null;
}>;

/**
 * **저장되는 문서 전체.** 전투 진행(`battle`)과 영구 보상(경제)을 한 덩어리로 담는다.
 *
 * 개념은 둘로 나뉘어 있지만 **저장은 하나로 묶는 것이 핵심 설계다.** AsyncStorage가 주는
 * 원자성 단위는 "키 하나 쓰기"뿐이라, 진행도와 재화를 다른 키에 나눠 쓰면 그 사이에서
 * 앱이 죽었을 때 한쪽만 반영되는 찢어진 상태가 생긴다 — 보상이 영원히 사라지거나 두 번
 * 들어가는 바로 그 문제다. 한 문서에 함께 두면 "둘 다 적용" 또는 "둘 다 미적용"만 남는다.
 *
 * 그래서 중복 방지에 필요한 것은 `battle.lastResolvedWorkoutId` 하나뿐이다 — 재화까지
 * 같은 쓰기에 실려 있으므로 별도의 claimedWorkoutIds 목록을 무한히 쌓을 이유가 없다.
 */
export type BattleProgressionState = Readonly<{
  version: number;
  /** 전투 진행 자체. 도메인 타입은 그대로이고 여기 담기기만 한다. */
  battle: BattleState;
  /** 누적 전투 재화. 정수 ≥ 0이며 상한이 있다. */
  coins: number;
  /** 획득한 해금 토큰. 아직 무엇과도 교환하지 않는다 (표현과 무관한 ID). */
  unlockTokens: readonly string[];
  /**
   * 저장된 `battle.fatigue`가 정확했던 시각(epoch ms). 시간 경과 회복의 기준점이다.
   *
   * `null`이면 기준을 모른다는 뜻이고, 그때는 회복을 주지 않고 다음 조회 시각을 기준으로
   * 삼는다 — 손상된 timestamp가 공짜 회복이 되지 않게 한다.
   *
   * **도메인이 시계를 읽어서 채우지 않는다.** 현재 시각은 언제나 바깥(orchestration)에서
   * 주입된다.
   */
  fatigueUpdatedAt: number | null;
}>;

/** 화면이 그대로 읽을 수 있는 전투 결과. 저장되지 않는 표시용 값이다. */
export type BattleEnemyView = Readonly<{
  id: string;
  name: string;
  type: BattleEnemyType;
  maxHp: number;
  remainingHpBefore: number;
  remainingHpAfter: number;
}>;

export type BattlePowerBreakdown = Readonly<{
  /** 피로도를 적용하기 전의 순수 수행량 전투력. */
  base: number;
  /** 피로도 구간 배수(0~1). 1이면 패널티 없음. */
  fatigueMultiplier: number;
  /** 실제로 적에게 들어간 피해. */
  applied: number;
}>;

/**
 * 전투 결과. `nextState`가 저장되는 진실이고, 나머지는 화면이 바로 쓰라고 함께 담아 주는
 * 파생값이다 — 저장하지 않으므로 상태와 중복해서 관리할 것이 없다.
 */
export type BattleResolution = Readonly<{
  outcome: BattleOutcome;
  /** 이번 운동이 적에게 준 피해 (= 늘어난 stageProgress). */
  progressGained: number;
  fatigueDelta: number;
  /** stage가 올랐는가. `outcome === 'win'`과 같은 뜻이지만 화면이 읽기 쉬우라고 둔다. */
  stageCleared: boolean;
  enemy: BattleEnemyView;
  power: BattlePowerBreakdown;
  reward: BattleReward;
  progressBefore: number;
  progressAfter: number;
  fatigueBefore: number;
  fatigueAfter: number;
  stageBefore: number;
  stageAfter: number;
  nextState: BattleState;
}>;

export const BattleStateVersion = 1;
export const BattleProgressionVersion = 1;

export const INITIAL_BATTLE_STATE: BattleState = Object.freeze({
  version: BattleStateVersion,
  currentStage: 1,
  stageProgress: 0,
  fatigue: 0,
  lastResolvedWorkoutId: null,
});

export const INITIAL_BATTLE_PROGRESSION: BattleProgressionState = Object.freeze({
  version: BattleProgressionVersion,
  battle: INITIAL_BATTLE_STATE,
  coins: 0,
  unlockTokens: Object.freeze([]) as readonly string[],
  fatigueUpdatedAt: null,
});

export const NO_BATTLE_REWARD: BattleReward = Object.freeze({ coins: 0, unlockToken: null });
