import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';
import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord } from '@/types/workout';
import { buildStanleyBlockLine, requiredExerciseForBlock, resolveBlockRoute } from '@/utils/danbaek-block-routing';
import { withObjectParticle, withTopicParticle } from '@/utils/korean';
import type { QuickStartExercise } from '@/utils/workout-start';

export interface BlockPresentation {
  stageId: string;
  movementFamily: MovementFamily;
  explanationKey: string;
  familyLabel: string;
  requiredStageLabel: string | null;
  requiredExercise: { exerciseId: string; name: string } | null;
  stanleyLines: string[];
  exercises: QuickStartExercise[];
  muscleGroup?: MuscleGroup;
  emptyLine: string | null;
}

const StanleyRelationshipLine = '제가 자세를 봐 드리면, 단백이는 옆에서 보고 따라 합니다.';

function buildEmptyLine(familyLabel: string): string {
  return `${withTopicParticle(familyLabel)} 지금 바로 연결할 수 있는 운동이 없습니다.`;
}

export function buildBlockPresentation(input: {
  block: StageBlock;
  exerciseDb: ExerciseDefinition[];
  records: WorkoutRecord[];
  limit?: number;
}): BlockPresentation {
  const { block, exerciseDb, records, limit } = input;
  const route = resolveBlockRoute({ block, exerciseDb, records, limit });
  const required = requiredExerciseForBlock(block, exerciseDb);
  const familyLabel = MovementFamilyLabels[route.movementFamily];
  const requiredStageLabel = block.requirement.minimumLearningStage
    ? LearningStageLabels[block.requirement.minimumLearningStage]
    : null;

  const stanleyLines = [
    buildStanleyBlockLine(block, route.exercises.slice(0, 2).map((exercise) => exercise.exerciseName)),
  ];
  if (required) stanleyLines.push(`이 구간은 ${withObjectParticle(required.name)} 콕 집어 요구합니다.`);
  if (route.exercises.length === 0) {
    stanleyLines.push(`${buildEmptyLine(familyLabel)} 오늘은 하고 싶은 부위로 시작하시고, 이 동작은 다음에 잡으시죠.`);
  }
  stanleyLines.push(StanleyRelationshipLine);

  return {
    stageId: block.stageId,
    movementFamily: route.movementFamily,
    explanationKey: route.explanationKey,
    familyLabel,
    requiredStageLabel,
    requiredExercise: required ? { exerciseId: required.id, name: required.name } : null,
    stanleyLines,
    exercises: route.exercises,
    muscleGroup: route.muscleGroup,
    emptyLine: route.exercises.length === 0 ? buildEmptyLine(familyLabel) : null,
  };
}

export function describeBlockCandidate(presentation: BlockPresentation, candidate: QuickStartExercise): string {
  if (presentation.requiredExercise?.exerciseId === candidate.exerciseId) return '이 구간이 요구하는 운동';
  return `${presentation.familyLabel} · 단백이가 보고 배울 동작`;
}
