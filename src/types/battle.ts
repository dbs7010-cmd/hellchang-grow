export type BattleOutcome = 'win' | 'loss' | 'duplicate';

export type BattleInput = Readonly<{
  workoutId: string;
  completedSetCount: number;
  totalVolumeKg: number;
}>;

export type BattleState = Readonly<{
  currentStage: number;
  stageProgress: number;
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
  nextState: BattleState;
}>;

export const INITIAL_BATTLE_STATE: BattleState = Object.freeze({
  currentStage: 1,
  stageProgress: 0,
  fatigue: 0,
  lastResolvedWorkoutId: null,
});
