// Standalone verification for WORKOUT CORE pure functions:
// Exercise spec resolution (유도 기본값 / motion family / SP 분배), 세션 세트 자동 준비와
// 세트 완료 → 휴식 전이, WorkoutSessionResult 생성, [운동 시작] 빠른 시작 후보 계산.
// Run: npm run verify:workout-core
import { AppConfig } from '@/config/app-config';
import { Exercises, getResolvedExerciseById } from '@/config/exercises';
import { MotionFamilies } from '@/config/motion-families';
import { MuscleGroups } from '@/config/muscle-groups';
import { detectPRs, findPreviousPerformance } from '@/utils/exercise-history';
import { resolveExercise } from '@/utils/exercise-spec';
import {
  addExerciseToSession,
  addSetToExercise,
  completeSet,
  completeSetAndStartRest,
  createSession,
  ensurePendingSet,
  getAutoRestSeconds,
  getNextExercise,
  getRestSecondsRemaining,
  getSetProgress,
  setCurrentExercise,
} from '@/utils/workout-session';
import { buildWorkoutSessionResult } from '@/utils/workout-session-result';
import { buildQuickStartPlan } from '@/utils/workout-start';
import type { Routine } from '@/types/routine';
import type { WorkoutRecord } from '@/types/workout';

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

function record(overrides: Partial<WorkoutRecord>): WorkoutRecord {
  return {
    id: 'r',
    date: '2026-08-01',
    category: 'strength',
    title: '가슴 세션',
    completed: true,
    createdAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

const NOW = new Date('2026-08-20T09:00:00.000Z');
const NOW_ISO = NOW.toISOString();
const NOW_MS = NOW.getTime();

// ── 1. Exercise 공통 데이터 규격 ────────────────────────────────────────────
{
  const bench = getResolvedExerciseById('bench-press')!;
  check('compound barbell lift resolves to the compound defaults', [bench.defaultSets, bench.defaultReps, bench.defaultRestSeconds], [
    AppConfig.exerciseDefaults.compound.sets,
    AppConfig.exerciseDefaults.compound.reps,
    AppConfig.exerciseDefaults.compound.restSeconds,
  ]);
  check('bench press tracks weight, not body weight', [bench.usesWeight, bench.usesBodyWeight], [true, false]);
  check('bench press is flagged for 1RM', bench.uses1RM, true);
  check('bench press keeps its declared motion family', bench.animationFamily, 'horizontal_press');
  check('primary/secondary muscles are exposed as arrays', [bench.primaryMuscles, bench.secondaryMuscles], [
    ['chest'],
    ['arms', 'shoulders'],
  ]);
  check('SP distribution splits the secondary share evenly', bench.spDistribution, {
    arms: 0.15,
    shoulders: 0.15,
    chest: 0.7,
  });
  check('guideId falls back to the exercise id', bench.guideId, 'bench-press');
  check('alternatives prefer a different piece of equipment', bench.alternativeExerciseIds.length, 3);

  const pushUp = getResolvedExerciseById('push-up')!;
  check('bodyweight exercise reports usesBodyWeight and no weight', [pushUp.usesWeight, pushUp.usesBodyWeight], [false, true]);
  check('bodyweight exercise uses the bodyweight defaults', pushUp.defaultSets, AppConfig.exerciseDefaults.bodyweight.sets);
  check('bodyweight exercise is beginner level', pushUp.difficulty, 'beginner');
  check('bodyweight exercise is not a 1RM lift', pushUp.uses1RM, false);

  const plank = getResolvedExerciseById('plank')!;
  check("a duration exercise reads defaultReps as seconds", plank.defaultReps, AppConfig.exerciseDefaults.duration.reps);
  check('a duration exercise never counts as a weight lift', plank.usesWeight, false);

  const machinePress = getResolvedExerciseById('chest-press-machine')!;
  check('machine exercise is beginner level', machinePress.difficulty, 'beginner');
  check('machine exercise still tracks weight (같은 Exercise 모델)', machinePress.usesWeight, true);

  const singleMuscle = getResolvedExerciseById('leg-extension')!;
  check('an exercise with no secondary muscles gives 100% to the primary', singleMuscle.spDistribution, { legs: 1 });

  // 전체 DB 불변식
  const resolved = Exercises.map((exercise) => resolveExercise(exercise, Exercises));
  check(
    'every exercise in the DB has a known motion family',
    resolved.every((exercise) => MotionFamilies.includes(exercise.animationFamily)),
    true
  );
  check(
    'every SP distribution sums to 1.0',
    resolved.every((exercise) => {
      const sum = Object.values(exercise.spDistribution).reduce((total, share) => total + share, 0);
      return Math.abs(sum - 1) < 0.001;
    }),
    true
  );
  check(
    'every exercise has usable set/rep/rest defaults',
    resolved.every(
      (exercise) => exercise.defaultSets > 0 && exercise.defaultReps > 0 && exercise.defaultRestSeconds > 0
    ),
    true
  );
  check(
    'no exercise suggests itself as its own alternative',
    resolved.every((exercise) => !exercise.alternativeExerciseIds.includes(exercise.id)),
    true
  );
}

// ── 2. 세트 자동 준비 / 세트 완료 → 휴식 ────────────────────────────────────
{
  const session = createSession('strength', 's1', NOW_ISO, {
    initialExercises: [
      { exerciseId: 'bench-press', exerciseName: '벤치프레스', targetSets: 4, defaultRestSeconds: 120 },
      { exerciseId: 'cable-fly', exerciseName: '케이블 플라이', targetSets: 3, defaultRestSeconds: 60 },
    ],
  });
  const entryId = session.exercises[0].id;

  const withPending = ensurePendingSet(session, entryId, 'set-1', { weightKg: 60, reps: 10 });
  check('the first pending set is seeded from the previous record', withPending.exercises[0].sets, [
    { id: 'set-1', weightKg: 60, reps: 10, completed: false },
  ]);

  const again = ensurePendingSet(withPending, entryId, 'set-2', { weightKg: 60, reps: 10 });
  check('a pending set is never duplicated', again.exercises[0].sets.length, 1);

  const completed = completeSetAndStartRest(withPending, entryId, 'set-1', 120, NOW_MS);
  check('completing a set records it', completed.exercises[0].sets[0].completed, true);
  check('completing a set starts the rest timer in the same change', getRestSecondsRemaining(completed, NOW_MS), 120);
  check('the chosen rest length is remembered for the ring', completed.restTotalSeconds, 120);

  const noRest = completeSetAndStartRest(withPending, entryId, 'set-1', 0, NOW_MS);
  check('rest is skipped entirely when the length is 0', noRest.restUntilMs, undefined);

  const nextSet = ensurePendingSet(completed, entryId, 'set-2');
  check('the next set reuses the values of the set just finished', nextSet.exercises[0].sets[1], {
    id: 'set-2',
    weightKg: 60,
    reps: 10,
    completed: false,
  });

  check('set progress counts completed sets against the target', getSetProgress(nextSet, entryId), {
    completed: 1,
    target: 4,
  });
  check('auto rest uses the exercise default', getAutoRestSeconds(nextSet, entryId, 90), 120);
  check(
    'auto rest falls back to the app default for an exercise without one',
    getAutoRestSeconds(
      addExerciseToSession(nextSet, { id: 'x', exerciseId: 'custom', exerciseName: '직접 추가' }),
      'x',
      AppConfig.defaultRestSeconds
    ),
    AppConfig.defaultRestSeconds
  );

  check('the next exercise follows the session order', getNextExercise(nextSet)?.exerciseName, '케이블 플라이');
  const onLast = setCurrentExercise(nextSet, session.exercises[1].id);
  check('there is no next exercise after the last one', getNextExercise(onLast), undefined);

  const noTarget = addExerciseToSession(session, { id: 'y', exerciseId: 'custom-2', exerciseName: '직접 추가' });
  check('an exercise without a target reports only the completed count', getSetProgress(noTarget, 'y'), {
    completed: 0,
    target: undefined,
  });
}

// ── 3. WorkoutSessionResult (GrowthEngine 입력) ─────────────────────────────
{
  let session = createSession('strength', 's2', NOW_ISO, {
    initialExercises: [
      { exerciseId: 'bench-press', exerciseName: '벤치프레스', targetSets: 2 },
      { exerciseId: 'my-own-move', exerciseName: '직접 추가한 운동' },
    ],
  });
  session = { ...session, accumulatedSeconds: 1800, endedAt: '2026-08-20T09:30:00.000Z' };
  const benchId = session.exercises[0].id;
  const customId = session.exercises[1].id;

  session = addSetToExercise(session, benchId, 'b1', { weightKg: 80, reps: 5 });
  session = completeSet(session, benchId, 'b1');
  session = addSetToExercise(session, benchId, 'b2', { weightKg: 90, reps: 3 });
  session = completeSet(session, benchId, 'b2');
  // 입력만 하고 완료하지 않은 세트 — 결과에 들어가면 안 된다.
  session = addSetToExercise(session, benchId, 'b3', { weightKg: 100, reps: 1 });
  session = addSetToExercise(session, customId, 'c1', { reps: 20 });
  session = completeSet(session, customId, 'c1');

  const history: WorkoutRecord[] = [
    record({
      id: 'old',
      date: '2026-08-10',
      exercises: [
        {
          id: 'e',
          exerciseId: 'bench-press',
          name: '벤치프레스',
          setDetails: [{ id: 's', weightKg: 85, reps: 5, completed: true }],
        },
      ],
    }),
  ];

  const result = buildWorkoutSessionResult({
    session,
    exerciseDb: Exercises,
    records: history,
    bodyWeightKg: 74.5,
  });

  check('only completed sets reach the result', result.totalSets, 3);
  check('total reps counts every completed rep', result.totalReps, 5 + 3 + 20);
  check('total volume ignores sets without weight', result.totalVolumeKg, 80 * 5 + 90 * 3);
  check('session identity is carried over', [result.sessionId, result.startedAt], ['s2', NOW_ISO]);
  check('active seconds come from the session clock, not wall time', result.activeSeconds, 1800);
  check('body weight is passed through as a read-only input', result.bodyWeightKg, 74.5);

  const bench = result.exercises[0];
  check('per-exercise max weight is the heaviest completed set', bench.maxWeightKg, 90);
  check('an exercise from the DB carries its motion family', bench.animationFamily, 'horizontal_press');
  check('a custom exercise is flagged as outside the DB', result.exercises[1].inExerciseDb, false);
  check('a custom exercise contributes no SP split', result.exercises[1].spDistribution, {});

  // 키 순서는 spDistribution을 훑는 순서를 그대로 따른다 (보조근 → 주동근).
  check('volume is split by muscle group using spDistribution', result.volumeByMuscleGroup, {
    arms: Math.round((80 * 5 + 90 * 3) * 0.15 * 10) / 10,
    shoulders: Math.round((80 * 5 + 90 * 3) * 0.15 * 10) / 10,
    chest: Math.round((80 * 5 + 90 * 3) * 0.7 * 10) / 10,
  });

  check('a new best weight is reported as a personal record', result.personalRecords, [
    {
      exerciseId: 'bench-press',
      exerciseName: '벤치프레스',
      kind: 'weight',
      weightKg: 90,
      previousBestWeightKg: 85,
    },
  ]);
  check(
    'the result agrees with the existing detectPRs judgement',
    result.personalRecords.map((pr) => pr.exerciseId),
    detectPRs(session, history).map((pr) => pr.exerciseId)
  );

  const heavierHistory: WorkoutRecord[] = [
    record({
      id: 'best',
      date: '2026-08-11',
      exercises: [
        {
          id: 'e',
          exerciseId: 'bench-press',
          name: '벤치프레스',
          setDetails: [{ id: 's', weightKg: 120, reps: 1, completed: true }],
        },
      ],
    }),
  ];
  check(
    'no personal record when the all-time best is untouched',
    buildWorkoutSessionResult({ session, exerciseDb: Exercises, records: heavierHistory }).personalRecords,
    []
  );
  check(
    'body weight is omitted rather than invented when unknown',
    buildWorkoutSessionResult({ session, exerciseDb: Exercises, records: [] }).bodyWeightKg,
    undefined
  );
}

// ── 4. [운동 시작] 빠른 시작 후보 ───────────────────────────────────────────
{
  const routines: Routine[] = [
    {
      id: 'routine-chest',
      name: '가슴 A',
      exerciseIds: ['bench-press', 'cable-fly'],
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
    {
      id: 'routine-legs',
      name: '하체 A',
      exerciseIds: ['squat'],
      scheduledDays: [3],
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    },
  ];
  const records: WorkoutRecord[] = [
    record({
      id: 'r1',
      date: '2026-08-18',
      title: '가슴 A',
      exercises: [{ id: 'e1', exerciseId: 'bench-press', name: '벤치프레스', sets: 4 }],
    }),
  ];
  const base = {
    exerciseDb: Exercises,
    muscleGroups: MuscleGroups,
    recommendedLimit: AppConfig.recommendedExerciseCount,
  };

  const wednesday = buildQuickStartPlan({ ...base, routines, records, dayOfWeek: 3 });
  check("today's scheduled routine wins", wednesday.continueOption?.source, 'scheduledRoutine');
  check('the scheduled routine carries its id for completion tracking', wednesday.continueOption?.routineId, 'routine-legs');

  const thursday = buildQuickStartPlan({ ...base, routines, records, dayOfWeek: 4 });
  check('without a scheduled routine, the last used routine is offered', thursday.continueOption?.name, '가슴 A');
  check('the last used routine is recognised as such', thursday.continueOption?.source, 'lastRoutine');
  check('routine exercises arrive with their DB defaults', thursday.continueOption?.exercises[0], {
    exerciseId: 'bench-press',
    exerciseName: '벤치프레스',
    targetSets: AppConfig.exerciseDefaults.compound.sets,
    defaultRestSeconds: AppConfig.exerciseDefaults.compound.restSeconds,
  });

  const noRoutines = buildQuickStartPlan({ ...base, routines: [], records, dayOfWeek: 4 });
  check('with no routines at all, the last session is offered instead', noRoutines.continueOption?.source, 'lastRecord');
  check('the last session keeps the date it happened', noRoutines.continueOption?.date, '2026-08-18');

  const firstRun = buildQuickStartPlan({ ...base, routines: [], records: [], dayOfWeek: 4 });
  check('a brand new user has nothing to continue', firstRun.continueOption, null);
  check('a brand new user still gets a recommendation', firstRun.recommended.exercises.length, AppConfig.recommendedExerciseCount);

  const chestOnly: WorkoutRecord[] = [
    record({
      id: 'r2',
      date: '2026-08-19',
      exercises: [{ id: 'e2', exerciseId: 'bench-press', name: '벤치프레스', sets: 3 }],
    }),
  ];
  const recommended = buildQuickStartPlan({ ...base, routines: [], records: chestOnly, dayOfWeek: 4 }).recommended;
  check('the recommendation avoids the muscle group trained most recently', recommended.muscleGroup !== 'chest', true);
  check('recommended exercises come with a set target', recommended.exercises.every((e) => (e.targetSets ?? 0) > 0), true);

  const familiar: WorkoutRecord[] = [
    record({
      id: 'r3',
      date: '2026-08-19',
      exercises: [{ id: 'e3', exerciseId: 'leg-press', name: '레그프레스', sets: 3 }],
    }),
  ];
  const legsPlan = buildQuickStartPlan({
    ...base,
    routines: [],
    records: familiar,
    dayOfWeek: 4,
    muscleGroups: ['legs'],
  }).recommended;
  check('an exercise the user has actually done is recommended first', legsPlan.exercises[0].exerciseId, 'leg-press');
}

// ── 5. 담기만 하고 한 세트도 안 한 운동은 "지난 기록"이 아니다 ─────
{
  const records: WorkoutRecord[] = [
    record({
      id: 'r-done',
      date: '2026-08-10',
      exercises: [
        {
          id: 'e1',
          exerciseId: 'pull-up',
          name: '풀업',
          setDetails: [{ id: 's1', reps: 10, completed: true }],
        },
      ],
    }),
    // 세션에 담기만 하고 한 세트도 완료하지 않은 채 끝난 날 (세트 요약 필드가 아예 없다)
    record({
      id: 'r-empty',
      date: '2026-08-15',
      exercises: [{ id: 'e2', exerciseId: 'pull-up', name: '풀업' }],
    }),
  ];

  const previous = findPreviousPerformance('pull-up', records);
  check('an exercise added but never performed is skipped as a previous record', previous?.date, '2026-08-10');
  check('the real last performance is still found behind it', previous?.sets[0]?.reps, 10);
  check('an exercise never performed at all has no previous record', findPreviousPerformance('burpee', records), null);
}

console.log(
  failures === 0 ? '\nAll WORKOUT CORE checks passed.' : `\n${failures} WORKOUT CORE check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
