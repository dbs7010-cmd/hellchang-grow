import { getBattleStage, isFinalBattleStage } from '@/config/battle-stages';
import type { BattleInput, BattleProgressionState, BattleResolution } from '@/types/battle';
import { resolveBattle } from '@/utils/battle';
import { recoverBattleProgression } from '@/utils/battle-recovery';
import { applyBattleResolution } from '@/utils/battle-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE SYNC — 완료된 운동 하나를 Battle에 반영하는 단일 트랜잭션 경계
 *
 * **완료 파이프라인 밖에 있다.** `runSessionCompletion`도 `SessionCompletionReceipt`도
 * Battle을 알지 못한다. 그래서 Battle 저장이 실패해도 되돌릴 트랜잭션이 없다 —
 * WorkoutRecord / Growth / XP / streak은 이미 확정된 채로 남는다. 구조적으로 rollback이
 * 불가능한 것이 이 설계의 요점이다.
 *
 * ### exactly-once를 receipt 없이 얻는 방법
 *
 * 피해·피로도·stage·재화·토큰이 **한 문서에 함께 저장된다**. 저장소가 주는 원자성 단위가
 * "키 하나 쓰기"라, 이 다섯이 한 번의 쓰기에 실리면 중간 상태가 존재할 수 없다 —
 * "state는 저장됐는데 보상만 날아간" 창이 아예 열리지 않는다. 그래서 별도의
 * BattleCompletionReceipt도, 무한히 쌓이는 claimedWorkoutIds도 필요 없다.
 * 중복 판단은 같은 문서 안의 `battle.lastResolvedWorkoutId` 하나로 끝난다.
 *
 * 쓰기가 실패하면 문서는 통째로 이전 상태다. 같은 운동으로 다시 부르면 그대로 재시도된다.
 *
 * ### 시계는 여기서만 들어온다
 *
 * 도메인은 시간을 읽지 않는다. 현재 시각은 이 경계에서 `nowMs`로 주입되고, 그 값으로
 * 피로도 회복을 먼저 반영한 뒤 전투를 판정한다 — 쉬고 온 만큼 더 세게 때린다.
 *
 * ### 화면이 부를 것은 이 파일의 함수뿐이다
 *
 * resolveBattle / recover / saveState / addCoins / saveToken을 각각 부르게 하지 않는다.
 * 트랜잭션 경계는 여기(domain/data)에 있고, UI는 결과만 읽는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BattleSyncStatus = 'applied' | 'duplicate' | 'skipped' | 'failed';

export interface BattleSyncResult {
  status: BattleSyncStatus;
  /** 반영됐다면 그 결과(피해/보상/적 정보). skipped/failed면 null. */
  resolution: BattleResolution | null;
  /**
   * 호출 후의 진행 문서. 저장이 실패했으면 손대지 않은 이전 문서이고,
   * **읽지도 못했으면 null**이다 (모르는 것을 아는 척하지 않는다).
   */
  progression: BattleProgressionState | null;
  /** 이번 호출에서 시간 경과로 회복된 피로도. */
  fatigueRecovered: number;
  /** failed일 때의 원인. 로깅용이며 호출부의 흐름을 막지 않는다. */
  error?: unknown;
}

export interface BattleSyncOperations {
  loadProgression: () => Promise<BattleProgressionState>;
  saveProgression: (progression: BattleProgressionState) => Promise<void>;
}

/**
 * 완료된 운동 하나를 Battle에 반영한다 — 회복, 판정, 진행도 저장, 보상 저장이 한 번에 끝난다.
 *
 *  - 입력을 만들 수 없으면(`null`) `skipped`. 그동안의 회복은 반영해 둔다.
 *  - 이미 반영한 운동이면 `duplicate`. 피해도 재화도 0이고 **회복 기준점도 리셋되지 않는다**.
 *  - 저장이 실패하면 `failed`. 문서는 통째로 이전 상태이고, 같은 운동으로 다시 부르면 된다.
 */
export async function syncCompletedWorkoutToBattle(
  input: BattleInput | null,
  operations: BattleSyncOperations,
  nowMs: number
): Promise<BattleSyncResult> {
  let stored: BattleProgressionState;
  try {
    stored = await operations.loadProgression();
  } catch (error) {
    // 읽지 못하면 아무것도 하지 않는다 — 모르는 상태 위에 진행을 얹지 않는다.
    return { status: 'failed', resolution: null, progression: null, fatigueRecovered: 0, error };
  }

  // 먼저 그동안 쉰 만큼을 반영한다. 전투는 회복된 피로도로 판정된다.
  const { progression: recovered, recovered: fatigueRecovered, changed } =
    recoverBattleProgression(stored, nowMs);

  const persistRecoveryOnly = async (
    status: 'skipped' | 'duplicate',
    resolution: BattleResolution | null
  ): Promise<BattleSyncResult> => {
    if (!changed) {
      return { status, resolution, progression: recovered, fatigueRecovered };
    }
    try {
      await operations.saveProgression(recovered);
      return { status, resolution, progression: recovered, fatigueRecovered };
    } catch (error) {
      // 회복을 저장하지 못해도 잃어버리지 않는다 — 기준 시각이 그대로라 다음 조회에서 다시 계산된다.
      return { status, resolution, progression: stored, fatigueRecovered: 0, error };
    }
  };

  if (!input) return persistRecoveryOnly('skipped', null);

  const state = recovered.battle;
  const stage = getBattleStage(state.currentStage);
  const resolution = resolveBattle(input, state, stage, {
    isFinalStage: isFinalBattleStage(state.currentStage),
  });

  if (resolution.outcome === 'duplicate') return persistRecoveryOnly('duplicate', resolution);

  // 회복 + 전투 진행 + 보상을 하나의 문서로 만들어 **한 번에** 쓴다. 부분 반영이 없다.
  const nextProgression = applyBattleResolution(recovered, resolution, nowMs);

  try {
    await operations.saveProgression(nextProgression);
  } catch (error) {
    // 저장 실패는 Battle만의 문제다. 운동 기록/성장은 이미 확정돼 있고 여기서 건드리지 않는다.
    return { status: 'failed', resolution: null, progression: stored, fatigueRecovered: 0, error };
  }

  return { status: 'applied', resolution, progression: nextProgression, fatigueRecovered };
}

/**
 * 전투 없이 **읽기만** 하면서 그동안의 회복을 반영한다. 화면이 현재 피로도를 물을 때 쓴다.
 *
 * 바뀐 것이 있을 때만 저장한다 — 조회할 때마다 쓰지 않는다. 저장에 실패해도 회복은
 * 사라지지 않는다: 기준 시각이 그대로 남아 다음 조회에서 같은 값이 다시 계산된다.
 */
export async function loadRecoveredBattleProgression(
  operations: BattleSyncOperations,
  nowMs: number
): Promise<BattleSyncResult> {
  return syncCompletedWorkoutToBattle(null, operations, nowMs);
}
