import {
  BattleStateVersion,
  INITIAL_BATTLE_STATE,
  type BattleState,
} from '@/types/battle';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE STATE — 저장된 값을 현재 스키마로 맞추는 순수 레이어
 *
 * 읽기/쓰기는 `data/battle-repository.ts`가, 승패 판정은 `utils/battle.ts`가 맡는다.
 * 여기는 그 사이에서 "믿을 수 없는 값을 안전한 범위로 되돌리는" 일만 한다 —
 * growth-state.ts의 migrateGrowthState와 같은 자리다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const MinBattleFatigue = 0;
export const MaxBattleFatigue = 100;

/**
 * 숫자로 믿을 수 있는 값만 통과시킨다. NaN/Infinity/문자열은 fallback으로 떨어진다 —
 * 손상된 저장값 하나가 게임 상태 전체를 NaN으로 물들이지 않게 하는 최소 방어다.
 */
export function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clampFatigue(value: unknown): number {
  return Math.min(MaxBattleFatigue, Math.max(MinBattleFatigue, safeNumber(value, MinBattleFatigue)));
}

export function createInitialBattleState(): BattleState {
  return { ...INITIAL_BATTLE_STATE };
}

/**
 * 저장된 값 → 항상 완전하고 안전한 BattleState.
 *
 * 알고 있는 값은 그대로 두고 빠진/이상한 필드만 되돌린다. 진행도와 stage는 음수가 될 수
 * 없고, 피로도는 언제나 0~100이며, workoutId는 문자열이 아니면 없는 것으로 본다.
 */
export function migrateBattleState(stored: Partial<BattleState> | null | undefined): BattleState {
  if (!stored || typeof stored !== 'object') return createInitialBattleState();

  const lastResolvedWorkoutId =
    typeof stored.lastResolvedWorkoutId === 'string' && stored.lastResolvedWorkoutId.length > 0
      ? stored.lastResolvedWorkoutId
      : null;

  return {
    version: BattleStateVersion,
    currentStage: Math.max(1, Math.floor(safeNumber(stored.currentStage, INITIAL_BATTLE_STATE.currentStage))),
    stageProgress: Math.max(0, Math.floor(safeNumber(stored.stageProgress, 0))),
    fatigue: clampFatigue(stored.fatigue),
    lastResolvedWorkoutId,
  };
}
