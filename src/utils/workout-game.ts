import { getWorkoutMonster } from '@/config/workout-monsters';
import type { ResolvedExercise } from '@/types/exercise';
import type { WorkoutSetEntry } from '@/types/workout';
import type { WorkoutAttackEvent } from '@/types/workout-game';
import { isEffectiveSet } from '@/utils/workout-session';

/**
 * 실제 세트 → 게임 공격의 단일 경계.
 *
 * - 무효 세트는 공격하지 않는다.
 * - SP/Stage/BodyParameters/XP를 계산하거나 변경하지 않는다.
 * - 별도 Stage/전투 세션을 만들지 않는다.
 * - 같은 실제 운동 동작을 게임 표현으로 번역할 뿐이다.
 */
export function resolveWorkoutAttack(
  exercise: Pick<ResolvedExercise, 'id' | 'name' | 'primaryMuscleGroup'>,
  set: WorkoutSetEntry
): WorkoutAttackEvent | null {
  if (!isEffectiveSet(set)) return null;

  const monster = getWorkoutMonster(exercise.id, exercise.primaryMuscleGroup);
  return {
    exerciseId: exercise.id,
    monster,
    hitCount: 1,
    copy: `${exercise.name} 공격! ${monster.name}에게 적중`,
  };
}
