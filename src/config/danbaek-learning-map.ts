import type { MovementFamily } from '@/types/danbaek-contract';

/**
 * Rebuild contract adapter seed.
 * Keys MUST be existing ExerciseDefinition ids from config/exercises.ts.
 * This file maps exercise identity to Danbaek learning semantics; it does not
 * calculate evidence, mutate workout records, or award learning by itself.
 */
export const DanbaekLearningExerciseMap = {
  'bench-press': 'push_horizontal',
  'incline-bench-press': 'push_horizontal',
  'dumbbell-bench-press': 'push_horizontal',
  'incline-dumbbell-press': 'push_horizontal',
  'chest-press-machine': 'push_horizontal',
  'push-up': 'push_horizontal',

  'lat-pulldown': 'pull_vertical',
  'pull-up': 'pull_vertical',
  'straight-arm-pulldown': 'pull_vertical',

  'barbell-row': 'pull_horizontal',
  'dumbbell-row': 'pull_horizontal',
  'seated-cable-row': 'pull_horizontal',
  'machine-row': 'pull_horizontal',
  't-bar-row': 'pull_horizontal',
  'face-pull': 'pull_horizontal',

  squat: 'squat',
  'hack-squat': 'squat',
  lunge: 'squat',

  'romanian-deadlift': 'hinge',
  'hip-thrust': 'hinge',
  deadlift: 'hinge',

  'overhead-press': 'push_vertical',
  'dumbbell-shoulder-press': 'push_vertical',
  'machine-shoulder-press': 'push_vertical',
} as const satisfies Record<string, MovementFamily>;

export type MappedDanbaekExerciseId = keyof typeof DanbaekLearningExerciseMap;

export function getDanbaekMovementFamily(exerciseId: string): MovementFamily | undefined {
  return DanbaekLearningExerciseMap[exerciseId as MappedDanbaekExerciseId];
}
