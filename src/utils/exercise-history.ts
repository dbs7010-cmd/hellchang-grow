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

/**
 * 특정 Exercise ID의 전체 기록(최근 세션 하나가 아니라 지금까지 저장된 모든 WorkoutRecord)을
 * 훑어 완료된 세트 중 가장 높았던 중량을 찾는다 — EXERCISE DETAIL의 "최고 기록"에 쓴다.
 * 1RM 추정 같은 복잡한 계산은 하지 않는다.
 */
export function findAllTimeBestWeight(exerciseId: string, records: WorkoutRecord[]): number | undefined {
  let best: number | undefined;
  for (const record of records) {
    const match = record.exercises?.find((exercise) => exercise.exerciseId === exerciseId);
    if (!match) continue;
    const sets = match.setDetails ?? (match.weightKg !== undefined ? [{ weightKg: match.weightKg }] : []);
    for (const set of sets) {
      if (set.weightKg !== undefined && (best === undefined || set.weightKg > best)) {
        best = set.weightKg;
      }
    }
  }
  return best;
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

/**
 * 특정 기간(periodRecords)에 실제로 새 최고 중량이 나온 횟수를 센다 — 전체 기록을
 * 시간순으로 훑으며 그 시점까지의 최고 기록을 갱신한 경우만 센다. PR은 세션 종료
 * 시점에 저장되지 않으므로, HISTORY 통계 화면에서 쓰기 위해 기존 기록에서 다시
 * 계산한다(새 저장 필드를 만들지 않는다).
 */
export function countPeriodPRs(periodRecords: WorkoutRecord[], allRecords: WorkoutRecord[]): number {
  const sorted = [...allRecords].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const bestSoFar = new Map<string, number>();
  const periodIds = new Set(periodRecords.map((record) => record.id));
  let count = 0;

  for (const record of sorted) {
    for (const exercise of record.exercises ?? []) {
      if (!exercise.exerciseId) continue;
      const sets =
        exercise.setDetails ?? (exercise.weightKg !== undefined ? [{ weightKg: exercise.weightKg }] : []);
      const maxInRecord = sets.reduce(
        (max, set) => (set.weightKg !== undefined && set.weightKg > max ? set.weightKg : max),
        0
      );
      if (maxInRecord <= 0) continue;

      const prevBest = bestSoFar.get(exercise.exerciseId) ?? 0;
      if (maxInRecord > prevBest) {
        if (periodIds.has(record.id)) count++;
        bestSoFar.set(exercise.exerciseId, maxInRecord);
      }
    }
  }
  return count;
}

export interface PrRecordEvent {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  date: string;
  /** 이 기록 직전까지의 최고 중량. 이 운동을 처음 한 것이면 undefined. */
  previousBestWeightKg?: number;
}

/**
 * 저장된 기록 전체를 시간순으로 훑어 "그 시점까지의 최고 중량을 갱신한 순간"을 오래된 것부터
 * 모두 모은다 — PT가 "최근에 뭘 깼는지" 말할 때 쓴다. 판정 기준은 countPeriodPRs와 같은
 * 누적 최고 기록이며, 기간 필터 없이 사건 자체를 돌려준다는 점만 다르다
 * (scripts/verify-weight-core.ts가 두 함수의 개수가 항상 일치하는지 검증한다).
 */
export function listPRs(records: WorkoutRecord[]): PrRecordEvent[] {
  // 날짜가 같으면 저장 시각까지 봐서 실제로 한 순서대로 훑는다 — 하루에 두 번 운동한 날에
  // 순서가 뒤집히면 "무엇을 갱신했는지"가 달라진다.
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
  const bestSoFar = new Map<string, number>();
  const events: PrRecordEvent[] = [];

  for (const record of sorted) {
    for (const exercise of record.exercises ?? []) {
      if (!exercise.exerciseId) continue;
      const sets =
        exercise.setDetails ?? (exercise.weightKg !== undefined ? [{ weightKg: exercise.weightKg }] : []);
      const maxInRecord = sets.reduce(
        (max, set) => (set.weightKg !== undefined && set.weightKg > max ? set.weightKg : max),
        0
      );
      if (maxInRecord <= 0) continue;

      const prevBest = bestSoFar.get(exercise.exerciseId);
      if (maxInRecord > (prevBest ?? 0)) {
        events.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          weightKg: maxInRecord,
          date: record.date,
          previousBestWeightKg: prevBest,
        });
        bestSoFar.set(exercise.exerciseId, maxInRecord);
      }
    }
  }
  return events;
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
    // 비교 대상은 "지난번"이 아니라 지금까지의 전체 최고 중량이다. 직전 세션만 보면
    // 100kg를 든 적이 있어도 60kg 다음의 70kg가 PR로 잡혀, EXERCISE DETAIL의 [최고 기록]과
    // HISTORY의 PR 수(countPeriodPRs, 누적 최고 기준)와 서로 다른 말을 하게 된다.
    const previousBest = findAllTimeBestWeight(exercise.exerciseId, records);
    if (previousBest === undefined || sessionMax > previousBest) {
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        weightKg: sessionMax,
        previousBestWeightKg: previousBest,
      });
    }
  }
  return prs;
}
