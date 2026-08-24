import { BattleConfig } from '@/config/battle-config';
import {
  NO_BATTLE_REWARD,
  type BattleEnemyView,
  type BattleInput,
  type BattleResolution,
  type BattleReward,
  type BattleStageDefinition,
  type BattleState,
} from '@/types/battle';
import { resolveBattlePower } from '@/utils/battle-power';
import { clampFatigue, migrateBattleState, safeNumber } from '@/utils/battle-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE RESOLVER — 완료된 운동 하나를 게임 진행으로 바꾸는 순수 함수
 *
 * **이 파일은 Workout / Growth / BodyState / Character를 import하지 않는다.**
 * 운동을 아는 곳은 경계(`utils/battle-input.ts`) 하나뿐이고, 여기는 이미 확정된 숫자만
 * 받는다. 그래서 Battle이 아무리 바뀌어도 운동/성장 쪽을 건드릴 방법이 없다.
 * (verify-battle-core.ts가 resolver가 실제로 읽는 속성까지 확인한다.)
 *
 * 한 번의 완료된 운동 = 한 번의 전투다. 전투 중 추가 입력은 없고, 같은 입력이면 언제나
 * 같은 결과가 나온다 — Math.random, Date.now, 네트워크, AI를 쓰지 않는다.
 *
 * 적 HP를 따로 저장하지 않는다: `stageProgress`가 곧 누적 피해이고, 남은 HP는
 * `progressRequired - stageProgress`다. 상태를 두 벌 관리하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function enemyView(
  stage: BattleStageDefinition,
  maxHp: number,
  progressBefore: number,
  progressAfterOnThisEnemy: number
): BattleEnemyView {
  return {
    id: typeof stage?.enemyId === 'string' ? stage.enemyId : 'unknown',
    name: typeof stage?.enemyName === 'string' ? stage.enemyName : '',
    type: stage?.enemyType === 'boss' ? 'boss' : 'normal',
    maxHp,
    remainingHpBefore: Math.max(0, maxHp - progressBefore),
    remainingHpAfter: Math.max(0, maxHp - progressAfterOnThisEnemy),
  };
}

/**
 * 완료된 운동 하나를 게임 상태에 반영한다.
 *
 * 같은 운동이 두 번 들어오면 `duplicate`로 끝나고 **아무것도 변하지 않는다** — 피해도,
 * 피로도도, stage도, 보상도. 앱을 재시작해 저장된 state로 다시 물어봐도 같은 판단이 나온다.
 *
 * 한 번의 운동으로 적을 반드시 잡을 필요는 없다. 못 잡으면 피해가 그대로 누적돼 다음
 * 운동에서 이어진다. 잡으면 stage가 오르고 **초과 피해는 다음 적에게 이월**된다.
 * 다만 한 운동에서 오르는 stage는 최대 1단계다
 * (GrowthConfig.stage.maxStagesPerSession과 같은 규칙 — 하루에 두 단계씩 뛰지 않는다).
 * 마지막 stage에서는 더 오르지 않고 피해만 쌓인다.
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

  const maxHp = Math.max(1, Math.floor(safeNumber(stage?.progressRequired, 1)));
  const progressBefore = Math.min(safeState.stageProgress, maxHp);

  // 이미 반영한 운동. 피해/피로도/stage/보상 어느 것도 두 번 주지 않는다.
  if (workoutId.length === 0 || safeState.lastResolvedWorkoutId === workoutId) {
    return {
      outcome: 'duplicate',
      progressGained: 0,
      fatigueDelta: 0,
      stageCleared: false,
      enemy: enemyView(stage, maxHp, progressBefore, progressBefore),
      power: { base: 0, fatigueMultiplier: 1, applied: 0 },
      reward: NO_BATTLE_REWARD,
      progressBefore: safeState.stageProgress,
      progressAfter: safeState.stageProgress,
      fatigueBefore: safeState.fatigue,
      fatigueAfter: safeState.fatigue,
      stageBefore: safeState.currentStage,
      stageAfter: safeState.currentStage,
      nextState: safeState,
    };
  }

  const fatigueCost = Math.max(0, safeNumber(stage?.fatigueCost, 0));
  const fatigueBefore = safeState.fatigue;
  const fatigueAfter = clampFatigue(fatigueBefore + fatigueCost);

  // 전투력은 **전투 전 피로도**로 깎인다 — 이번 운동으로 쌓인 피로가 그 운동을 소급해서
  // 약하게 만들지 않는다.
  const power = resolveBattlePower(input, fatigueBefore);
  const damage = power.applied;
  const totalProgress = safeState.stageProgress + damage;

  const canAdvance = !options.isFinalStage;
  const stageCleared = canAdvance && damage > 0 && totalProgress >= maxHp;
  const progressAfter = stageCleared ? totalProgress - maxHp : totalProgress;

  const clearCoins = stageCleared ? Math.max(0, safeNumber(stage?.reward?.clearCoins, 0)) : 0;
  const unlockToken =
    stageCleared && typeof stage?.reward?.unlockToken === 'string' ? stage.reward.unlockToken : null;
  const reward: BattleReward = {
    coins: damage * BattleConfig.reward.coinsPerDamage + clearCoins,
    unlockToken,
  };

  const nextState: BattleState = {
    ...safeState,
    currentStage: stageCleared ? safeState.currentStage + 1 : safeState.currentStage,
    stageProgress: progressAfter,
    fatigue: fatigueAfter,
    lastResolvedWorkoutId: workoutId,
  };

  return {
    outcome: stageCleared ? 'win' : 'loss',
    progressGained: damage,
    fatigueDelta: fatigueAfter - fatigueBefore,
    stageCleared,
    // 잡았으면 이 적은 HP 0으로 끝난 것이고, 이월분은 다음 적의 몫이다.
    enemy: enemyView(stage, maxHp, progressBefore, stageCleared ? maxHp : totalProgress),
    power,
    reward,
    progressBefore: safeState.stageProgress,
    progressAfter,
    fatigueBefore,
    fatigueAfter,
    stageBefore: safeState.currentStage,
    stageAfter: nextState.currentStage,
    nextState,
  };
}

/** 이 운동이 이미 반영됐는가. 저장 전에 물어보면 불필요한 쓰기를 건너뛸 수 있다. */
export function isBattleWorkoutAlreadyResolved(state: BattleState, workoutId: string): boolean {
  return migrateBattleState(state).lastResolvedWorkoutId === workoutId;
}

/** 지금 적에게 남은 HP. 화면이 저장 상태에서 바로 구할 수 있게 둔다. */
export function battleEnemyRemainingHp(state: BattleState, stage: BattleStageDefinition): number {
  const safeState = migrateBattleState(state);
  const maxHp = Math.max(1, Math.floor(safeNumber(stage?.progressRequired, 1)));
  return Math.max(0, maxHp - safeState.stageProgress);
}
