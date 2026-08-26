import {
  buildSessionExerciseNavigation,
  formatExerciseNavigationProgress,
} from '@/utils/session-navigation';
import type { WorkoutSession } from '@/types/workout-session';

const session = {
  id: 'session-nav-test',
  status: 'active',
  primaryCategory: 'chest',
  currentExerciseId: 'c',
  exercises: [
    {
      id: 'a', exerciseId: 'bench', exerciseName: '벤치프레스', targetSets: 3,
      sets: [{ id: 'a1', weightKg: 60, reps: 8, completed: true }],
    },
    {
      id: 'b', exerciseId: 'incline', exerciseName: '인클라인', targetSets: 3,
      sets: [],
    },
    {
      id: 'c', exerciseId: 'fly', exerciseName: '플라이', targetSets: 1,
      sets: [{ id: 'c1', weightKg: 20, reps: 12, completed: true }],
    },
  ],
} as unknown as WorkoutSession;

let assertions = 0;
function equal(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message ?? 'values differ'}; expected ${String(expected)}, got ${String(actual)}`);
  }
  assertions += 1;
}

const items = buildSessionExerciseNavigation(session);
equal(items.length, 3);
equal(items[0].selected, false);
equal(items[2].selected, true, 'selection follows currentExerciseId, not routine order');
equal(items[0].completedSets, 1);
equal(items[1].completedSets, 0, 'skipped exercise remains unfinished, not failed');
equal(items[1].complete, false);
equal(items[2].complete, true);
equal(formatExerciseNavigationProgress(items[0]), '1/3');
equal(formatExerciseNavigationProgress(items[2]), '1/1');

const untargeted = {
  ...items[0],
  targetSets: undefined,
  completedSets: 4,
  complete: false,
};
equal(formatExerciseNavigationProgress(untargeted), '4세트');
equal(untargeted.complete, false, 'no target must not invent completion');

console.log(`verify-session-navigation-presentation: ${assertions} PASS`);
