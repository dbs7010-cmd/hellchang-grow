import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { Routine } from '@/types/routine';
import type { WorkoutRecord } from '@/types/workout';
import { resolveExercise } from '@/utils/exercise-spec';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';

/**
 * [운동 시작]을 눌렀을 때 보여줄 "바로 시작" 후보를 만든다 — 전부 순수 함수다.
 *
 * START WORKOUT FIRST: 화면은 여기서 나온 후보를 그대로 그리기만 하고, 눌리면 바로
 * `startWorkoutSession()`으로 간다. 긴 입력 폼도, 확인 단계도 끼워 넣지 않는다.
 *
 * 우선순위(제품 요구):
 *   1) 지난 루틴 계속하기 — 오늘 예약된 루틴 > 마지막으로 수행한 루틴 > 지난 운동 그대로
 *   2) 오늘 추천        — 가장 오래 쉰 부위 + 그 부위에서 내가 자주 하던 운동
 *   3) 직접 선택        — 후보가 하나도 없어도 항상 가능한 경로(화면이 보장한다)
 */

export interface QuickStartExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets?: number;
  defaultRestSeconds?: number;
}

/**
 * 이 후보가 어디서 나왔는지. 화면 문구는 이 값으로 고른다 — 문구를 여기에 박지 않는다
 * (같은 데이터를 다른 화면이 다르게 부를 수 있어야 한다).
 */
export type ContinueSource = 'scheduledRoutine' | 'lastRoutine' | 'lastRecord';

export interface ContinueOption {
  source: ContinueSource;
  /** 루틴 이름, 또는 지난 기록의 제목 */
  name: string;
  /** 루틴에서 온 후보만 값이 있다 (완료 시 루틴 완료 판정에 쓴다). */
  routineId?: string;
  /** 'lastRecord'일 때 그 기록의 날짜 (YYYY-MM-DD) */
  date?: string;
  exercises: QuickStartExercise[];
}

export interface RecommendedOption {
  muscleGroup: MuscleGroup;
  exercises: QuickStartExercise[];
}

export interface QuickStartPlan {
  /** 이어서 할 만한 것이 아무것도 없으면 null (첫 사용자). */
  continueOption: ContinueOption | null;
  recommended: RecommendedOption;
}

function toQuickStartExercise(
  exercise: ExerciseDefinition,
  db: ExerciseDefinition[]
): QuickStartExercise {
  const resolved = resolveExercise(exercise, db);
  return {
    exerciseId: resolved.id,
    exerciseName: resolved.name,
    targetSets: resolved.defaultSets,
    defaultRestSeconds: resolved.defaultRestSeconds,
  };
}

function routineExercises(routine: Routine, db: ExerciseDefinition[]): QuickStartExercise[] {
  return routine.exerciseIds
    .map((id) => db.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is ExerciseDefinition => Boolean(exercise))
    .map((exercise) => toQuickStartExercise(exercise, db));
}

/**
 * 기록에 담긴 운동을 그대로 후보로 만든다. DB에 없는 [직접 추가] 운동도 이름 그대로 살린다 —
 * 지난번에 한 운동을 다음번에 못 고르면 "지난 운동 그대로"가 거짓말이 된다.
 */
function recordExercises(record: WorkoutRecord, db: ExerciseDefinition[]): QuickStartExercise[] {
  return (record.exercises ?? []).map((entry) => {
    const definition = entry.exerciseId
      ? db.find((exercise) => exercise.id === entry.exerciseId)
      : undefined;
    if (definition) return toQuickStartExercise(definition, db);
    return {
      exerciseId: entry.exerciseId ?? entry.id,
      exerciseName: entry.name,
      targetSets: entry.sets,
    };
  });
}

function byDateDescending(records: WorkoutRecord[]): WorkoutRecord[] {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * 마지막으로 수행한 루틴을 찾는다. 세션은 루틴 이름을 기록 제목으로 그대로 남기므로
 * (`sessionToWorkoutRecordInput`), 제목이 루틴 이름과 같은 가장 최근 기록을 되짚는다.
 * 루틴 이름이 바뀌면 매칭이 끊기지만, 그때는 아래 'lastRecord' 후보가 대신 나온다.
 */
function findLastUsedRoutine(routines: Routine[], records: WorkoutRecord[]): Routine | null {
  const byName = new Map(routines.map((routine) => [routine.name.trim(), routine]));
  for (const record of byDateDescending(records)) {
    const routine = byName.get(record.title.trim());
    if (routine) return routine;
  }
  return null;
}

export function buildQuickStartPlan(input: {
  routines: Routine[];
  records: WorkoutRecord[];
  exerciseDb: ExerciseDefinition[];
  muscleGroups: MuscleGroup[];
  /** Date.getDay() 규칙(0=일~6=토) */
  dayOfWeek: number;
  /** 추천 후보 개수 상한 */
  recommendedLimit: number;
}): QuickStartPlan {
  const { routines, records, exerciseDb, dayOfWeek } = input;

  let continueOption: ContinueOption | null = null;

  const scheduled = getTodaysScheduledRoutine(routines, dayOfWeek);
  const lastUsed = findLastUsedRoutine(routines, records);
  const routine = scheduled ?? lastUsed;

  if (routine) {
    const exercises = routineExercises(routine, exerciseDb);
    if (exercises.length > 0) {
      continueOption = {
        source: scheduled ? 'scheduledRoutine' : 'lastRoutine',
        name: routine.name,
        routineId: routine.id,
        exercises,
      };
    }
  }

  if (!continueOption) {
    const lastRecord = byDateDescending(records).find(
      (record) => (record.exercises?.length ?? 0) > 0
    );
    if (lastRecord) {
      const exercises = recordExercises(lastRecord, exerciseDb);
      if (exercises.length > 0) {
        continueOption = {
          source: 'lastRecord',
          name: lastRecord.title,
          date: lastRecord.date,
          exercises,
        };
      }
    }
  }

  return { continueOption, recommended: buildRecommendedOption(input) };
}

/**
 * 오늘 추천 = 가장 오래 쉰 부위(기존 `recommendMuscleGroup` 재사용) + 그 부위 운동.
 * 내가 실제로 해본 운동을 먼저 채우고, 모자라면 DB 대표 순서로 채운다 — 한 번도 안 해본
 * 기구만 추천해서 "이건 못 해요"가 되는 상황을 줄인다.
 */
export function buildRecommendedOption(input: {
  records: WorkoutRecord[];
  exerciseDb: ExerciseDefinition[];
  muscleGroups: MuscleGroup[];
  recommendedLimit: number;
}): RecommendedOption {
  const { records, exerciseDb, muscleGroups, recommendedLimit } = input;
  const muscleGroup = recommendMuscleGroup(records, exerciseDb, muscleGroups);
  const inGroup = exerciseDb.filter((exercise) => exercise.primaryMuscleGroup === muscleGroup);

  const familiarIds: string[] = [];
  for (const record of byDateDescending(records)) {
    for (const entry of record.exercises ?? []) {
      if (!entry.exerciseId || familiarIds.includes(entry.exerciseId)) continue;
      if (inGroup.some((exercise) => exercise.id === entry.exerciseId)) {
        familiarIds.push(entry.exerciseId);
      }
    }
  }

  const ordered = [
    ...familiarIds
      .map((id) => inGroup.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is ExerciseDefinition => Boolean(exercise)),
    ...inGroup.filter((exercise) => !familiarIds.includes(exercise.id)),
  ];

  return {
    muscleGroup,
    exercises: ordered
      .slice(0, recommendedLimit)
      .map((exercise) => toQuickStartExercise(exercise, exerciseDb)),
  };
}
