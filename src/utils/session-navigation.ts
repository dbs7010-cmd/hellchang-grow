import type { SessionExerciseEntry, WorkoutSession } from '@/types/workout-session';
import { isEffectiveSet } from '@/utils/workout-session';

/**
 * Presentation-only model for free exercise navigation.
 *
 * A routine is a recommendation, not a sequence. Nothing here mutates the
 * session, chooses a next exercise, or changes workout/growth accounting.
 */
export interface SessionExerciseNavigationItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  selected: boolean;
  completedSets: number;
  targetSets?: number;
  complete: boolean;
}

function toNavigationItem(
  exercise: SessionExerciseEntry,
  currentExerciseId: string | undefined
): SessionExerciseNavigationItem {
  const completedSets = exercise.sets.filter(isEffectiveSet).length;
  const targetSets = exercise.targetSets;

  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    selected: exercise.id === currentExerciseId,
    completedSets,
    targetSets,
    // No target means there is no product-defined point at which the exercise
    // should be presented as "done". Never invent one here.
    complete: targetSets !== undefined && targetSets > 0 && completedSets >= targetSets,
  };
}

export function buildSessionExerciseNavigation(
  session: WorkoutSession
): SessionExerciseNavigationItem[] {
  return session.exercises.map((exercise) =>
    toNavigationItem(exercise, session.currentExerciseId)
  );
}

/** Compact progress copy for the selector. It deliberately describes sets,
 * not a mandatory routine position such as "exercise 2/5". */
export function formatExerciseNavigationProgress(
  item: SessionExerciseNavigationItem
): string {
  if (item.targetSets !== undefined && item.targetSets > 0) {
    return `${item.completedSets}/${item.targetSets}`;
  }
  return `${item.completedSets}세트`;
}
