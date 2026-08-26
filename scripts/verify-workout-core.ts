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
  computeCompletedSetsCount,
  computeTotalVolumeKg,
  removeSetFromExercise,
  sessionToWorkoutRecordInput,
  setCurrentExercise,
  updateSet,
} from '@/utils/workout-session';
import { buildWorkoutSessionResult } from '@/utils/workout-session-result';
import { buildWorkoutRecordDetail } from '@/utils/workout-record-detail';
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
    { exerciseId: 'bench-press', exerciseName: '벤치프레스', weightKg: 90, previousBestWeightKg: 85 },
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

// ── 잘못 기록한 세트를 고치고 지울 수 있다 ──────────────────────────────────
//
// 헬스장에서 숫자를 잘못 넣는 일은 드물지 않은데 되돌릴 방법이 없었다. 그래서 오타 하나가
// 그대로 저장돼 볼륨·PR·성장까지 전부 타고 들어갔다.
//
// 여기서 지키는 것은 하나다: **세션에서 고치거나 지운 값은 저장되는 기록에 남지 않는다.**
// 판정 규칙(effective-set)도 저장 변환(sessionToWorkoutRecordInput)도 새로 만들지 않고
// 그대로 통과시킨다.
{
  const build = () => {
    let session = createSession('strength', 'fix-1', NOW_ISO, {
      initialExercises: [{ exerciseId: 'bench-press', exerciseName: '벤치프레스' }],
    });
    const entryId = session.exercises[0].id;
    session = addSetToExercise(session, entryId, 'set-1', { weightKg: 600, reps: 10 });
    session = completeSet(session, entryId, 'set-1');
    session = addSetToExercise(session, entryId, 'set-2', { weightKg: 60, reps: 8 });
    session = completeSet(session, entryId, 'set-2');
    return { session, entryId };
  };

  // 1) 고치기 — 600kg 오타를 60kg로 바꾸면 저장되는 것도 60kg여야 한다.
  {
    const { session, entryId } = build();
    const fixed = updateSet(session, entryId, 'set-1', { weightKg: 60 });
    const record = sessionToWorkoutRecordInput(fixed, '가슴');
    const sets = record.exercises?.[0]?.setDetails ?? [];

    check('고친 세트 수가 그대로다', sets.length, 2);
    check('고친 값이 저장된다', sets[0]?.weightKg, 60);
    check('오타 값은 저장되지 않는다', sets.some((set) => set.weightKg === 600), false);
    check('볼륨도 고친 값으로 계산된다', computeTotalVolumeKg(fixed), 60 * 10 + 60 * 8);
    // 600kg PR이 남아 있으면 앱이 평생 그 무게를 사실로 취급한다.
    const prs = detectPRs(fixed, []);
    check('없던 600kg PR이 만들어지지 않는다', prs.some((pr) => pr.weightKg === 600), false);
    check('실제로 든 무게가 PR이 된다', prs[0]?.weightKg, 60);
  }

  // 2) 지우기 — 지운 세트는 어디에도 남지 않는다.
  {
    const { session, entryId } = build();
    const removed = removeSetFromExercise(session, entryId, 'set-1');
    const record = sessionToWorkoutRecordInput(removed, '가슴');
    const sets = record.exercises?.[0]?.setDetails ?? [];

    check('지운 뒤에는 남은 세트만 저장된다', sets.length, 1);
    check('남은 세트의 값은 그대로다', sets[0]?.weightKg, 60);
    check('지운 세트는 볼륨에서도 빠진다', computeTotalVolumeKg(removed), 60 * 8);
    check('지운 세트는 세트 수에서도 빠진다', computeCompletedSetsCount(removed), 1);
    const prs = detectPRs(removed, []);
    check('지운 세트로 PR이 만들어지지 않는다', prs.some((pr) => pr.weightKg === 600), false);
  }

  // 3) 다 지우면 그 종목은 한 세트도 하지 않은 것이다 — 빈 기록을 만들어 내지 않는다.
  {
    const { session, entryId } = build();
    const empty = removeSetFromExercise(
      removeSetFromExercise(session, entryId, 'set-1'),
      entryId,
      'set-2'
    );
    const record = sessionToWorkoutRecordInput(empty, '가슴');
    check('세트가 없으면 setDetails도 없다', record.exercises?.[0]?.setDetails, undefined);
    check('완료 세트 수는 0이다', computeCompletedSetsCount(empty), 0);
    check('볼륨도 0이다', computeTotalVolumeKg(empty), 0);
  }

  // 4) 다른 종목의 세트는 건드리지 않는다.
  {
    let session = createSession('strength', 'fix-2', NOW_ISO, {
      initialExercises: [
        { exerciseId: 'bench-press', exerciseName: '벤치프레스' },
        { exerciseId: 'squat', exerciseName: '스쿼트' },
      ],
    });
    const [bench, squat] = session.exercises;
    session = completeSet(addSetToExercise(session, bench.id, 'b-1', { weightKg: 60, reps: 10 }), bench.id, 'b-1');
    session = completeSet(addSetToExercise(session, squat.id, 's-1', { weightKg: 100, reps: 5 }), squat.id, 's-1');

    const removed = removeSetFromExercise(session, bench.id, 'b-1');
    const record = sessionToWorkoutRecordInput(removed, '가슴');
    const squatSets = record.exercises?.find((exercise) => exercise.exerciseId === 'squat')?.setDetails ?? [];
    check('다른 종목의 세트는 남는다', squatSets.length, 1);
    check('다른 종목의 값도 그대로다', squatSets[0]?.weightKg, 100);
  }
}

// ── 저장된 기록을 다시 볼 수 있다 ───────────────────────────────────────────
//
// 결과 화면을 닫으면 내가 무엇을 얼마나 들었는지 볼 곳이 없었다. 상세 화면은 계산하지
// 않는다 — 저장된 값을 옮겨 적을 뿐이고, 없는 값은 지어내지 않는다.
{
  const asRecord = (input: Partial<WorkoutRecord> & { id: string }): WorkoutRecord => ({
    date: '2026-08-27',
    category: 'strength',
    title: '가슴 세션',
    completed: true,
    createdAt: '2026-08-27T10:00:00.000Z',
    ...input,
  });

  // 방금 한 운동: 세트 순서/중량/횟수가 그대로 보인다.
  {
    const detail = buildWorkoutRecordDetail(
      asRecord({
        id: 'r1',
        durationMinutes: 3,
        exercises: [
          {
            id: 'e1',
            exerciseId: 'bench-press',
            name: '벤치프레스',
            sets: 2,
            reps: 8,
            weightKg: 62.5,
            setDetails: [
              { id: 's1', weightKg: 60, reps: 10, completed: true },
              { id: 's2', weightKg: 62.5, reps: 8, completed: true },
            ],
          },
        ],
      })
    );

    check('종목이 보인다', detail.exercises[0]?.name, '벤치프레스');
    check('세트 순서가 저장된 순서 그대로다', detail.exercises[0]?.sets.map((set) => set.order), [1, 2]);
    check('세트 중량이 그대로다', detail.exercises[0]?.sets.map((set) => set.weightKg), [60, 62.5]);
    check('세트 횟수가 그대로다', detail.exercises[0]?.sets.map((set) => set.reps), [10, 8]);
    check('합계는 기존 함수가 센 값과 같다', detail.totals.sets, 2);
    check('볼륨도 기존 함수가 센 값과 같다', detail.totals.volumeKg, 60 * 10 + 62.5 * 8);
    check('상세가 있으면 옛 요약을 덧붙이지 않는다', detail.exercises[0]?.legacySummary, null);
    check('보여줄 것이 있으면 빈 안내가 없다', detail.emptyLine, null);
  }

  // 옛 기록: 세트 상세가 없다. 없는 세트를 만들어 내지 않는다.
  {
    const detail = buildWorkoutRecordDetail(
      asRecord({
        id: 'r2',
        exercises: [{ id: 'e1', exerciseId: 'squat', name: '스쿼트', sets: 3, reps: 8, weightKg: 100 }],
      })
    );

    check('없는 세트를 지어내지 않는다', detail.exercises[0]?.sets.length, 0);
    check('남아 있는 요약만 말한다', detail.exercises[0]?.legacySummary, '3세트 · 100kg · 8회');
  }

  // 담기만 하고 하지 않은 운동은 보여줄 것이 없다.
  {
    const detail = buildWorkoutRecordDetail(
      asRecord({ id: 'r3', exercises: [{ id: 'e1', exerciseId: 'squat', name: '스쿼트' }] })
    );
    check('한 세트도 안 한 종목은 나오지 않는다', detail.exercises.length, 0);
    check('그때는 안내 한 줄이 있다', typeof detail.emptyLine, 'string');
  }
}

console.log(
  failures === 0 ? '\nAll WORKOUT CORE checks passed.' : `\n${failures} WORKOUT CORE check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
