// Standalone verification for WEIGHT CORE pure functions that live outside workout-session.ts:
// previous-performance lookup, PR detection, mock recommendation, routine scheduling, PASS xp/level.
// Run: npm run verify:weight-core
import { Exercises } from '@/config/exercises';
import {
  countPeriodPRs,
  detectPRs,
  findAllTimeBestWeight,
  findMostRecentRecordForMuscleGroup,
  findPreviousPerformance,
  listPRs,
} from '@/utils/exercise-history';
import { addXp, computePassLevelProgress } from '@/utils/pass';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';
import { createSession, addExerciseToSession, addSetToExercise, completeSet } from '@/utils/workout-session';
import { countCompletedExercises, countCompletedSets, sumVolumeKg } from '@/utils/workout-stats';
import type { WorkoutRecord } from '@/types/workout';
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

// 1. findPreviousPerformance finds the most recent record containing the exercise (by date, not array order)
{
  const records: WorkoutRecord[] = [
    record({
      id: 'r1',
      date: '2026-08-01',
      exercises: [{ id: 'e1', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 's1', weightKg: 60, reps: 10, completed: true },
      ] }],
    }),
    record({
      id: 'r2',
      date: '2026-08-10',
      exercises: [{ id: 'e2', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 's2', weightKg: 70, reps: 10, completed: true },
        { id: 's3', weightKg: 70, reps: 8, completed: true },
      ] }],
    }),
  ];
  const previous = findPreviousPerformance('bench-press', records);
  check('finds the most recent (by date) record, not the last in the array', previous?.date, '2026-08-10');
  check('carries the full per-set breakdown', previous?.sets.length, 2);
  check('computes max weight across sets', previous?.maxWeightKg, 70);

  const none = findPreviousPerformance('deadlift', records);
  check('returns null when the exercise was never performed', none, null);
}

// 2. findPreviousPerformance falls back to legacy summary fields when setDetails is missing
{
  const records: WorkoutRecord[] = [
    record({
      exercises: [{ id: 'e1', exerciseId: 'squat', name: '스쿼트', sets: 3, reps: 8, weightKg: 100 }],
    }),
  ];
  const previous = findPreviousPerformance('squat', records);
  check('legacy record (no setDetails) approximates a single set', previous?.sets, [
    { id: 'e1-legacy', weightKg: 100, reps: 8, completed: true },
  ]);
  check('legacy record max weight still resolves', previous?.maxWeightKg, 100);
}

// 3. findMostRecentRecordForMuscleGroup uses the Exercise DB to map exerciseId -> muscle group
{
  const records: WorkoutRecord[] = [
    record({ id: 'r1', date: '2026-08-01', exercises: [{ id: 'e1', exerciseId: 'squat', name: '스쿼트' }] }),
    record({ id: 'r2', date: '2026-08-05', exercises: [{ id: 'e2', exerciseId: 'bench-press', name: '벤치프레스' }] }),
  ];
  const chest = findMostRecentRecordForMuscleGroup('chest', records, Exercises);
  check('finds the record touching the requested muscle group', chest?.id, 'r2');

  const back = findMostRecentRecordForMuscleGroup('back', records, Exercises);
  check('returns null when that muscle group was never trained', back, null);
}

// 4. detectPRs: only a strictly higher completed-set weight counts as a PR
{
  const pastRecords: WorkoutRecord[] = [
    record({
      exercises: [{ id: 'e1', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 's1', weightKg: 70, reps: 10, completed: true },
      ] }],
    }),
  ];

  let higherSession = createSession('strength', 'sess-1', '2026-08-15T09:00:00.000Z');
  higherSession = addExerciseToSession(higherSession, { id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스' });
  higherSession = addSetToExercise(higherSession, 'ex-1', 'set-1', { weightKg: 75, reps: 8 });
  higherSession = completeSet(higherSession, 'ex-1', 'set-1');
  const prsHigher = detectPRs(higherSession, pastRecords);
  check('higher completed weight than any past session is a PR', prsHigher.length, 1);
  check('PR event reports the previous best for context', prsHigher[0]?.previousBestWeightKg, 70);

  let equalSession = createSession('strength', 'sess-2', '2026-08-16T09:00:00.000Z');
  equalSession = addExerciseToSession(equalSession, { id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스' });
  equalSession = addSetToExercise(equalSession, 'ex-1', 'set-1', { weightKg: 70, reps: 8 });
  equalSession = completeSet(equalSession, 'ex-1', 'set-1');
  const prsEqual = detectPRs(equalSession, pastRecords);
  check('matching (not exceeding) the previous best is NOT a PR', prsEqual.length, 0);

  let firstTimeSession = createSession('strength', 'sess-3', '2026-08-17T09:00:00.000Z');
  firstTimeSession = addExerciseToSession(firstTimeSession, { id: 'ex-1', exerciseId: 'deadlift', exerciseName: '데드리프트' });
  firstTimeSession = addSetToExercise(firstTimeSession, 'ex-1', 'set-1', { weightKg: 100, reps: 5 });
  firstTimeSession = completeSet(firstTimeSession, 'ex-1', 'set-1');
  const prsFirstTime = detectPRs(firstTimeSession, pastRecords);
  check('first time doing an exercise is always a PR', prsFirstTime.length, 1);
  check('first-time PR has no previous best', prsFirstTime[0]?.previousBestWeightKg, undefined);

  let uncompletedSession = createSession('strength', 'sess-4', '2026-08-18T09:00:00.000Z');
  uncompletedSession = addExerciseToSession(uncompletedSession, { id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스' });
  uncompletedSession = addSetToExercise(uncompletedSession, 'ex-1', 'set-1', { weightKg: 100, reps: 1 }); // never completed
  const prsUncompleted = detectPRs(uncompletedSession, pastRecords);
  check('an uncompleted set never counts toward a PR, no matter the weight', prsUncompleted.length, 0);
}

// 4-B. rep PR: 같은 중량으로 전보다 더 많이 (맨몸 운동의 유일한 성장 표시)
{
  const past: WorkoutRecord[] = [
    record({
      id: 'r1',
      date: '2026-08-10',
      exercises: [
        {
          id: 'e1',
          exerciseId: 'bench-press',
          name: '벤치프레스',
          setDetails: [{ id: 's1', weightKg: 70, reps: 10, completed: true }],
        },
        {
          id: 'e2',
          exerciseId: 'pull-up',
          name: '풀업',
          setDetails: [{ id: 's2', reps: 8, completed: true }],
        },
      ],
    }),
  ];

  const sessionWith = (
    exerciseId: string,
    exerciseName: string,
    sets: { weightKg?: number; reps: number }[]
  ) => {
    let session = createSession('strength', 'rep-pr', '2026-08-15T09:00:00.000Z');
    session = addExerciseToSession(session, { id: 'ex-1', exerciseId, exerciseName });
    sets.forEach((set, index) => {
      const setId = `set-${index}`;
      session = addSetToExercise(session, 'ex-1', setId, set);
      session = completeSet(session, 'ex-1', setId);
    });
    return session;
  };

  const moreReps = detectPRs(sessionWith('bench-press', '벤치프레스', [{ weightKg: 70, reps: 12 }]), past);
  check('same weight with more reps is a PR', moreReps.length, 1);
  check('...and it is reported as a rep PR', moreReps[0]?.kind, 'reps');
  check('...carrying the achieved reps', moreReps[0]?.reps, 12);
  check('...and the previous best reps at that weight', moreReps[0]?.previousBestReps, 10);

  const sameReps = detectPRs(sessionWith('bench-press', '벤치프레스', [{ weightKg: 70, reps: 10 }]), past);
  check('matching (not exceeding) the previous reps is NOT a PR', sameReps.length, 0);

  const fewerReps = detectPRs(sessionWith('bench-press', '벤치프레스', [{ weightKg: 70, reps: 9 }]), past);
  check('fewer reps at the same weight is NOT a PR', fewerReps.length, 0);

  const lighterMoreReps = detectPRs(sessionWith('bench-press', '벤치프레스', [{ weightKg: 60, reps: 20 }]), past);
  check('a weight never used before does not fire a rep PR', lighterMoreReps.length, 0);

  const heavier = detectPRs(sessionWith('bench-press', '벤치프레스', [{ weightKg: 75, reps: 12 }]), past);
  check('a new best weight is still a weight PR', heavier[0]?.kind, 'weight');
  check('...and only one PR is reported for that exercise', heavier.length, 1);

  const bodyweight = detectPRs(sessionWith('pull-up', '풀업', [{ reps: 10 }]), past);
  check('bodyweight work can PR on reps alone', bodyweight.length, 1);
  check('...as a rep PR at zero weight', [bodyweight[0]?.kind, bodyweight[0]?.weightKg], ['reps', 0]);
  check('...with the previous rep count for context', bodyweight[0]?.previousBestReps, 8);

  const heaviestRepPr = detectPRs(
    sessionWith('bench-press', '벤치프레스', [{ weightKg: 70, reps: 12 }, { weightKg: 70, reps: 11 }]),
    past
  );
  check('only the best set at that weight is reported', heaviestRepPr.length, 1);
  check('...and it is the highest rep count', heaviestRepPr[0]?.reps, 12);

  // 저장된 기록 쪽도 같은 규칙으로 읽는다 — 세션 화면과 HISTORY가 다른 말을 하지 않도록.
  const followUp = record({
    id: 'r2',
    date: '2026-08-15',
    exercises: [
      {
        id: 'e1',
        exerciseId: 'bench-press',
        name: '벤치프레스',
        setDetails: [{ id: 's1', weightKg: 70, reps: 12, completed: true }],
      },
    ],
  });
  const events = listPRs([...past, followUp]);
  check('listPRs sees the first record as a weight PR', events[0]?.kind, 'weight');
  check('listPRs sees the follow-up as a rep PR', events.at(-1)?.kind, 'reps');
  check(
    'countPeriodPRs counts exactly the events listPRs reports',
    countPeriodPRs([followUp], [...past, followUp]),
    1
  );
  check(
    'the two functions never disagree in total',
    countPeriodPRs([...past, followUp], [...past, followUp]),
    events.length
  );

  // 횟수가 없는 세트는 어떤 종류의 PR도 만들지 않는다 (기존 유효 세트 기준 그대로).
  const noReps = record({
    id: 'r3',
    date: '2026-08-16',
    exercises: [
      {
        id: 'e1',
        exerciseId: 'bench-press',
        name: '벤치프레스',
        setDetails: [{ id: 's1', weightKg: 70, reps: 0, completed: true }],
      },
    ],
  });
  check(
    'a set without reps produces no PR event',
    listPRs([...past, noReps]).length,
    listPRs(past).length
  );
}

// 5. recommendMuscleGroup prioritizes muscle groups that were never trained, then least-recently trained
{
  const groups = ['chest', 'back', 'legs'] as const;
  const untrainedRecords: WorkoutRecord[] = [];
  check(
    'with zero history, recommends the first configured muscle group',
    recommendMuscleGroup(untrainedRecords, Exercises, [...groups]),
    'chest'
  );

  // records are newest-first, matching workout-repository's stored order
  const someHistory: WorkoutRecord[] = [
    record({ id: 'r1', date: '2026-08-10', exercises: [{ id: 'e1', exerciseId: 'bench-press', name: '벤치프레스' }] }), // chest, most recent
    record({ id: 'r2', date: '2026-08-05', exercises: [{ id: 'e2', exerciseId: 'squat', name: '스쿼트' }] }), // legs
  ];
  check(
    'recommends a never-trained group (back) over recently-trained chest/legs',
    recommendMuscleGroup(someHistory, Exercises, [...groups]),
    'back'
  );

  const fullHistory: WorkoutRecord[] = [
    record({ id: 'r1', date: '2026-08-12', exercises: [{ id: 'e1', exerciseId: 'bench-press', name: '벤치프레스' }] }), // chest most recent
    record({ id: 'r2', date: '2026-08-11', exercises: [{ id: 'e2', exerciseId: 'barbell-row', name: '바벨로우' }] }), // back
    record({ id: 'r3', date: '2026-08-05', exercises: [{ id: 'e3', exerciseId: 'squat', name: '스쿼트' }] }), // legs, least recent
  ];
  check(
    'when everything has been trained, recommends the least-recently-trained group',
    recommendMuscleGroup(fullHistory, Exercises, [...groups]),
    'legs'
  );
}

// 6. getTodaysScheduledRoutine matches Date.getDay() convention (0=Sun..6=Sat)
{
  const routines: Routine[] = [
    { id: 'r1', name: '가슴 A', exerciseIds: ['bench-press'], scheduledDays: [1, 4], createdAt: '', updatedAt: '' },
    { id: 'r2', name: '등 A', exerciseIds: ['barbell-row'], createdAt: '', updatedAt: '' }, // no schedule
  ];
  check('finds the routine scheduled for Monday (1)', getTodaysScheduledRoutine(routines, 1)?.id, 'r1');
  check('finds nothing scheduled for Tuesday (2)', getTodaysScheduledRoutine(routines, 2), null);
  check('a routine with no scheduledDays never auto-suggests', getTodaysScheduledRoutine(routines, 0), null);
}

// 7. PASS xp/level: simple linear leveling, never goes negative
{
  check('fresh account is level 1 with 0 progress', computePassLevelProgress(0), {
    level: 1,
    xpIntoLevel: 0,
    xpForLevel: 100,
    progress: 0,
  });
  check('50/100 xp is level 1, halfway', computePassLevelProgress(50).progress, 0.5);
  check('exactly 100 xp rolls over to level 2', computePassLevelProgress(100).level, 2);
  check('250 xp is level 3 with 50 into the level', computePassLevelProgress(250), {
    level: 3,
    xpIntoLevel: 50,
    xpForLevel: 100,
    progress: 0.5,
  });
  check('addXp accumulates', addXp(80, 30), 110);
  check('addXp never goes negative even with a large negative delta', addXp(10, -100), 0);
}

// 7b. PR은 "지난번"이 아니라 누적 최고 중량 기준이다 — 100kg를 든 적이 있으면 60kg 다음의
//     70kg는 PR이 아니다. (EXERCISE DETAIL의 [최고 기록] / HISTORY의 PR 수와 같은 기준)
{
  const history: WorkoutRecord[] = [
    record({
      id: 'best',
      date: '2026-08-01',
      exercises: [{ id: 'e1', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 's1', weightKg: 100, reps: 3, completed: true },
      ] }],
    }),
    record({
      id: 'deload',
      date: '2026-08-10',
      exercises: [{ id: 'e2', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 's2', weightKg: 60, reps: 12, completed: true },
      ] }],
    }),
  ];

  let session = createSession('strength', 'pr-session', '2026-08-12T09:00:00.000Z');
  session = addExerciseToSession(session, { id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스' });
  session = addSetToExercise(session, 'ex-1', 'set-1', { weightKg: 70, reps: 10 });
  session = completeSet(session, 'ex-1', 'set-1');
  check('beating only the last session is NOT a PR when an all-time best is higher',
    detectPRs(session, history).length, 0);

  let record105 = addSetToExercise(session, 'ex-1', 'set-2', { weightKg: 105, reps: 1 });
  record105 = completeSet(record105, 'ex-1', 'set-2');
  const prs = detectPRs(record105, history);
  check('beating the all-time best is a PR', prs.length, 1);
  check('the PR reports the all-time best as the previous mark', prs[0]?.previousBestWeightKg, 100);
}

// 8. HISTORY 세트 수는 볼륨과 같은 근거(setDetails)에서 나와야 한다 — 같은 기록을 두고
//    "볼륨은 있는데 0세트"처럼 화면끼리 모순되는 숫자가 나오면 안 된다.
{
  const withDetails = record({
    exercises: [
      {
        id: 'e1',
        exerciseId: 'bench-press',
        name: '벤치프레스',
        setDetails: [
          { id: 's1', weightKg: 70, reps: 10, completed: true },
          { id: 's2', weightKg: 70, reps: 8, completed: true },
          { id: 's3', weightKg: 80, reps: 3, completed: false },
        ],
      },
    ],
  });
  check('counts completed sets from setDetails even when the sets summary is missing',
    countCompletedSets(withDetails), 2);
  check('the same record still reports the matching volume', sumVolumeKg([withDetails]), 70 * 10 + 70 * 8);

  const legacy = record({
    exercises: [{ id: 'e1', exerciseId: 'squat', name: '스쿼트', sets: 3, reps: 10, weightKg: 60 }],
  });
  check('falls back to the summary count for legacy records without setDetails',
    countCompletedSets(legacy), 3);

  const manual = record({ title: '러닝', category: 'running' });
  check('a record with no exercises has no sets', countCompletedSets(manual), 0);
  check('a non-weight record contributes nothing to kg volume', sumVolumeKg([manual]), 0);
}


// ── 과거 버전이 저장한 무효 세트는 HISTORY 통계에서 읽을 때만 제외한다 ──────
// (저장된 기록 자체는 사용자의 히스토리이므로 절대 수정/삭제하지 않는다.)
{
  const legacyInvalid = record({
    id: 'legacy-invalid',
    date: '2026-08-01',
    exercises: [{
      id: 'e-inv', exerciseId: 'bench-press', name: '벤치프레스', sets: 3, setDetails: [
        { id: 'x1', completed: true },
        { id: 'x2', reps: 0, completed: true },
        { id: 'x3', weightKg: 100, reps: 0, completed: true },
      ],
    }],
  });
  const snapshot = JSON.stringify(legacyInvalid);

  check('A: a stored set with no reps is left out of the history set count', countCompletedSets(legacyInvalid), 0);
  check('B: a stored 0-rep set is left out too', legacyInvalid.exercises?.[0].setDetails?.length, 3);
  check('C: 100kg x 0 reps adds no volume', sumVolumeKg([legacyInvalid]), 0);
  check('C: 100kg x 0 reps is not an all-time best', findAllTimeBestWeight('bench-press', [legacyInvalid]), undefined);
  check('C: 100kg x 0 reps produces no period PR', countPeriodPRs([legacyInvalid], [legacyInvalid]), 0);
  check('C: 100kg x 0 reps produces no PR event', listPRs([legacyInvalid]).length, 0);
  check('A/B: an all-invalid record reports no completed exercises', countCompletedExercises(legacyInvalid), 0);
  check('H: reading statistics never rewrites the stored record', JSON.stringify(legacyInvalid), snapshot);

  const bodyweight = record({
    id: 'legacy-bodyweight',
    date: '2026-08-02',
    exercises: [{
      id: 'e-bw', exerciseId: 'pull-up', name: '풀업', sets: 2, setDetails: [
        { id: 'b1', weightKg: 0, reps: 10, completed: true },
        { id: 'b2', reps: 12, completed: true },
      ],
    }],
  });
  check('D: a stored 0kg x 10 set still counts', countCompletedSets(bodyweight), 2);
  check('E: a stored set with no weight but 12 reps still counts', bodyweight.exercises?.[0].setDetails?.[1].reps, 12);
  check('D/E: bodyweight sets add no kg volume', sumVolumeKg([bodyweight]), 0);

  const mixed = record({
    id: 'legacy-mixed',
    date: '2026-08-03',
    exercises: [{
      id: 'e-mix', exerciseId: 'squat', name: '스쿼트', sets: 3, setDetails: [
        { id: 'm1', weightKg: 80, reps: 5, completed: true },
        { id: 'm2', weightKg: 120, reps: 0, completed: true },
        { id: 'm3', weightKg: 80, completed: true },
      ],
    }],
  });
  check('F: only the effective set is counted in a mixed record', countCompletedSets(mixed), 1);
  check('F: only the effective set adds volume', sumVolumeKg([mixed]), 400);
  check('F: the 120kg x 0 set never becomes the best weight', findAllTimeBestWeight('squat', [mixed]), 80);
  check('F: the exercise still counts because one real set remains', countCompletedExercises(mixed), 1);

  // G: 정상 기록의 기존 통계는 그대로다.
  const healthy = record({
    id: 'legacy-healthy',
    date: '2026-08-04',
    exercises: [{
      id: 'e-ok', exerciseId: 'deadlift', name: '데드리프트', sets: 2, setDetails: [
        { id: 'h1', weightKg: 100, reps: 5, completed: true },
        { id: 'h2', weightKg: 110, reps: 3, completed: true },
      ],
    }],
  });
  check('G: a healthy record keeps its set count', countCompletedSets(healthy), 2);
  check('G: a healthy record keeps its volume', sumVolumeKg([healthy]), 100 * 5 + 110 * 3);
  check('G: a healthy record keeps its best weight', findAllTimeBestWeight('deadlift', [healthy]), 110);
  check('G: a healthy record still reports its PR', listPRs([healthy]).length, 1);
  check('G: a healthy record keeps its exercise count', countCompletedExercises(healthy), 1);

  // setDetails가 없는 옛 기록(WEIGHT CORE 이전)은 요약값 근사를 그대로 쓴다.
  const summaryOnly = record({
    id: 'legacy-summary',
    date: '2026-07-01',
    exercises: [{ id: 'e-sum', exerciseId: 'squat', name: '스쿼트', sets: 3, reps: 10, weightKg: 60 }],
  });
  check('G: pre-setDetails records keep their summary set count', countCompletedSets(summaryOnly), 3);
  check('G: pre-setDetails records keep their summary volume', sumVolumeKg([summaryOnly]), 60 * 10 * 3);
  check('G: pre-setDetails records keep their best weight', findAllTimeBestWeight('squat', [summaryOnly]), 60);
  check('G: pre-setDetails records keep their exercise count', countCompletedExercises(summaryOnly), 1);
}


// ── 지난 기록 조회도 같은 유효 세트 기준을 쓴다 ─────────────────────────────
{
  const invalidThenValid: WorkoutRecord[] = [
    record({
      id: 'prev-valid', date: '2026-08-10',
      exercises: [{ id: 'p1', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 'v1', weightKg: 70, reps: 10, completed: true },
        { id: 'v2', weightKg: 75, reps: 8, completed: true },
      ] }],
    }),
    record({
      id: 'prev-invalid', date: '2026-08-14',
      exercises: [{ id: 'p2', exerciseId: 'bench-press', name: '벤치프레스', setDetails: [
        { id: 'i1', weightKg: 100, reps: 0, completed: true },
        { id: 'i2', completed: true },
      ] }],
    }),
  ];
  const snapshot = JSON.stringify(invalidThenValid);
  const previous = findPreviousPerformance('bench-press', invalidThenValid);
  check('A: a 100kg x 0 set is not offered as the previous performance', previous?.date, '2026-08-10');
  check('A: its 100kg never becomes the previous max', previous?.maxWeightKg, 75);
  check('B: a reps-less stored set is skipped as well', previous?.sets.length, 2);
  check('D: the most recent effective record still wins', previous?.sets.map((set) => set.id), ['v1', 'v2']);
  check('I: looking up the previous performance never rewrites the records', JSON.stringify(invalidThenValid), snapshot);

  const bodyweightPrev = [record({
    id: 'prev-bw', date: '2026-08-12',
    exercises: [{ id: 'p3', exerciseId: 'pull-up', name: '풀업', setDetails: [
      { id: 'bw1', weightKg: 0, reps: 10, completed: true },
      { id: 'bw2', reps: 12, completed: true },
    ] }],
  })];
  const bwPrevious = findPreviousPerformance('pull-up', bodyweightPrev);
  check('C: 0kg x 10 is a valid previous performance', bwPrevious?.sets.length, 2);
  // 맨몸 세트는 최고 중량이 없다 — 0kg를 최고 기록처럼 보여주지 않는 기존 동작이다.
  check('C: bodyweight sets report no max weight at all', bwPrevious?.maxWeightKg, undefined);

  const mixedPrev = [record({
    id: 'prev-mixed', date: '2026-08-13',
    exercises: [{ id: 'p4', exerciseId: 'squat', name: '스쿼트', setDetails: [
      { id: 'mx1', weightKg: 60, reps: 5, completed: true },
      { id: 'mx2', weightKg: 150, reps: 0, completed: true },
    ] }],
  })];
  const mixedPrevious = findPreviousPerformance('squat', mixedPrev);
  check('E: only the effective set is offered from a mixed record', mixedPrevious?.sets.map((set) => set.id), ['mx1']);
  check('E: the invalid heavy set never sets the suggestion', mixedPrevious?.maxWeightKg, 60);

  // H: setDetails가 없는 옛 요약 기록은 기존 근사 계약 그대로.
  const summaryPrev = [record({
    id: 'prev-summary', date: '2026-07-20',
    exercises: [{ id: 'p5', exerciseId: 'deadlift', name: '데드리프트', sets: 3, reps: 5, weightKg: 120 }],
  })];
  const summaryPrevious = findPreviousPerformance('deadlift', summaryPrev);
  check('H: a pre-setDetails record still approximates one previous set', summaryPrevious?.sets.length, 1);
  check('H: and keeps its summary weight', summaryPrevious?.maxWeightKg, 120);
}

console.log(
  failures === 0 ? '\nAll WEIGHT CORE checks passed.' : `\n${failures} WEIGHT CORE check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
