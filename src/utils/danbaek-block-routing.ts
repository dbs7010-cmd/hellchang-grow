import { DanbaekLearningExerciseMap } from '@/config/danbaek-learning-map';
import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';
import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord } from '@/types/workout';
import { resolveExercise } from '@/utils/exercise-spec';
import type { QuickStartExercise } from '@/utils/workout-start';

export interface BlockRoute {
  movementFamily: MovementFamily;
  explanationKey: string;
  stanleyLine: string;
  exercises: QuickStartExercise[];
  muscleGroup?: MuscleGroup;
}

export function exerciseIdsForMovementFamily(movementFamily: MovementFamily): string[] {
  return Object.entries(DanbaekLearningExerciseMap)
    .filter(([, family]) => family === movementFamily)
    .map(([exerciseId]) => exerciseId);
}

export function requiredExerciseForBlock(
  block: StageBlock,
  exerciseDb: ExerciseDefinition[]
): ExerciseDefinition | null {
  const requiredId = block.requirement.specificExerciseId;
  if (!requiredId) return null;
  return exerciseDb.find((exercise) => exercise.id === requiredId) ?? null;
}

export function resolveBlockRoute(input: {
  block: StageBlock;
  exerciseDb: ExerciseDefinition[];
  records: WorkoutRecord[];
  limit?: number;
}): BlockRoute {
  const { block, exerciseDb, records, limit = 4 } = input;
  const family = block.recommendedMovementFamily;

  const familyIds = new Set(exerciseIdsForMovementFamily(family));
  const inFamily = exerciseDb.filter((exercise) => familyIds.has(exercise.id));

  const familiarIds: string[] = [];
  for (const record of [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    for (const entry of record.exercises ?? []) {
      if (!entry.exerciseId || familiarIds.includes(entry.exerciseId)) continue;
      if (familyIds.has(entry.exerciseId)) familiarIds.push(entry.exerciseId);
    }
  }

  const required = requiredExerciseForBlock(block, exerciseDb);
  const ordered = [
    ...(required ? [required] : []),
    ...familiarIds
      .map((id) => inFamily.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is ExerciseDefinition => Boolean(exercise)),
    ...inFamily.filter((exercise) => !familiarIds.includes(exercise.id)),
  ]
    .filter((exercise, index, all) => all.findIndex((other) => other.id === exercise.id) === index)
    .slice(0, limit);

  const exercises: QuickStartExercise[] = ordered.map((exercise) => {
    const resolved = resolveExercise(exercise, exerciseDb);
    return {
      exerciseId: resolved.id,
      exerciseName: resolved.name,
      targetSets: resolved.defaultSets,
      defaultRestSeconds: resolved.defaultRestSeconds,
    };
  });

  return {
    movementFamily: family,
    explanationKey: block.explanationKey,
    stanleyLine: buildStanleyBlockLine(block, ordered.slice(0, 2).map((exercise) => exercise.name)),
    exercises,
    muscleGroup: ordered[0]?.primaryMuscleGroup,
  };
}

export function buildStanleyBlockLine(block: StageBlock, exerciseNames: string[]): string {
  const requirement = block.requirement;
  const needed = requirement.minimumLearningStage
    ? `${LearningStageLabels[requirement.minimumLearningStage]} 정도는 돼야 합니다.`
    : '아직 더 봐야 합니다.';

  const head = `${requirement.reason} 단백이가 ${needed}`;
  if (exerciseNames.length === 0) return head;
  return `${head} 오늘 ${exerciseNames.join(', ')}부터 같이 가시죠.`;
}
