// Standalone verification for WEIGHT CORE pure functions that live outside workout-session.ts:
// previous-performance lookup, PR detection, mock recommendation, routine scheduling, PASS xp/level.
// Run: npm run verify:weight-core
import { Exercises } from '@/config/exercises';
import { detectPRs, findMostRecentRecordForMuscleGroup, findPreviousPerformance } from '@/utils/exercise-history';
import { addXp, computePassLevelProgress } from '@/utils/pass';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';
import { createSession, addExerciseToSession, addSetToExercise, completeSet } from '@/utils/workout-session';
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

console.log(
  failures === 0 ? '\nAll WEIGHT CORE checks passed.' : `\n${failures} WEIGHT CORE check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
