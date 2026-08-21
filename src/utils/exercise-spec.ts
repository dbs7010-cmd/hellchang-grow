import { AppConfig } from '@/config/app-config';
import { inferMotionFamily } from '@/config/motion-families';
import type {
  ExerciseDefinition,
  ExerciseDifficulty,
  MuscleGroup,
  ResolvedExercise,
  SpDistribution,
} from '@/types/exercise';

/**
 * Exercise DB 원본(ExerciseDefinition) → 모든 필드가 채워진 ResolvedExercise.
 *
 * 순수 함수다 (IO 없음, DB는 항상 인자로 받는다). 44개 항목을 전부 다시 쓰지 않기 위해,
 * 명시되지 않은 필드는 기존 필드(equipment / trackingType / 근육군)에서 **결정론적으로**
 * 유도한다. 유도 규칙이 맞지 않는 운동만 DB에서 개별적으로 덮어쓴다.
 *
 * 유도값은 "그럴듯한 기본값"이지 측정된 사실이 아니다 — 실제 신체 수치와는 무관하며,
 * spDistribution도 게임 진행도(부위별 SP) 분배 비율일 뿐이다.
 */

const WEIGHTED_EQUIPMENT = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'smith']);

/** 1RM 추정이 의미 있는 복합 관절 운동. V1은 계산하지 않고, 표시 여부 판단에만 쓴다. */
const ONE_RM_EXERCISE_IDS = new Set([
  'bench-press',
  'incline-bench-press',
  'squat',
  'hack-squat',
  'deadlift',
  'romanian-deadlift',
  'overhead-press',
  'barbell-row',
  'leg-press',
]);

/** 보조 근육군에 배분하는 SP 비율의 합. 나머지는 전부 주동근이 가져간다. */
const SECONDARY_SP_SHARE = 0.3;

function isCompound(exercise: ExerciseDefinition): boolean {
  if (exercise.tags?.includes('compound')) return true;
  return ONE_RM_EXERCISE_IDS.has(exercise.id);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 주동근에 (1 - SECONDARY_SP_SHARE), 보조근에 나머지를 균등 배분한다. 보조근이 없으면
 * 주동근이 1.0을 전부 가져간다. 합은 항상 1.0이다 (GrowthEngine이 볼륨을 부위별로 나눌 때
 * 총량이 새거나 부풀지 않아야 한다).
 */
export function deriveSpDistribution(
  primary: MuscleGroup,
  secondary: MuscleGroup[] = []
): SpDistribution {
  const others = secondary.filter((group) => group !== primary);
  if (others.length === 0) return { [primary]: 1 };

  const each = round2(SECONDARY_SP_SHARE / others.length);
  const distribution: SpDistribution = {};
  let assigned = 0;
  for (const group of others) {
    distribution[group] = each;
    assigned += each;
  }
  distribution[primary] = round2(1 - assigned);
  return distribution;
}

function deriveDifficulty(exercise: ExerciseDefinition): ExerciseDifficulty {
  if (exercise.equipment === 'machine') return 'beginner';
  if (isCompound(exercise)) return 'advanced';
  if (exercise.equipment === 'barbell') return 'intermediate';
  return exercise.equipment === 'bodyweight' ? 'beginner' : 'intermediate';
}

function deriveDefaults(exercise: ExerciseDefinition) {
  if (exercise.trackingType === 'duration') return AppConfig.exerciseDefaults.duration;
  if (isCompound(exercise)) return AppConfig.exerciseDefaults.compound;
  if (exercise.equipment === 'bodyweight') return AppConfig.exerciseDefaults.bodyweight;
  return AppConfig.exerciseDefaults.isolation;
}

/**
 * 같은 부위의 다른 기구 운동을 대체 운동으로 제안한다 — "기구가 사람 있어서 못 함"이
 * 가장 흔한 이유이므로 기구가 다른 것을 우선한다. DB 순서가 곧 대표성 순서다.
 */
export function deriveAlternativeExerciseIds(
  exercise: ExerciseDefinition,
  db: ExerciseDefinition[],
  limit: number = AppConfig.alternativeExerciseLimit
): string[] {
  const sameGroup = db.filter(
    (other) => other.id !== exercise.id && other.primaryMuscleGroup === exercise.primaryMuscleGroup
  );
  const differentEquipment = sameGroup.filter((other) => other.equipment !== exercise.equipment);
  const sameEquipment = sameGroup.filter((other) => other.equipment === exercise.equipment);
  return [...differentEquipment, ...sameEquipment].slice(0, limit).map((other) => other.id);
}

export function resolveExercise(
  exercise: ExerciseDefinition,
  db: ExerciseDefinition[]
): ResolvedExercise {
  const secondaryMuscles = (exercise.secondaryMuscleGroups ?? []).filter(
    (group) => group !== exercise.primaryMuscleGroup
  );
  const defaults = deriveDefaults(exercise);

  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category ?? 'strength',
    equipment: exercise.equipment,
    animationFamily:
      exercise.animationFamily ??
      inferMotionFamily({
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        equipment: exercise.equipment,
      }),
    primaryMuscles: [exercise.primaryMuscleGroup],
    secondaryMuscles,
    spDistribution:
      exercise.spDistribution ?? deriveSpDistribution(exercise.primaryMuscleGroup, secondaryMuscles),
    usesWeight: exercise.trackingType === 'weight_reps' && WEIGHTED_EQUIPMENT.has(exercise.equipment),
    usesBodyWeight: exercise.equipment === 'bodyweight',
    uses1RM: exercise.trackingType === 'weight_reps' && ONE_RM_EXERCISE_IDS.has(exercise.id),
    defaultSets: exercise.defaultSets ?? defaults.sets,
    defaultReps: exercise.defaultReps ?? defaults.reps,
    defaultRestSeconds: exercise.defaultRestSeconds ?? defaults.restSeconds,
    difficulty: exercise.difficulty ?? deriveDifficulty(exercise),
    guideId: exercise.guideId ?? exercise.id,
    alternativeExerciseIds:
      exercise.alternativeExerciseIds ?? deriveAlternativeExerciseIds(exercise, db),
    trackingType: exercise.trackingType,
  };
}
