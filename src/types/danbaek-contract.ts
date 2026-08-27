export const DANBAEK_CONTRACT_VERSION = 1 as const;

export const MovementFamilies = [
  'push_horizontal',
  'pull_vertical',
  'pull_horizontal',
  'squat',
  'hinge',
  'push_vertical',
  'carry',
  'locomotion',
] as const;

export type MovementFamily = (typeof MovementFamilies)[number];

export const LearningStages = [
  'unseen',
  'observing',
  'imitating',
  'learned',
  'familiar',
  'proficient',
] as const;

export type LearningStage = (typeof LearningStages)[number];

export type LearnedCapability = {
  movementFamily: MovementFamily;
  learningStage: LearningStage;
  evidenceCount: number;
  lastObservedAt: string | null;
  representativeExerciseIds: string[];
};

export type DanbaekLearningProfile = {
  contractVersion: typeof DANBAEK_CONTRACT_VERSION;
  generatedAt: string;
  capabilities: LearnedCapability[];
};

export type StageRequirement = {
  movementFamily?: MovementFamily;
  minimumLearningStage?: LearningStage;
  specificExerciseId?: string;
  reason: string;
};

export type StagePass = {
  outcome: 'pass';
  stageId: string;
};

export type StageBlock = {
  outcome: 'block';
  stageId: string;
  requirement: StageRequirement;
  recommendedMovementFamily: MovementFamily;
  explanationKey: string;
};

export type StageEvaluation = StagePass | StageBlock;

export type AdventureProgress = {
  contractVersion: typeof DANBAEK_CONTRACT_VERSION;
  furthestClearedStageId: string | null;
  currentStageId: string;
};
