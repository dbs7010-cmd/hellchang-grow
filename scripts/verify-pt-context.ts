// Standalone verification for the PT context builder + free-PT lines (no AI, no IO).
// Run: npm run verify:pt
import { AppConfig } from '@/config/app-config';
import { Exercises, searchExercises } from '@/config/exercises';
import { countPeriodPRs, listPRs } from '@/utils/exercise-history';
import { buildPtContext, matchExerciseInText } from '@/utils/pt-context';
import {
  buildExerciseRecordLine,
  buildPrLine,
  buildRecentTrainingLine,
  buildStatusLine,
  buildTrainerBrief,
  buildWeeklyLine,
} from '@/utils/trainer-brief';
import type { StreakState } from '@/types/streak';
import type { UserProfile } from '@/types/user';
import type { WorkoutRecord } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';
import type { Routine } from '@/types/routine';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (!pass) {
    failures++;
    console.log('  expected:', expected);
    console.log('  actual:  ', actual);
  }
}

const TODAY = '2026-08-21'; // 금요일
const emptyStreak: StreakState = { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false };

const profile: UserProfile = {
  id: 'u1',
  createdAt: '2026-08-01T00:00:00.000Z',
  genderExpression: 'male',
  bodyPresetId: 'balanced',
  bodyParameters: { size: 50, tone: 50 },
  heightCm: 176,
  weightKg: 74.2,
  bodyGoal: 'balanced',
  setupMethod: 'preset',
};

function record(overrides: Partial<WorkoutRecord>): WorkoutRecord {
  return {
    id: 'r',
    date: '2026-08-20',
    category: 'strength',
    title: '가슴 세션',
    completed: true,
    createdAt: '2026-08-20T09:00:00.000Z',
    ...overrides,
  };
}

const benchRecord = record({
  id: 'r1',
  date: '2026-08-20',
  exercises: [
    {
      id: 'e1',
      exerciseId: 'bench-press',
      name: '벤치프레스',
      sets: 2,
      setDetails: [
        { id: 's1', weightKg: 80, reps: 10, completed: true },
        { id: 's2', weightKg: 80, reps: 8, completed: true },
      ],
    },
  ],
});

const squatRecord = record({
  id: 'r2',
  date: '2026-08-18',
  title: '하체 세션',
  exercises: [
    {
      id: 'e2',
      exerciseId: 'squat',
      name: '스쿼트',
      sets: 1,
      setDetails: [{ id: 's3', weightKg: 100, reps: 5, completed: true }],
    },
  ],
});

// 1. 기록이 하나도 없는 사용자 — 없는 값을 만들어내지 않는다
{
  const context = buildPtContext({
    profile: null,
    bodyHistory: [],
    workoutRecords: [],
    streak: emptyStreak,
    routines: [],
    activeSession: null,
    today: TODAY,
  });

  check('no profile means no body numbers at all', context.profile, {
    goal: 'balanced',
    heightCm: null,
    weightKg: null,
    skeletalMuscleKg: null,
    bodyFatPercent: null,
  });
  check('no records means lastWorkoutDate is null', context.recentTraining.lastWorkoutDate, null);
  check('no records means zero counts, not invented ones', {
    total: context.recentTraining.totalWorkoutCount,
    weekly: context.recentTraining.weeklyWorkoutCount,
    volume: context.recentTraining.weeklyVolumeKg,
  }, { total: 0, weekly: 0, volume: 0 });
  check('no records means no recent exercises and no PRs', {
    exercises: context.recentTraining.recentExercises.length,
    prs: context.recentTraining.recentPRs.length,
  }, { exercises: 0, prs: 0 });
  check('no routine means null, not a made-up one', context.currentRoutine, null);
  check('nothing today', { done: context.today.workoutCompleted, session: context.today.activeSession },
    { done: false, session: null });
  check('the free PT says there is nothing to look at yet',
    buildStatusLine(context), '아직 기록이 없네요. 오늘 하나 찍으시죠.');
  check('the weekly line admits an empty week', buildWeeklyLine(context), '이번 주 기록 없음');
  check('the recent line admits there are no sets', buildRecentTrainingLine(context), '최근 세트 기록이 없어서 볼 게 없습니다.');
  check('no PR line is invented when there is no PR', buildPrLine(context), null);
}

// 2. 신체 수치를 한 번도 입력하지 않은 사용자 — 온보딩 체중만 있고 나머지는 null
{
  const context = buildPtContext({
    profile,
    bodyHistory: [],
    workoutRecords: [benchRecord],
    streak: { currentStreakDays: 2, longestStreakDays: 5, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: TODAY,
  });

  check('falls back to the onboarding weight only', context.profile.weightKg, 74.2);
  check('never guesses muscle mass', context.profile.skeletalMuscleKg, null);
  check('never guesses body fat', context.profile.bodyFatPercent, null);
}

// 3. 기록이 있는 사용자 — 숫자가 전부 실제 기록에서 나온다
{
  const context = buildPtContext({
    profile,
    bodyHistory: [
      { id: 'b1', date: '2026-08-20', weightKg: 74.2, bodyFatPercent: 18.4, source: 'manual' },
      { id: 'b0', date: '2026-08-01', weightKg: 76, source: 'manual' },
    ],
    workoutRecords: [benchRecord, squatRecord],
    streak: { currentStreakDays: 5, longestStreakDays: 9, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: TODAY,
  });

  check('uses the most recent body entry, not the oldest', context.profile.weightKg, 74.2);
  check('body fat comes from the entry the user typed', context.profile.bodyFatPercent, 18.4);
  check('last workout date is the newest record', context.recentTraining.lastWorkoutDate, '2026-08-20');
  check('weekly count covers this week only (Mon 8/17~)', context.recentTraining.weeklyWorkoutCount, 2);
  check('weekly volume matches the completed sets', context.recentTraining.weeklyVolumeKg, 80 * 10 + 80 * 8 + 100 * 5);
  check('recent exercises are newest first with their top set',
    context.recentTraining.recentExercises.map((e) => `${e.name} ${e.topSet?.weightKg}x${e.topSet?.reps} ${e.date}`),
    ['벤치프레스 80x10 2026-08-20', '스쿼트 100x5 2026-08-18']);
  check('the free PT quotes the real top set',
    buildRecentTrainingLine(context), '최근에 벤치프레스 80kg × 10회, 스쿼트 100kg × 5회 하셨습니다.');
  check('the weekly line quotes real numbers', buildWeeklyLine(context), '이번 주 2회 · 볼륨 1,940kg · 연속 5일');
  check('an exercise with no record is reported as missing, not guessed',
    buildExerciseRecordLine('데드리프트', null), '아직 데드리프트 기록이 없네요.');
  check('an exercise with a record is quoted exactly',
    buildExerciseRecordLine('벤치프레스', context.recentTraining.recentExercises[0]),
    '최근 벤치프레스가 80kg 10회입니다 (2026-08-20).');
}

// 4. 같은 운동을 여러 날 했으면 가장 최근 것 하나만, 그리고 개수 상한을 지킨다
{
  const many: WorkoutRecord[] = Array.from({ length: 12 }, (_, i) => {
    const day = String(10 + i).padStart(2, '0');
    return record({
      id: `m${i}`,
      date: `2026-08-${day}`,
      exercises: [
        {
          id: `e${i}`,
          exerciseId: `exercise-${i}`,
          name: `운동 ${i}`,
          sets: 1,
          setDetails: [{ id: `s${i}`, weightKg: 50 + i, reps: 5, completed: true }],
        },
        {
          id: 'dup',
          exerciseId: 'bench-press',
          name: '벤치프레스',
          sets: 1,
          setDetails: [{ id: `d${i}`, weightKg: 60 + i, reps: 5, completed: true }],
        },
      ],
    });
  });

  const context = buildPtContext({
    profile,
    bodyHistory: [],
    workoutRecords: many,
    streak: emptyStreak,
    routines: [],
    activeSession: null,
    today: TODAY,
  });

  check('recent exercises are capped by config',
    context.recentTraining.recentExercises.length, AppConfig.ptContextRecentExerciseLimit);
  check('the same exercise is never listed twice',
    new Set(context.recentTraining.recentExercises.map((e) => e.exerciseId)).size,
    context.recentTraining.recentExercises.length);
  check('recent PRs are capped by config',
    context.recentTraining.recentPRs.length, AppConfig.ptContextRecentPrLimit);
  check('recent PRs are newest first', context.recentTraining.recentPRs[0].date, '2026-08-21');
}

// 5. 진행 중인 세션 / 오늘 완료 여부
{
  const session: WorkoutSession = {
    id: 'session-1',
    startedAt: `${TODAY}T09:00:00.000Z`,
    activeSince: `${TODAY}T09:00:00.000Z`,
    accumulatedSeconds: 0,
    status: 'active',
    primaryCategory: 'strength',
    exercises: [
      {
        id: 'ex-1',
        exerciseId: 'bench-press',
        exerciseName: '벤치프레스',
        sets: [
          { id: 's1', weightKg: 80, reps: 10, completed: true },
          { id: 's2', weightKg: 80, reps: 8, completed: false },
        ],
      },
    ],
    currentExerciseId: 'ex-1',
    createdAt: `${TODAY}T09:00:00.000Z`,
  };

  const context = buildPtContext({
    profile,
    bodyHistory: [],
    workoutRecords: [],
    streak: emptyStreak,
    routines: [],
    activeSession: session,
    today: TODAY,
  });

  check('an active session is reported with the exercise being done', context.today.activeSession, {
    status: 'active',
    currentExerciseName: '벤치프레스',
    completedSets: 1,
  });
  check('the free PT talks about the set that is actually done',
    buildStatusLine(context), '지금 벤치프레스 하는 중이시죠. 1세트 끝났습니다.');

  const finished = buildPtContext({
    profile,
    bodyHistory: [],
    workoutRecords: [record({ id: 'today', date: TODAY })],
    streak: emptyStreak,
    routines: [],
    activeSession: { ...session, status: 'completed' },
    today: TODAY,
  });
  check('a completed session is not reported as still running', finished.today.activeSession, null);
  check('today is marked done when a record exists for today', finished.today.workoutCompleted, true);
  check('the free PT acknowledges a finished day',
    buildStatusLine(finished), '오늘 운동은 끝내셨네요. 수고하셨습니다.');
}

// 6. 오늘 예약된 루틴은 이름과 운동 목록 그대로 넘어간다
{
  const routine: Routine = {
    id: 'r1',
    name: '가슴 A',
    exerciseIds: ['bench-press', 'pec-deck-fly'],
    scheduledDays: [5],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  const context = buildPtContext({
    profile,
    bodyHistory: [],
    workoutRecords: [],
    streak: emptyStreak,
    routines: [routine],
    activeSession: null,
    scheduledRoutine: routine,
    today: TODAY,
  });
  check('the routine is passed through by name', context.currentRoutine?.name, '가슴 A');
  check('the routine exercises are the stored ids', context.currentRoutine?.exercises, ['bench-press', 'pec-deck-fly']);
}

// 7. PR 목록은 HISTORY의 PR 개수(countPeriodPRs)와 항상 같은 기준이어야 한다
{
  const history = [benchRecord, squatRecord, record({
    id: 'r3',
    date: '2026-08-21',
    exercises: [
      {
        id: 'e3',
        exerciseId: 'bench-press',
        name: '벤치프레스',
        sets: 1,
        setDetails: [{ id: 's4', weightKg: 70, reps: 10, completed: true }],
      },
    ],
  })];

  // 날짜가 서로 다른 기록에서는 두 함수가 같은 사건을 센다.
  check('the PR list and the HISTORY PR count agree', listPRs(history).length, countPeriodPRs(history, history));
  check('the PR list keeps the previous best for context',
    listPRs(history).map((pr) => `${pr.exerciseName} ${pr.weightKg}(${pr.previousBestWeightKg ?? '-'})`),
    ['스쿼트 100(-)', '벤치프레스 80(-)']);

  // 하루에 두 번 운동한 경우: 실제로 한 순서(createdAt)대로 봐야 두 번째가 갱신으로 잡힌다.
  const sameDay = [
    record({
      id: 'am',
      date: '2026-08-22',
      createdAt: '2026-08-22T01:00:00.000Z',
      exercises: [{ id: 'a', exerciseId: 'bench-press', name: '벤치프레스', sets: 1, setDetails: [
        { id: 'sa', weightKg: 82.5, reps: 5, completed: true },
      ] }],
    }),
    record({
      id: 'pm',
      date: '2026-08-22',
      createdAt: '2026-08-22T11:00:00.000Z',
      exercises: [{ id: 'b', exerciseId: 'bench-press', name: '벤치프레스', sets: 1, setDetails: [
        { id: 'sb', weightKg: 85, reps: 3, completed: true },
      ] }],
    }),
  ];
  // 저장 순서가 최신순이어도(실제 저장 구조가 그렇다) 결과는 시간순이어야 한다.
  const prs = listPRs([...sameDay].reverse());
  check('same-day PRs are read in the order they actually happened',
    prs.map((pr) => `${pr.weightKg}(${pr.previousBestWeightKg ?? '-'})`), ['82.5(-)', '85(82.5)']);
}

// 7b. 질문에서 운동을 찾을 때는 앱 DB에 있는 것만 찾는다
{
  const match = (text: string) => matchExerciseInText(text, Exercises, searchExercises)?.name ?? null;
  check('a full exercise name is matched', match('벤치프레스 어때요?'), '벤치프레스');
  check('the longest matching name wins over a shorter one contained in it',
    match('인클라인 벤치프레스 폼 봐주세요'), '인클라인 벤치프레스');
  check('a shortened name is matched through search', match('벤치 기록 어때?'), '벤치프레스');
  check('common words are not treated as exercises', match('오늘 기록 좀 봐주세요'), null);
  check('an exercise that does not exist in the DB is never invented',
    match('힙 어브덕션 머신 어때요?'), null);
}

// 8. 브리핑은 값이 있는 줄만 낸다
{
  const context = buildPtContext({
    profile,
    bodyHistory: [],
    workoutRecords: [benchRecord],
    streak: { currentStreakDays: 1, longestStreakDays: 1, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: TODAY,
  });
  const brief = buildTrainerBrief(context);
  check('the brief has no empty lines', brief.filter((line) => !line.trim()).length, 0);
  check('the brief includes the PR line when a PR exists', brief.some((line) => line.includes('벤치프레스')), true);
}


// ── 저장된 무효 세트는 PT에게 말하는 세트 수에도 들어가지 않는다 ────────────
{
  const pollutedRecord = record({
    id: 'pt-invalid', date: '2026-08-21',
    exercises: [
      { id: 'pi1', exerciseId: 'squat', name: '스쿼트', sets: 3, setDetails: [
        { id: 'q1', weightKg: 100, reps: 5, completed: true },
        { id: 'q2', weightKg: 140, reps: 0, completed: true },
        { id: 'q3', completed: true },
      ] },
      { id: 'pi2', exerciseId: 'pull-up', name: '풀업', sets: 2, setDetails: [
        { id: 'u1', weightKg: 0, reps: 12, completed: true },
      ] },
      { id: 'pi3', exerciseId: 'deadlift', name: '데드리프트', sets: 1, setDetails: [
        { id: 'd1', reps: 0, completed: true },
      ] },
    ],
  });
  const snapshot = JSON.stringify(pollutedRecord);
  const context = buildPtContext({
    profile: null,
    bodyHistory: [],
    workoutRecords: [pollutedRecord],
    streak: { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: TODAY,
  });

  const squat = context.recentTraining.recentExercises.find((exercise) => exercise.exerciseId === 'squat');
  check('F: an invalid stored set is left out of the PT set count', squat?.setCount, 1);
  check('F: the 140kg x 0 set never becomes the top set', squat?.topSet, { weightKg: 100, reps: 5 });

  const pullUp = context.recentTraining.recentExercises.find((exercise) => exercise.exerciseId === 'pull-up');
  check('G: a 0kg x 12 bodyweight set is still reported', pullUp?.setCount, 1);

  check('F: an exercise with only invalid sets is not reported at all',
    context.recentTraining.recentExercises.some((exercise) => exercise.exerciseId === 'deadlift'), false);
  check('I: building the PT context never rewrites the stored record', JSON.stringify(pollutedRecord), snapshot);

  // H: 정상 기록은 그대로다.
  const healthyContext = buildPtContext({
    profile: null,
    bodyHistory: [],
    workoutRecords: [benchRecord],
    streak: { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: TODAY,
  });
  const bench = healthyContext.recentTraining.recentExercises.find((exercise) => exercise.exerciseId === 'bench-press');
  check('H: a healthy record keeps its PT set count', bench?.setCount, 2);
}


// ── topSet 자체도 유효 세트만 고른다 (호출부 필터와 별개로 함수 자체 방어) ──
{
  const ctx = (setDetails: unknown[]) => buildPtContext({
    profile: null,
    bodyHistory: [],
    workoutRecords: [record({
      id: 'pt-top', date: '2026-08-21',
      exercises: [{ id: 'pt-e', exerciseId: 'squat', name: '스쿼트', sets: setDetails.length, setDetails: setDetails as never }],
    })],
    streak: { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: TODAY,
  }).recentTraining.recentExercises.find((exercise) => exercise.exerciseId === 'squat');

  const heavyInvalid = ctx([
    { id: 't1', weightKg: 90, reps: 6, completed: true },
    { id: 't2', weightKg: 140, reps: 0, completed: true },
  ]);
  check('G: a 140kg x 0 set is never chosen as the top set', heavyInvalid?.topSet, { weightKg: 90, reps: 6 });

  const repsLess = ctx([
    { id: 't3', weightKg: 90, reps: 6, completed: true },
    { id: 't4', weightKg: 200, completed: true },
  ]);
  check('H: a reps-less heavy set is excluded from the top set', repsLess?.topSet, { weightKg: 90, reps: 6 });

  const bodyweight = ctx([
    { id: 't5', weightKg: 0, reps: 12, completed: true },
  ]);
  check('I: a 0kg x 12 set is a valid top set', bodyweight?.topSet, { weightKg: 0, reps: 12 });

  const mixed = ctx([
    { id: 't6', weightKg: 60, reps: 10, completed: true },
    { id: 't7', weightKg: 100, reps: 3, completed: true },
    { id: 't8', weightKg: 180, reps: 0, completed: true },
    { id: 't9', completed: true },
  ]);
  check('J: the heaviest effective set still wins', mixed?.topSet, { weightKg: 100, reps: 3 });
  check('J: invalid sets are excluded from the reported count', mixed?.setCount, 2);

  const tie = ctx([
    { id: 't10', weightKg: 80, reps: 10, completed: true },
    { id: 't11', weightKg: 80, reps: 4, completed: true },
  ]);
  check('J: an equal weight keeps the first set (ordering contract unchanged)', tie?.topSet, { weightKg: 80, reps: 10 });

  const healthy = ctx([
    { id: 't12', weightKg: 70, reps: 8, completed: true },
    { id: 't13', weightKg: 75, reps: 6, completed: true },
  ]);
  check('K: a healthy record keeps its top set', healthy?.topSet, { weightKg: 75, reps: 6 });
  check('K: a healthy record keeps its set count', healthy?.setCount, 2);
}

console.log(failures === 0 ? '\nAll PT context checks passed.' : `\n${failures} PT context check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
