import {
  LearningStages,
  type DanbaekLearningProfile,
  type LearningStage,
  type StageEvaluation,
  type StageRequirement,
} from '@/types/danbaek-contract';

export type DanbaekWorldStage = {
  id: string;
  requirement?: StageRequirement;
};

const learningRank = new Map<LearningStage, number>(
  LearningStages.map((stage, index) => [stage, index])
);

function hasMinimumLearningStage(actual: LearningStage, minimum: LearningStage): boolean {
  return (learningRank.get(actual) ?? -1) >= (learningRank.get(minimum) ?? Number.MAX_SAFE_INTEGER);
}

export function evaluateDanbaekWorldStage(
  stage: DanbaekWorldStage,
  profile: DanbaekLearningProfile
): StageEvaluation {
  const requirement = stage.requirement;
  if (!requirement) return { outcome: 'pass', stageId: stage.id };

  const capability = requirement.movementFamily
    ? profile.capabilities.find((candidate) => candidate.movementFamily === requirement.movementFamily)
    : undefined;

  const familySatisfied = requirement.movementFamily ? Boolean(capability) : true;
  const stageSatisfied = requirement.minimumLearningStage
    ? Boolean(capability && hasMinimumLearningStage(capability.learningStage, requirement.minimumLearningStage))
    : true;
  const exerciseCandidates = requirement.movementFamily
    ? capability ? [capability] : []
    : profile.capabilities;
  const exerciseSatisfied = requirement.specificExerciseId
    ? exerciseCandidates.some((candidate) => candidate.representativeExerciseIds.includes(requirement.specificExerciseId!))
    : true;

  if (familySatisfied && stageSatisfied && exerciseSatisfied) {
    return { outcome: 'pass', stageId: stage.id };
  }

  return {
    outcome: 'block',
    stageId: stage.id,
    requirement,
    recommendedMovementFamily: requirement.movementFamily ?? capability?.movementFamily ?? 'locomotion',
    explanationKey: requirement.specificExerciseId
      ? 'world.block.specific_exercise_required'
      : 'world.block.learning_required',
  };
}
