import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type {
  SessionExerciseResult,
  SessionSetResult,
  WorkoutSessionResult,
} from '@/types/growth';
import type { WorkoutRecord } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';
import { findAllTimeBestWeight } from '@/utils/exercise-history';
import { resolveExercise } from '@/utils/exercise-spec';
import { inferMotionFamily } from '@/config/motion-families';

/**
 * 완료된 세션 → GrowthEngine이 소비할 WorkoutSessionResult.
 *
 * 순수 함수다 — Exercise DB도, 과거 기록도, 체중도 전부 인자로 받는다.
 * 완료된(completed) 세트만 결과에 들어간다: 입력만 해두고 체크하지 않은 세트는
 * "실제로 한 운동"이 아니다.
 *
 * 기존 집계(computeCompletedSetsCount / computeTotalVolumeKg / detectPRs)와 같은 규칙을
 * 쓰되, 부위별 분배(volumeByMuscleGroup)와 운동별 상세를 추가로 계산한다.
 */
export function buildWorkoutSessionResult(input: {
  session: WorkoutSession;
  exerciseDb: ExerciseDefinition[];
  /** PR 판정 기준이 되는 과거 기록. 이번 세션의 기록은 포함되지 않은 상태여야 한다. */
  records: WorkoutRecord[];
  bodyWeightKg?: number;
  /** session.endedAt이 아직 없을 때 쓰는 종료 시각. */
  endedAt?: string;
}): WorkoutSessionResult {
  const { session, exerciseDb, records, bodyWeightKg } = input;
  const dbById = new Map(exerciseDb.map((exercise) => [exercise.id, exercise]));

  const exercises: SessionExerciseResult[] = [];
  const volumeByMuscleGroup: Partial<Record<MuscleGroup, number>> = {};
  const personalRecords: WorkoutSessionResult['personalRecords'] = [];

  for (const entry of session.exercises) {
    const completed = entry.sets.filter((set) => set.completed);
    if (completed.length === 0) continue;

    const sets: SessionSetResult[] = completed.map((set) => ({
      weightKg: set.weightKg,
      reps: set.reps,
      volumeKg: set.weightKg !== undefined && set.reps !== undefined ? set.weightKg * set.reps : 0,
    }));

    const definition = dbById.get(entry.exerciseId);
    const resolved = definition ? resolveExercise(definition, exerciseDb) : undefined;

    const totalVolumeKg = sets.reduce((sum, set) => sum + set.volumeKg, 0);
    const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    const weights = sets
      .map((set) => set.weightKg)
      .filter((weight): weight is number => weight !== undefined);
    const maxWeightKg = weights.length > 0 ? Math.max(...weights) : undefined;

    const spDistribution = resolved?.spDistribution ?? {};
    for (const [group, share] of Object.entries(spDistribution) as [MuscleGroup, number][]) {
      volumeByMuscleGroup[group] = (volumeByMuscleGroup[group] ?? 0) + totalVolumeKg * share;
    }

    exercises.push({
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      inExerciseDb: Boolean(resolved),
      animationFamily:
        resolved?.animationFamily ??
        inferMotionFamily({ primaryMuscleGroup: 'fullBody', equipment: 'other' }),
      primaryMuscles: resolved?.primaryMuscles ?? [],
      secondaryMuscles: resolved?.secondaryMuscles ?? [],
      spDistribution,
      sets,
      totalSets: sets.length,
      totalReps,
      totalVolumeKg,
      maxWeightKg,
    });

    // PR 판정 기준은 detectPRs와 동일하다 — 지금까지의 전체 최고 중량을 넘겼는가.
    if (maxWeightKg !== undefined) {
      const previousBestWeightKg = findAllTimeBestWeight(entry.exerciseId, records);
      if (previousBestWeightKg === undefined || maxWeightKg > previousBestWeightKg) {
        personalRecords.push({
          exerciseId: entry.exerciseId,
          exerciseName: entry.exerciseName,
          weightKg: maxWeightKg,
          previousBestWeightKg,
        });
      }
    }
  }

  // 소수점이 끝없이 늘어나지 않게 부위별 볼륨만 반올림한다 (표시/저장 모두에서 읽기 쉽게).
  for (const group of Object.keys(volumeByMuscleGroup) as MuscleGroup[]) {
    volumeByMuscleGroup[group] = Math.round((volumeByMuscleGroup[group] as number) * 10) / 10;
  }

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? input.endedAt ?? new Date(0).toISOString(),
    activeSeconds: session.accumulatedSeconds,
    exercises,
    totalSets: exercises.reduce((sum, exercise) => sum + exercise.totalSets, 0),
    totalReps: exercises.reduce((sum, exercise) => sum + exercise.totalReps, 0),
    totalVolumeKg: exercises.reduce((sum, exercise) => sum + exercise.totalVolumeKg, 0),
    personalRecords,
    bodyWeightKg,
    volumeByMuscleGroup,
  };
}
