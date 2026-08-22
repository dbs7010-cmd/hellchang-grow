import { AppConfig } from '@/config/app-config';
import { resolveBodyGoal } from '@/config/body-goals';
import type { BodyGoalId } from '@/config/body-goals';
import { getThisWeekRecords } from '@/data/workout-repository';
import { isEffectiveSet } from '@/utils/workout-session';
import type { BodyHistoryEntry } from '@/types/body';
import type { ExerciseDefinition } from '@/types/exercise';
import type { Routine } from '@/types/routine';
import type { StreakState } from '@/types/streak';
import type { UserProfile } from '@/types/user';
import type { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';
import { todayDateString } from '@/utils/date';
import { listPRs } from '@/utils/exercise-history';
import { effectiveSetDetails, sumVolumeKg } from '@/utils/workout-stats';

/**
 * PT(스탠리)에게 넘기는 압축 컨텍스트.
 *
 * 원칙 두 가지만 지킨다.
 *  1. **실제 저장된 데이터만 담는다.** 값이 없으면 null이다 — 평균값이나 추정치로 채우지 않는다.
 *     여기서 지어낸 숫자는 그대로 PT의 입에서 "사실"처럼 나온다.
 *  2. **앱 전체를 보내지 않는다.** 최근 운동/최근 PR은 개수 상한(AppConfig)을 두고 자른다.
 *
 * 순수 함수다 — 저장소/네트워크를 건드리지 않고, 오늘 날짜도 인자로 받는다.
 * scripts/verify-pt-context.ts가 기록 있음/없음/신체값 없음/세션 중 시나리오를 검증한다.
 */

export interface PtContextSetSummary {
  weightKg: number;
  reps: number;
}

export interface PtContextExercise {
  exerciseId: string;
  name: string;
  date: string;
  /** 그날 그 운동에서 가장 무거웠던 완료 세트. 중량/횟수가 없는 운동이면 null. */
  topSet: PtContextSetSummary | null;
  setCount: number;
}

export interface PtContextPr {
  exerciseId: string;
  name: string;
  weightKg: number;
  date: string;
  /** 이전 최고 중량. 이 운동을 처음 한 것이면 null. */
  previousBestWeightKg: number | null;
}

export interface PtContext {
  today: {
    date: string;
    workoutCompleted: boolean;
    /** 지금 진행 중인 세션이 있으면 그 요약. 없으면 null. */
    activeSession: {
      status: WorkoutSession['status'];
      currentExerciseName: string | null;
      completedSets: number;
    } | null;
  };
  profile: {
    goal: BodyGoalId;
    heightCm: number | null;
    /** 사용자가 직접 입력한 최신 값만 — 앱이 계산한 값이 아니다. */
    weightKg: number | null;
    skeletalMuscleKg: number | null;
    bodyFatPercent: number | null;
  };
  recentTraining: {
    lastWorkoutDate: string | null;
    totalWorkoutCount: number;
    weeklyWorkoutCount: number;
    weeklyVolumeKg: number;
    streakDays: number;
    recentExercises: PtContextExercise[];
    recentPRs: PtContextPr[];
  };
  currentRoutine: {
    name: string;
    exercises: string[];
    /** 오늘 요일에 예약된 루틴인지 */
    scheduledToday: boolean;
  } | null;
}

/**
 * 가장 무거운 유효 세트 하나. 호출부가 이미 걸러 넘기더라도 함수 자체가 무효 세트를
 * 통과시키지 않도록 같은 기준(isEffectiveSet)을 여기서도 확인한다.
 * 선택 규칙은 그대로다 — 더 무거운 세트가 이기고, 같은 무게면 먼저 나온 세트가 남는다.
 */
function topCompletedSet(sets: WorkoutSetEntry[] | undefined): PtContextSetSummary | null {
  if (!sets) return null;
  let best: PtContextSetSummary | null = null;
  for (const set of sets) {
    if (!isEffectiveSet(set) || set.weightKg === undefined || set.reps === undefined) continue;
    if (!best || set.weightKg > best.weightKg) best = { weightKg: set.weightKg, reps: set.reps };
  }
  return best;
}

/**
 * 최근 기록에서 실제로 수행한 운동을 최신순으로 모은다. 같은 운동이 여러 날 있으면 가장
 * 최근 것 하나만 남긴다 — PT가 "최근에 뭘 했는지" 보는 용도이지 전체 로그가 아니다.
 */
function collectRecentExercises(records: WorkoutRecord[], limit: number): PtContextExercise[] {
  const byDateDesc = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const seen = new Set<string>();
  const out: PtContextExercise[] = [];

  for (const record of byDateDesc) {
    for (const exercise of record.exercises ?? []) {
      if (!exercise.exerciseId || seen.has(exercise.exerciseId)) continue;
      // 과거 버전이 저장한 무효 세트(횟수 없음/0회)는 PT에게 말하는 세트 수에서 뺀다 —
      // 히스토리 통계와 같은 기준이며, 저장된 기록은 건드리지 않는다.
      const completed = effectiveSetDetails(exercise);
      // setDetails가 없는 옛 기록은 요약값(sets/weightKg/reps)으로 근사한다.
      const setCount = completed ? completed.length : (exercise.sets ?? 0);
      if (setCount === 0) continue;
      const topSet =
        topCompletedSet(completed) ??
        (exercise.weightKg !== undefined && exercise.reps !== undefined
          ? { weightKg: exercise.weightKg, reps: exercise.reps }
          : null);

      seen.add(exercise.exerciseId);
      out.push({ exerciseId: exercise.exerciseId, name: exercise.name, date: record.date, topSet, setCount });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function buildPtContext(input: {
  profile: UserProfile | null;
  bodyHistory: BodyHistoryEntry[];
  workoutRecords: WorkoutRecord[];
  streak: StreakState;
  routines: Routine[];
  activeSession: WorkoutSession | null;
  scheduledRoutine?: Routine | null;
  today?: string;
}): PtContext {
  const today = input.today ?? todayDateString();
  const records = input.workoutRecords;
  const weekRecords = getThisWeekRecords(records, today);
  const latestBody = [...input.bodyHistory].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const lastWorkoutDate =
    records.length > 0
      ? records.reduce((latest, record) => (record.date > latest ? record.date : latest), records[0].date)
      : null;

  const activeSession = input.activeSession;
  const isLive = Boolean(activeSession && activeSession.status !== 'completed');
  const currentExercise = activeSession?.exercises.find((e) => e.id === activeSession.currentExerciseId);

  const routine = input.scheduledRoutine ?? null;

  const prs = listPRs(records)
    .slice(-AppConfig.ptContextRecentPrLimit)
    .reverse()
    .map<PtContextPr>((pr) => ({
      exerciseId: pr.exerciseId,
      name: pr.exerciseName,
      weightKg: pr.weightKg,
      date: pr.date,
      previousBestWeightKg: pr.previousBestWeightKg ?? null,
    }));

  return {
    today: {
      date: today,
      workoutCompleted: records.some((record) => record.date === today),
      activeSession: isLive
        ? {
            status: activeSession!.status,
            currentExerciseName: currentExercise?.exerciseName ?? null,
            completedSets: activeSession!.exercises.reduce(
              (sum, exercise) => sum + exercise.sets.filter(isEffectiveSet).length,
              0
            ),
          }
        : null,
    },
    profile: {
      goal: resolveBodyGoal(input.profile?.bodyGoal),
      heightCm: input.profile?.heightCm ?? null,
      weightKg: latestBody?.weightKg ?? input.profile?.weightKg ?? null,
      skeletalMuscleKg: latestBody?.skeletalMuscleKg ?? null,
      bodyFatPercent: latestBody?.bodyFatPercent ?? null,
    },
    recentTraining: {
      lastWorkoutDate,
      totalWorkoutCount: records.length,
      weeklyWorkoutCount: weekRecords.length,
      weeklyVolumeKg: Math.round(sumVolumeKg(weekRecords)),
      streakDays: input.streak.currentStreakDays,
      recentExercises: collectRecentExercises(records, AppConfig.ptContextRecentExerciseLimit),
      recentPRs: prs,
    },
    currentRoutine: routine
      ? {
          name: routine.name,
          exercises: routine.exerciseIds,
          scheduledToday: true,
        }
      : null,
  };
}

/**
 * PT가 특정 운동을 물었을 때 함께 넘기는 앱 내부 운동 데이터.
 * 운동 상세 화면이 보여주는 것과 같은 출처라 설명이 서로 어긋나지 않는다.
 */
export interface PtExerciseBrief {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  instructions: string | null;
  cautions: string | null;
  /** 이 운동의 내 최근 수행 (없으면 null) */
  myRecent: PtContextExercise | null;
}

/**
 * 그 단어 하나만으로는 운동을 특정할 수 없는 말들.
 * "기록 어때?"의 '기록'이 운동으로 잡히거나, "힙 어브덕션 머신"의 '머신'이 머신로우로
 * 잡히는 것을 막는다 — 엉뚱한 운동의 기록을 그 운동인 척 말하게 되기 때문이다.
 */
const ExerciseMatchStopWords = [
  '기록', '오늘', '운동', '루틴', '무게', '세트', '횟수', '이번', '최근',
  '머신', '덤벨', '바벨', '케이블', '스미스', '맨몸',
];

/**
 * 질문 문장에서 앱 운동 DB의 운동을 찾는다. **DB에 있는 운동만** 돌려준다 —
 * 여기서 못 찾으면 PT는 특정 운동 이야기를 하지 않는다(없는 운동을 만들지 않는다).
 *
 * "벤치프레스 어때요?"처럼 정식 이름이 들어오면 그대로, "벤치 기록 어때?"처럼 줄여 부르면
 * 단어 단위로 별칭/부분 일치를 찾는다. 여러 개가 걸리면 가장 일반적인(이름이 짧은) 것을 쓴다.
 */
export function matchExerciseInText(
  text: string,
  exerciseDb: ExerciseDefinition[],
  search: (query: string) => ExerciseDefinition[]
): ExerciseDefinition | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const byFullName = exerciseDb
    .filter((exercise) => trimmed.includes(exercise.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (byFullName) return byFullName;

  const tokens = trimmed
    .split(/[^0-9A-Za-z가-힣]+/)
    .filter((token) => token.length >= 2 && !ExerciseMatchStopWords.includes(token));

  for (const token of tokens) {
    const matches = search(token);
    if (matches.length === 0 || matches.length === exerciseDb.length) continue;
    return [...matches].sort((a, b) => a.name.length - b.name.length)[0];
  }
  return null;
}

export function buildPtExerciseBrief(
  exercise: ExerciseDefinition,
  records: WorkoutRecord[]
): PtExerciseBrief {
  const [recent] = collectRecentExercises(
    records.filter((record) => (record.exercises ?? []).some((e) => e.exerciseId === exercise.id)),
    1
  ).filter((entry) => entry.exerciseId === exercise.id);

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    equipment: exercise.equipment,
    instructions: exercise.instructions ?? null,
    cautions: exercise.cautions ?? null,
    myRecent: recent ?? null,
  };
}
