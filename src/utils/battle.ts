import type {
  BattleInput,
  BattleResolution,
  BattleStageDefinition,
  BattleState,
} from '@/types/battle';

const MIN_FATIGUE = 0;
const MAX_FATIGUE = 100;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateBattleProgress(input: BattleInput): number {
  const sets = Math.max(0, Math.floor(input.completedSetCount));
  const volume = Math.max(0, input.totalVolumeKg);
  return Math.max(0, sets + Math.floor(volume / 1000));
}

export function resolveBattle(
  input: BattleInput,
  state: BattleState,
  stage: BattleStageDefinition
): BattleResolution {
  if (state.lastResolvedWorkoutId === input.workoutId) {
    return {
      outcome: 'duplicate',
      progressGained: 0,
      fatigueDelta: 0,
      nextState: state,
    };
  }

  const progressGained = calculateBattleProgress(input);
  const fatigueBefore = clamp(state.fatigue, MIN_FATIGUE, MAX_FATIGUE);
  const fatigueAfter = clamp(fatigueBefore + Math.max(0, stage.fatigueCost), MIN_FATIGUE, MAX_FATIGUE);
  const totalProgress = Math.max(0, state.stageProgress) + progressGained;
  const won = progressGained > 0 && totalProgress >= Math.max(1, stage.progressRequired);

  const nextState: BattleState = {
    currentStage: won ? state.currentStage + 1 : state.currentStage,
    stageProgress: won ? 0 : totalProgress,
    fatigue: fatigueAfter,
    lastResolvedWorkoutId: input.workoutId,
  };

  return {
    outcome: won ? 'win' : 'loss',
    progressGained,
    fatigueDelta: fatigueAfter - fatigueBefore,
    nextState,
  };
}
