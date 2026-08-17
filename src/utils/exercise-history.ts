import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';

export interface PreviousPerformance {
  date: string;
  sets: WorkoutSetEntry[];
  maxWeightKg?: number;
}

function byDateDescending(records: WorkoutRecord[]): WorkoutRecord[] {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * 특정 Exercise ID의 가장 최근 수행 기록(직전 세션/직전 중량/직전 세트 구성)을 찾는다.
 * setDetails가 없는 옛날 기록(WEIGHT CORE 이전)은 요약값(sets/reps/weightKg)로 한 세트짜리
 * 근사치를 만들어 하위 호환한다.
 */
export function findPreviousPerformance(
  exerciseId: string,
  records: WorkoutRecord[]
): PreviousPerformance | null {
  for (const record of byDateDescending(records)) {
    const match = record.exercises?.find((exercise) => exercise.exerciseId === exerciseId);
    if (!match) continue;

    const sets: WorkoutSetEntry[] =
      match.setDetails ??
      (match.weightKg !== undefined || match.reps !== undefined
        ? [{ id: `${match.id}-legacy`, weightKg: match.weightKg, reps: match.reps, completed: true }]
        : []);

    const maxWeightKg = sets.reduce<number | undefined>(
      (max, set) => (set.weightKg !== undefined && set.weightKg > (max ?? 0) ? set.weightKg : max),
      undefined
    );

    return { date: record.date, sets, maxWeightKg };
  }
  return null;
}

/** 사용자가 루틴을 저장하지 않았어도, 특정 부위를 마지막으로 했던 기록을 찾는다 ("지난번 가슴"). */
export function findMostRecentRecordForMuscleGroup(
  muscleGroup: MuscleGroup,
  records: WorkoutRecord[],
  exerciseDb: ExerciseDefinition[]
): WorkoutRecord | null {
  const idToGroup = new Map(exerciseDb.map((exercise) => [exercise.id, exercise.primaryMuscleGroup]));
  return (
    byDateDescending(records).find((record) =>
      record.exercises?.some(
        (exercise) => exercise.exerciseId && idToGroup.get(exercise.exerciseId) === muscleGroup
      )
    ) ?? null
  );
}

export interface PrEvent {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  previousBestWeightKg?: number;
}

/**
 * 최소한 명확하게 판단 가능한 PR만 감지한다: 이번 세션에서 완료한 세트의 최고 중량이
 * 과거 최고 중량보다 높으면 PR (제품 기획 15장 — 1RM 계산 같은 복잡한 로직은 만들지 않는다).
 */
export function detectPRs(session: WorkoutSession, records: WorkoutRecord[]): PrEvent[] {
  const prs: PrEvent[] = [];
  for (const exercise of session.exercises) {
    const completedWeights = exercise.sets
      .filter((set) => set.completed && set.weightKg !== undefined)
      .map((set) => set.weightKg as number);
    if (completedWeights.length === 0) continue;

    const sessionMax = Math.max(...completedWeights);
    const previous = findPreviousPerformance(exercise.exerciseId, records);
    if (previous?.maxWeightKg === undefined || sessionMax > previous.maxWeightKg) {
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        weightKg: sessionMax,
        previousBestWeightKg: previous?.maxWeightKg,
      });
    }
  }
  return prs;
}
