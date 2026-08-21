import type { ResolvedExercise } from '@/types/exercise';
import type { WorkoutSessionResult } from '@/types/growth';
import type { SpExerciseInput } from '@/utils/growth-calculation';

/**
 * 세션 결과 + Exercise DB → SP 계산 입력.
 *
 * 부하 계산에 필요한 정보(중량을 쓰는지, 맨몸 부하 계수, 세부 부위 분배)는 전부 Exercise
 * DB에서 온다 — 세션 결과 계약을 넓히지 않기 위해 여기서 조회해 채운다. 추정 1RM만은
 * 과거 기록을 아는 세션 결과 쪽에서 이미 계산돼 실려 온다.
 *
 * DB 조회는 인자로 받는다(순수 함수 유지). 엔진은 실제 DB를, 테스트는 원하는 것을 넘긴다.
 *
 * DB에 없는 [직접 추가] 운동은 어느 부위를 키우는지 알 수 없으므로 SP 대상이 아니다 —
 * 운동 기록/XP/streak에는 그대로 남으므로 운동 자체가 사라지는 것은 아니다.
 */
export function buildSpExerciseInputs(
  result: WorkoutSessionResult,
  resolve: (exerciseId: string) => ResolvedExercise | undefined
): SpExerciseInput[] {
  const inputs: SpExerciseInput[] = [];

  for (const exercise of result.exercises) {
    if (exercise.sets.length === 0) continue;
    const resolved = resolve(exercise.exerciseId);
    if (!resolved) continue;

    inputs.push({
      exerciseId: exercise.exerciseId,
      usesWeight: resolved.usesWeight,
      usesBodyWeight: resolved.usesBodyWeight,
      bodyWeightLoadFactor: resolved.bodyWeightLoadFactor,
      muscleSpDistribution: resolved.muscleSpDistribution,
      estimatedOneRepMaxKg: exercise.estimatedOneRepMaxKg,
      sets: exercise.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
    });
  }

  return inputs;
}
