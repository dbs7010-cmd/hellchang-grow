import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { MovementFamilyShortLabels, DanbaekBlockVoiceLines } from '@/config/danbaek-voice-lines';
import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';
import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord } from '@/types/workout';
import { buildStanleyBlockLine, requiredExerciseForBlock, resolveBlockRoute } from '@/utils/danbaek-block-routing';
import { withInstrumentalParticle, withTopicParticle } from '@/utils/korean';
import type { QuickStartExercise } from '@/utils/workout-start';

export interface BlockPresentation {
  stageId: string;
  movementFamily: MovementFamily;
  explanationKey: string;
  familyLabel: string;
  requiredStageLabel: string | null;
  requiredExercise: { exerciseId: string; name: string } | null;
  danbaekLine: string;
  whyBlockedLine: string;
  whatToLearnLine: string;
  stanleyLine: string;
  exercises: QuickStartExercise[];
  primaryAction: { exercise: QuickStartExercise; label: string } | null;
  otherExercises: QuickStartExercise[];
  muscleGroup?: MuscleGroup;
  emptyLine: string | null;
}

function buildEmptyLine(familyLabel: string): string {
  return `${withTopicParticle(familyLabel)} 지금 바로 연결할 수 있는 운동이 없습니다.`;
}

export function buildBlockPresentation(input: { block: StageBlock; exerciseDb: ExerciseDefinition[]; records: WorkoutRecord[]; limit?: number }): BlockPresentation {
  const { block, exerciseDb, records, limit } = input;
  const route = resolveBlockRoute({ block, exerciseDb, records, limit });
  const required = requiredExerciseForBlock(block, exerciseDb);
  const familyLabel = MovementFamilyShortLabels[route.movementFamily];
  const requiredStageLabel = block.requirement.minimumLearningStage ? LearningStageLabels[block.requirement.minimumLearningStage] : null;
  const primaryExercise = route.exercises[0] ?? null;
  const whyBlockedLine = block.requirement.reason;
  const whatToLearnLine = required
    ? `${required.name}에서 쓰는 ${familyLabel} 동작을 더 보면 돼요.`
    : `${familyLabel} 동작을 더 보고 따라 하면 돼요.`;

  return {
    stageId: block.stageId,
    movementFamily: route.movementFamily,
    explanationKey: route.explanationKey,
    familyLabel,
    requiredStageLabel,
    requiredExercise: required ? { exerciseId: required.id, name: required.name } : null,
    danbaekLine: route.exercises.length > 0 ? DanbaekBlockVoiceLines.needsPractice : DanbaekBlockVoiceLines.noRoute,
    whyBlockedLine,
    whatToLearnLine,
    stanleyLine: buildStanleyBlockLine(block, route.exercises.slice(0, 2).map((exercise) => exercise.exerciseName)),
    exercises: route.exercises,
    primaryAction: primaryExercise ? { exercise: primaryExercise, label: `${withInstrumentalParticle(primaryExercise.exerciseName)} 시작` } : null,
    otherExercises: route.exercises.slice(1),
    muscleGroup: route.muscleGroup,
    emptyLine: route.exercises.length === 0 ? buildEmptyLine(familyLabel) : null,
  };
}

export function describeBlockCandidate(presentation: BlockPresentation, candidate: QuickStartExercise): string {
  if (presentation.requiredExercise?.exerciseId === candidate.exerciseId) return '이 구간이 요구하는 운동';
  return `${presentation.familyLabel} · 단백이가 보고 배울 동작`;
}
