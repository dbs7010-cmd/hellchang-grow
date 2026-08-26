import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';
import { isEffectiveSet } from '@/utils/workout-session';
import { effectiveSetDetails } from '@/utils/workout-stats';

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

    // 과거 버전이 저장한 무효 세트(횟수 없음/0회)는 "지난번 값"이 될 수 없다 —
    // 통계와 같은 기준으로 읽는 순간에만 거른다. 저장된 기록은 그대로 둔다.
    // setDetails가 아예 없는 옛 기록은 기존 요약값 근사 계약을 그대로 쓴다(값을 만들지 않는다).
    const sets: WorkoutSetEntry[] =
      effectiveSetDetails(match) ??
      (match.weightKg !== undefined || match.reps !== undefined
        ? [{ id: `${match.id}-legacy`, weightKg: match.weightKg, reps: match.reps, completed: true }]
        : []);

    // 유효한 세트가 하나도 없으면 그 기록은 건너뛰고 더 이전 기록을 찾는다 —
    // 여기서 멈추면 진짜 마지막 수행 기록을 놓치고 화면에 빈 줄이 뜬다.
    if (sets.length === 0) continue;

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
    // 저장된 무효 세트(횟수 없음)는 최고 기록 후보에서 뺀다 — 원본 기록은 그대로 둔다.
    const sets =
      effectiveSetDetails(match) ?? (match.weightKg !== undefined ? [{ weightKg: match.weightKg }] : []);
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
 * ─────────────────────────────────────────────────────────────────────────────
 * PR (개인 기록)
 *
 * V1은 **단순하고 모호하지 않은 경우만** PR로 친다 (제품 기획 15장). 복잡한 1RM 계산은
 * 여전히 하지 않는다 — 판정에 쓰는 것은 사용자가 실제로 든 무게와 횟수뿐이다.
 *
 * 두 가지가 PR이다.
 *  - `weight`: 그 운동에서 지금까지의 최고 중량을 넘겼다. (V1 초기부터 있던 기준)
 *  - `reps`: **같은 중량으로 전보다 더 많이** 했다. 맨몸 운동처럼 중량이 늘지 않는 종목은
 *    이것이 유일한 성장 표시다 — 중량 기준만 두면 풀업/푸쉬업은 영원히 PR이 없다.
 *
 * 처음 해보는 중량에서는 rep PR이 나지 않는다. 그러지 않으면 새 무게를 고를 때마다
 * "첫 기록이니까 PR"이 터져서 PR이라는 말이 값을 잃는다. 첫 최고 중량은 weight PR이
 * 이미 잡는다. 한 운동에서 두 종류가 동시에 나면 weight 쪽만 남긴다 — 같은 세션의 같은
 * 운동으로 보상을 두 번 주지 않는다.
 *
 * 판정 함수는 세 곳에서 같은 규칙을 쓴다: 세션 중 실시간(detectPRs), 저장된 기록 전체
 * (listPRs), 기간 통계(countPeriodPRs). countPeriodPRs는 listPRs를 그대로 세므로 둘의
 * 숫자가 어긋날 수 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type PrKind = 'weight' | 'reps';

/** 맨몸(중량 없음/0kg)도 하나의 중량 구간으로 다룬다 — 그래야 횟수 기록이 비교된다. */
function weightBucket(weightKg?: number): number {
  return weightKg ?? 0;
}

interface ExerciseBests {
  bestWeightKg?: number;
  /** 중량별 최고 횟수. key는 weightBucket() 값이다. */
  bestRepsByWeight: Map<number, number>;
}

type PrSet = Pick<WorkoutSetEntry, 'weightKg' | 'reps'>;

function emptyBests(): ExerciseBests {
  return { bestRepsByWeight: new Map() };
}

/** 한 번의 수행(같은 운동의 세트들)을 지금까지의 최고 기록에 반영한다. */
function applyToBests(bests: ExerciseBests, sets: PrSet[]): void {
  for (const set of sets) {
    if (set.weightKg !== undefined && set.weightKg > 0) {
      if (bests.bestWeightKg === undefined || set.weightKg > bests.bestWeightKg) {
        bests.bestWeightKg = set.weightKg;
      }
    }
    if (set.reps !== undefined && set.reps > 0) {
      const key = weightBucket(set.weightKg);
      const prev = bests.bestRepsByWeight.get(key);
      if (prev === undefined || set.reps > prev) bests.bestRepsByWeight.set(key, set.reps);
    }
  }
}

interface PrAchievement {
  kind: PrKind;
  weightKg: number;
  reps?: number;
  previousBestWeightKg?: number;
  previousBestReps?: number;
}

/**
 * 이번 수행이 PR인지 판정한다. bests는 **이 수행 이전까지의** 기록이어야 한다.
 * PR이 아니면 null.
 */
function detectPrForSets(sets: PrSet[], bests: ExerciseBests): PrAchievement | null {
  if (sets.length === 0) return null;

  // 1) 최고 중량 갱신
  const weights = sets
    .map((set) => set.weightKg)
    .filter((weight): weight is number => weight !== undefined && weight > 0);
  if (weights.length > 0) {
    const maxWeightKg = Math.max(...weights);
    if (bests.bestWeightKg === undefined || maxWeightKg > bests.bestWeightKg) {
      return {
        kind: 'weight',
        weightKg: maxWeightKg,
        previousBestWeightKg: bests.bestWeightKg,
      };
    }
  }

  // 2) 같은 중량에서 최고 횟수 갱신. 여러 개면 가장 무거운 쪽 하나만 남긴다.
  let best: PrAchievement | null = null;
  const maxRepsThisTime = new Map<number, number>();
  for (const set of sets) {
    if (set.reps === undefined || set.reps <= 0) continue;
    const key = weightBucket(set.weightKg);
    const prev = maxRepsThisTime.get(key);
    if (prev === undefined || set.reps > prev) maxRepsThisTime.set(key, set.reps);
  }

  for (const [key, reps] of maxRepsThisTime) {
    // 처음 해보는 중량은 rep PR이 아니다 — 비교할 이전 기록이 없다.
    const previousBestReps = bests.bestRepsByWeight.get(key);
    if (previousBestReps === undefined || reps <= previousBestReps) continue;
    if (best === null || key > best.weightKg || (key === best.weightKg && reps > (best.reps ?? 0))) {
      best = { kind: 'reps', weightKg: key, reps, previousBestReps };
    }
  }
  return best;
}

/**
 * 저장된 기록 하나에서 그 운동의 세트를 읽는다. setDetails가 없는 옛 기록(WEIGHT CORE 이전)은
 * 요약값으로 한 세트짜리 근사치를 만든다 — 값을 지어내지는 않는다.
 */
function setsFromRecordExercise(exercise: NonNullable<WorkoutRecord['exercises']>[number]): PrSet[] {
  const details = effectiveSetDetails(exercise);
  if (details) return details;
  /*
    옛 기록에는 세트별 completed 플래그가 없다. 그래서 "실제로 들었는가"를 판단할 단서는
    횟수뿐이고, 0회(또는 없음)는 `isEffectiveSet`이 이미 무효로 보는 값이다. 여기서만
    통과시키면 100kg × 0회짜리 요약이 "최고 중량 100kg 첫 기록"이라는, 한 번도 일어난 적
    없는 성취가 된다. 판정 규칙을 바꾸는 것이 아니라 같은 기준을 옛 요약값에도 적용한다.
  */
  if ((exercise.reps ?? 0) <= 0) return [];
  return [{ weightKg: exercise.weightKg, reps: exercise.reps }];
}

export interface PrRecordEvent {
  exerciseId: string;
  exerciseName: string;
  kind: PrKind;
  /** 갱신이 일어난 중량. rep PR이고 맨몸이면 0이다. */
  weightKg: number;
  /** rep PR에서 달성한 횟수. weight PR이면 undefined. */
  reps?: number;
  date: string;
  /** 이 사건이 나온 기록의 id — 기간 통계가 다시 계산하지 않고 그대로 세기 위한 것. */
  recordId: string;
  /** 이 기록 직전까지의 최고 중량. 이 운동을 처음 한 것이면 undefined. */
  previousBestWeightKg?: number;
  /** rep PR에서, 같은 중량의 직전 최고 횟수. */
  previousBestReps?: number;
}

/**
 * 저장된 기록 전체를 시간순으로 훑어 PR이 나온 순간을 오래된 것부터 모두 모은다 —
 * PT가 "최근에 뭘 깼는지" 말할 때, 그리고 기간 통계가 개수를 셀 때 쓴다.
 */
export function listPRs(records: WorkoutRecord[]): PrRecordEvent[] {
  // 날짜가 같으면 저장 시각까지 봐서 실제로 한 순서대로 훑는다 — 하루에 두 번 운동한 날에
  // 순서가 뒤집히면 "무엇을 갱신했는지"가 달라진다.
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
  const bestsByExercise = new Map<string, ExerciseBests>();
  const events: PrRecordEvent[] = [];

  for (const record of sorted) {
    for (const exercise of record.exercises ?? []) {
      if (!exercise.exerciseId) continue;
      const sets = setsFromRecordExercise(exercise);
      if (sets.length === 0) continue;

      const bests = bestsByExercise.get(exercise.exerciseId) ?? emptyBests();
      const achievement = detectPrForSets(sets, bests);
      if (achievement) {
        events.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          date: record.date,
          recordId: record.id,
          ...achievement,
        });
      }
      applyToBests(bests, sets);
      bestsByExercise.set(exercise.exerciseId, bests);
    }
  }
  return events;
}

/**
 * 특정 기간(periodRecords)에 나온 PR 개수. 판정은 listPRs 하나에서만 나오므로 HISTORY의
 * 숫자와 PT가 말하는 사건이 어긋날 수 없다.
 */
export function countPeriodPRs(periodRecords: WorkoutRecord[], allRecords: WorkoutRecord[]): number {
  const periodIds = new Set(periodRecords.map((record) => record.id));
  return listPRs(allRecords).filter((event) => periodIds.has(event.recordId)).length;
}

export interface PrEvent {
  exerciseId: string;
  exerciseName: string;
  kind: PrKind;
  /** 갱신이 일어난 중량. rep PR이고 맨몸이면 0이다. */
  weightKg: number;
  /** rep PR에서 달성한 횟수. */
  reps?: number;
  previousBestWeightKg?: number;
  previousBestReps?: number;
}

/** 저장된 기록에서 운동별 최고 기록을 모은다 (이번 세션은 포함하지 않은 상태여야 한다). */
function collectBests(records: WorkoutRecord[]): Map<string, ExerciseBests> {
  const bestsByExercise = new Map<string, ExerciseBests>();
  for (const record of records) {
    for (const exercise of record.exercises ?? []) {
      if (!exercise.exerciseId) continue;
      const bests = bestsByExercise.get(exercise.exerciseId) ?? emptyBests();
      applyToBests(bests, setsFromRecordExercise(exercise));
      bestsByExercise.set(exercise.exerciseId, bests);
    }
  }
  return bestsByExercise;
}

/**
 * 진행 중인 세션에서 지금까지 완료한 세트로 PR을 판정한다.
 *
 * 비교 대상은 "지난번"이 아니라 지금까지의 전체 최고 기록이다. 직전 세션만 보면 100kg를
 * 든 적이 있어도 60kg 다음의 70kg가 PR로 잡혀, EXERCISE DETAIL의 [최고 기록]이나 HISTORY의
 * PR 수와 서로 다른 말을 하게 된다.
 */
export function detectPRs(session: WorkoutSession, records: WorkoutRecord[]): PrEvent[] {
  const bestsByExercise = collectBests(records);
  const prs: PrEvent[] = [];

  for (const exercise of session.exercises) {
    // 체크만 하고 횟수가 없는 세트는 기록이 아니다 — PR 후보도 아니다.
    const sets: PrSet[] = exercise.sets.filter(isEffectiveSet);
    if (sets.length === 0) continue;

    const bests = bestsByExercise.get(exercise.exerciseId) ?? emptyBests();
    const achievement = detectPrForSets(sets, bests);
    if (!achievement) continue;

    prs.push({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      ...achievement,
    });
  }
  return prs;
}

/**
 * PR 한 줄을 화면에 어떻게 쓸지 한 곳에서 정한다 — 세션 축하 오버레이, 종료 요약, PT가
 * 서로 다른 문장을 쓰지 않도록.
 */
export function describePrAchievement(pr: Pick<PrEvent, 'kind' | 'weightKg' | 'reps'>): string {
  if (pr.kind === 'weight') return `${pr.weightKg}kg`;
  return pr.weightKg > 0 ? `${pr.weightKg}kg × ${pr.reps}회` : `맨몸 ${pr.reps}회`;
}

/** PR 직전 기록을 어떻게 쓸지. 첫 기록이면 null을 돌려주고 화면이 "첫 기록"으로 쓴다. */
export function describePrPrevious(
  pr: Pick<PrEvent, 'kind' | 'weightKg' | 'previousBestWeightKg' | 'previousBestReps'>
): string | null {
  if (pr.kind === 'weight') {
    return pr.previousBestWeightKg !== undefined ? `${pr.previousBestWeightKg}kg` : null;
  }
  if (pr.previousBestReps === undefined) return null;
  return pr.weightKg > 0
    ? `${pr.weightKg}kg × ${pr.previousBestReps}회`
    : `맨몸 ${pr.previousBestReps}회`;
}
