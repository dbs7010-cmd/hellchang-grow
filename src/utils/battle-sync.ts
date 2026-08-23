import { getBattleStage, isFinalBattleStage } from '@/config/battle-stages';
import type { BattleInput, BattleResolution, BattleState } from '@/types/battle';
import { resolveBattle } from '@/utils/battle';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE SYNC — 완료된 운동을 Battle에 반영하는 재시도 가능한 경계
 *
 * **완료 파이프라인 밖에 있다.** `runSessionCompletion`도 `SessionCompletionReceipt`도
 * Battle을 알지 못한다. 그래서 Battle 저장이 실패해도 되돌릴 트랜잭션이 없다 —
 * WorkoutRecord / Growth / XP / streak은 이미 확정된 채로 남는다. 구조적으로 rollback이
 * 불가능한 것이 이 설계의 요점이다.
 *
 * 멱등하므로 언제 몇 번을 불러도 안전하다. 저장이 실패하면 예외를 던지지 않고 결과
 * 객체로 알린다 — 호출부는 "나중에 다시 부르면 된다"만 알면 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BattleSyncStatus = 'applied' | 'duplicate' | 'skipped' | 'failed';

export interface BattleSyncResult {
  status: BattleSyncStatus;
  /** 반영됐다면 그 결과. skipped/failed면 null. */
  resolution: BattleResolution | null;
  /**
   * 호출 후의 게임 상태. 저장이 실패했으면 손대지 않은 이전 상태이고,
   * 상태를 **읽지도 못했으면 null**이다 (모르는 것을 아는 척하지 않는다).
   */
  state: BattleState | null;
  /** failed일 때의 원인. 로깅용이며 호출부의 흐름을 막지 않는다. */
  error?: unknown;
}

export interface BattleSyncOperations {
  loadState: () => Promise<BattleState>;
  saveState: (state: BattleState) => Promise<void>;
}

/**
 * 완료된 운동 하나를 Battle에 반영한다.
 *
 *  - 입력을 만들 수 없으면(`null`) `skipped` — sessionId 없는 수동/옛 기록이 여기 해당한다.
 *  - 이미 반영한 운동이면 `duplicate`로 끝나고 **저장조차 하지 않는다**.
 *  - 저장이 실패하면 `failed`. 게임 상태는 이전 그대로이고, 같은 운동으로 다시 부르면 된다.
 */
export async function syncCompletedWorkoutToBattle(
  input: BattleInput | null,
  operations: BattleSyncOperations
): Promise<BattleSyncResult> {
  let state: BattleState;
  try {
    state = await operations.loadState();
  } catch (error) {
    // 읽지 못하면 아무것도 하지 않는다 — 모르는 상태 위에 진행을 얹지 않는다.
    return { status: 'failed', resolution: null, state: null, error };
  }

  if (!input) return { status: 'skipped', resolution: null, state };

  const stage = getBattleStage(state.currentStage);
  const resolution = resolveBattle(input, state, stage, {
    isFinalStage: isFinalBattleStage(state.currentStage),
  });

  if (resolution.outcome === 'duplicate') {
    return { status: 'duplicate', resolution, state: resolution.nextState };
  }

  try {
    await operations.saveState(resolution.nextState);
  } catch (error) {
    // 저장 실패는 Battle만의 문제다. 운동 기록/성장은 이미 확정돼 있고 여기서 건드리지 않는다.
    return { status: 'failed', resolution: null, state, error };
  }

  return { status: 'applied', resolution, state: resolution.nextState };
}
