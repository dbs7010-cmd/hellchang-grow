/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GYM BATTLE CORE v1 — 도메인 타입
 *
 * Battle은 운동의 **하위(downstream) 게임 시스템**이다. 완료된 운동 결과를 소비할 뿐,
 * WorkoutSession/Growth/BodyState를 바꾸지 않는다. 그래서 이 파일은 게임 상태에 필요한
 * 값만 정의하고, 운동 기록이나 성장 상태를 복제하지 않는다.
 *
 * 실제 신체 수치(체중/체지방/골격근량)는 여기 절대 들어오지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BattleOutcome = 'win' | 'loss' | 'duplicate';

/**
 * 완료된 운동 하나에서 뽑아낸 **불변 스냅샷**. 진행 중인 세션을 참조하지 않는다.
 * 만드는 곳은 `utils/battle-input.ts` 하나뿐이다.
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
 */
export type BattleState = Readonly<{
  version: number;
  currentStage: number;
  stageProgress: number;
  /** 게임 쪽 피로도(0~100). 실제 recovery/nutrition 데이터와 무관하다. */
  fatigue: number;
  lastResolvedWorkoutId: string | null;
}>;

export type BattleStageDefinition = Readonly<{
  stage: number;
  progressRequired: number;
  fatigueCost: number;
}>;

export type BattleResolution = Readonly<{
  outcome: BattleOutcome;
  progressGained: number;
  fatigueDelta: number;
  /** stage가 올랐는가. `outcome === 'win'`과 같은 뜻이지만 화면이 읽기 쉬우라고 둔다. */
  stageCleared: boolean;
  nextState: BattleState;
}>;

export const BattleStateVersion = 1;

export const INITIAL_BATTLE_STATE: BattleState = Object.freeze({
  version: BattleStateVersion,
  currentStage: 1,
  stageProgress: 0,
  fatigue: 0,
  lastResolvedWorkoutId: null,
});
