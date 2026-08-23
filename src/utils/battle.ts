import type {
  BattleInput,
  BattleResolution,
  BattleStageDefinition,
  BattleState,
} from '@/types/battle';
import { clampFatigue, migrateBattleState, safeNumber } from '@/utils/battle-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE RESOLVER — 완료된 운동 하나를 게임 진행으로 바꾸는 순수 함수
 *
 * **이 파일은 Workout / Growth / BodyState / Character를 import하지 않는다.**
 * 운동을 아는 곳은 경계(`utils/battle-input.ts`) 하나뿐이고, 여기는 이미 확정된 숫자만
 * 받는다. 그래서 Battle이 아무리 바뀌어도 운동/성장 쪽을 건드릴 방법이 없다.
 * (verify-battle-core.ts가 이 경계를 소스 텍스트로 직접 확인한다.)
 *
 * 결정적이다 — Math.random, Date.now, 네트워크, AI를 쓰지 않는다. 같은 입력이면 언제나
 * 같은 결과가 나오고, 그래서 밸런스를 테스트로 고정할 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 볼륨 몇 kg당 진행도 1을 줄지. 세트 수와 볼륨 둘 다 반영하기 위한 환산 단위다. */
export const BattleVolumePerProgress = 1000;

/**
 * 완료된 운동 하나가 만드는 진행도.
 *
 * 새 운동 계산식을 만들지 않는다 — completion pipeline이 이미 확정한 완료 세트 수와
 * 총 볼륨을 그대로 환산할 뿐이다. 이상한 값(NaN/Infinity/음수)은 0으로 떨어진다.
 */
export function calculateBattleProgress(input: BattleInput): number {
  const sets = Math.max(0, Math.floor(safeNumber(input?.completedSetCount, 0)));
  const volume = Math.max(0, safeNumber(input?.totalVolumeKg, 0));
  return sets + Math.floor(volume / BattleVolumePerProgress);
}

/**
 * 완료된 운동 하나를 게임 상태에 반영한다.
 *
 * 같은 운동이 두 번 들어오면 `duplicate`로 끝나고 **아무것도 변하지 않는다** — 진행도도,
 * 피로도도, stage도. 앱을 재시작해 저장된 state로 다시 물어봐도 같은 판단이 나온다.
 *
 * stage는 한 번에 최대 1단계만 오르고 넘친 진행도는 다음 stage로 이월한다
 * (GrowthConfig.stage.maxStagesPerSession과 같은 규칙 — 한 세션에 두 단계씩 뛰지 않는다).
 * 마지막 stage에서는 더 오르지 않고 진행도만 쌓인다.
 *
 * 원본 input/state를 절대 mutate하지 않는다. 항상 새 state를 만들어 돌려준다.
 */
export function resolveBattle(
  input: BattleInput,
  state: BattleState,
  stage: BattleStageDefinition,
  options: { isFinalStage?: boolean } = {}
): BattleResolution {
  // 손상된 저장값이 들어와도 여기서부터는 안전한 범위다 (원본은 건드리지 않는다).
  const safeState = migrateBattleState(state);
  const workoutId = typeof input?.workoutId === 'string' ? input.workoutId : '';

  // 이미 반영한 운동. 진행도/피로도/stage 어느 것도 두 번 주지 않는다.
  if (workoutId.length === 0 || safeState.lastResolvedWorkoutId === workoutId) {
    return {
      outcome: 'duplicate',
      progressGained: 0,
      fatigueDelta: 0,
      stageCleared: false,
      nextState: safeState,
    };
  }

  const progressRequired = Math.max(1, Math.floor(safeNumber(stage?.progressRequired, 1)));
  const fatigueCost = Math.max(0, safeNumber(stage?.fatigueCost, 0));

  const progressGained = calculateBattleProgress(input);
  const totalProgress = safeState.stageProgress + progressGained;

  const fatigueBefore = safeState.fatigue;
  const fatigueAfter = clampFatigue(fatigueBefore + fatigueCost);

  const canAdvance = !options.isFinalStage;
  const stageCleared = canAdvance && progressGained > 0 && totalProgress >= progressRequired;

  const nextState: BattleState = {
    ...safeState,
    currentStage: stageCleared ? safeState.currentStage + 1 : safeState.currentStage,
    // 넘친 진행도는 버리지 않고 이월한다. 크게 한 날의 노력이 사라지지 않게.
    stageProgress: stageCleared ? totalProgress - progressRequired : totalProgress,
    fatigue: fatigueAfter,
    lastResolvedWorkoutId: workoutId,
  };

  return {
    outcome: stageCleared ? 'win' : 'loss',
    progressGained,
    fatigueDelta: fatigueAfter - fatigueBefore,
    stageCleared,
    nextState,
  };
}

/** 이 운동이 이미 반영됐는가. 저장 전에 물어보면 불필요한 쓰기를 건너뛸 수 있다. */
export function isBattleWorkoutAlreadyResolved(state: BattleState, workoutId: string): boolean {
  return migrateBattleState(state).lastResolvedWorkoutId === workoutId;
}
