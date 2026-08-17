// Standalone verification for the pure WorkoutSession logic (src/utils/workout-session.ts).
// Run: npm run verify:session
import {
  addExerciseToSession,
  addSetToExercise,
  changeSessionCategory,
  clearRest,
  completeSession,
  completeSet,
  computeCompletedSetsCount,
  computeElapsedSeconds,
  computeTotalVolumeKg,
  createSession,
  formatElapsedTime,
  getLastSetValues,
  getRestSecondsRemaining,
  pauseSession,
  resumeSession,
  sessionToWorkoutRecordInput,
  setCurrentExercise,
  startRest,
  updateSet,
} from '@/utils/workout-session';

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

const START_ISO = '2026-08-18T09:00:00.000Z';
const START_MS = new Date(START_ISO).getTime();

// 1. Fresh session starts at 0 elapsed, active
{
  const session = createSession('strength', 'session-1', START_ISO);
  check('new session status is active', session.status, 'active');
  check('new session starts at 0 elapsed', computeElapsedSeconds(session, START_MS), 0);
  check('new session starts with no exercises', session.exercises, []);
}

// 2. Elapsed time grows purely from wall-clock difference (simulates backgrounding: no
// interval ticks needed, jumping the clock forward still gives the right answer)
{
  const session = createSession('running', 'session-2', START_ISO);
  const after90s = computeElapsedSeconds(session, START_MS + 90_000);
  check('90s wall-clock gap reads as 90 elapsed seconds', after90s, 90);

  const afterLongBackground = computeElapsedSeconds(session, START_MS + 45 * 60_000);
  check('45 minute background gap reads as 2700 elapsed seconds', afterLongBackground, 2700);
}

// 3. Pause freezes elapsed time; resuming continues accumulating from the freeze point
{
  let session = createSession('walking', 'session-3', START_ISO);
  session = pauseSession(session, START_MS + 60_000); // paused after 60s
  check('pause freezes accumulatedSeconds at 60', session.accumulatedSeconds, 60);
  check('pause clears activeSince', session.activeSince, undefined);
  check('elapsed stays 60 no matter how much later we check while paused',
    computeElapsedSeconds(session, START_MS + 10 * 60_000), 60);

  session = resumeSession(session, new Date(START_MS + 10 * 60_000).toISOString());
  check('resume restores active status', session.status, 'active');
  const elapsedAfterResume = computeElapsedSeconds(session, START_MS + 10 * 60_000 + 30_000);
  check('30s after resume = 60 (paused) + 30 (new active) = 90', elapsedAfterResume, 90);
}

// 4. Multiple pause/resume cycles accumulate correctly (no drift)
{
  let session = createSession('sports', 'session-4', START_ISO);
  session = pauseSession(session, START_MS + 100_000); // +100s active
  session = resumeSession(session, new Date(START_MS + 200_000).toISOString()); // 100s pause gap
  session = pauseSession(session, START_MS + 250_000); // +50s active -> 150 total
  session = resumeSession(session, new Date(START_MS + 400_000).toISOString());
  const finalElapsed = computeElapsedSeconds(session, START_MS + 450_000); // +50s active -> 200 total
  check('three active segments (100+50+50) sum to 200s with no drift', finalElapsed, 200);
}

// 5. Pausing an already-paused session, or resuming an active one, is a no-op
{
  let session = createSession('other', 'session-5', START_ISO);
  session = pauseSession(session, START_MS + 30_000);
  const pausedAgain = pauseSession(session, START_MS + 90_000);
  check('pausing an already-paused session is a no-op', pausedAgain, session);

  let active = createSession('other', 'session-6', START_ISO);
  const resumedWhileActive = resumeSession(active, new Date(START_MS + 5_000).toISOString());
  check('resuming an already-active session is a no-op', resumedWhileActive, active);
}

// 6. Category change doesn't affect elapsed time
{
  let session = createSession('strength', 'session-7', START_ISO);
  session = changeSessionCategory(session, 'home');
  check('category change updates primaryCategory', session.primaryCategory, 'home');
  check('elapsed unaffected by category change', computeElapsedSeconds(session, START_MS + 5_000), 5);
}

// 7. Exercise + set tracking: add exercise, add sets, update, complete
{
  let session = createSession('strength', 'session-10', START_ISO);
  session = addExerciseToSession(session, { id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스' });
  check('added exercise appears in session', session.exercises.length, 1);
  check('first added exercise becomes currentExerciseId', session.currentExerciseId, 'ex-1');

  session = addSetToExercise(session, 'ex-1', 'set-1', { weightKg: 70, reps: 10 });
  check('set gets appended uncompleted', session.exercises[0].sets, [
    { id: 'set-1', weightKg: 70, reps: 10, completed: false },
  ]);

  session = completeSet(session, 'ex-1', 'set-1');
  check('completing a set marks it completed', session.exercises[0].sets[0].completed, true);

  const defaults = getLastSetValues(session, 'ex-1');
  check('last set values carry over as defaults for the next set', defaults, { weightKg: 70, reps: 10 });

  session = addSetToExercise(session, 'ex-1', 'set-2', defaults ?? undefined);
  session = updateSet(session, 'ex-1', 'set-2', { weightKg: 72.5 });
  check('updateSet patches only the given fields', session.exercises[0].sets[1], {
    id: 'set-2',
    weightKg: 72.5,
    reps: 10,
    completed: false,
  });

  session = addExerciseToSession(session, { id: 'ex-2', exerciseId: 'squat', exerciseName: '스쿼트' });
  check('currentExerciseId does not change when a second exercise is added', session.currentExerciseId, 'ex-1');

  session = setCurrentExercise(session, 'ex-2');
  check('setCurrentExercise switches focus', session.currentExerciseId, 'ex-2');

  const invalid = setCurrentExercise(session, 'does-not-exist');
  check('setCurrentExercise ignores unknown ids (no-op)', invalid, session);
}

// 8. Rest timer: absolute end-timestamp based, not a decrementing counter
{
  let session = createSession('strength', 'session-11', START_ISO);
  session = startRest(session, 90, START_MS);
  check('rest timer full duration right after starting', getRestSecondsRemaining(session, START_MS), 90);
  check('rest timer counts down correctly after 30s', getRestSecondsRemaining(session, START_MS + 30_000), 60);
  check('rest timer never goes negative once time is up',
    getRestSecondsRemaining(session, START_MS + 200_000), 0);

  session = clearRest(session);
  check('clearRest removes restUntilMs', session.restUntilMs, undefined);
}

// 9. Completed session aggregates completed sets and total volume correctly
{
  let session = createSession('strength', 'session-12', START_ISO);
  session = addExerciseToSession(session, { id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스' });
  session = addSetToExercise(session, 'ex-1', 'set-1', { weightKg: 70, reps: 10 });
  session = completeSet(session, 'ex-1', 'set-1');
  session = addSetToExercise(session, 'ex-1', 'set-2', { weightKg: 70, reps: 8 });
  session = completeSet(session, 'ex-1', 'set-2');
  session = addSetToExercise(session, 'ex-1', 'set-3', { weightKg: 75, reps: 5 }); // left uncompleted on purpose

  check('completed sets count excludes the uncompleted set', computeCompletedSetsCount(session), 2);
  check('total volume only counts completed sets with both weight and reps',
    computeTotalVolumeKg(session), 70 * 10 + 70 * 8);

  const completed = completeSession(session, new Date(START_MS + 30 * 60_000).toISOString(), START_MS + 30 * 60_000);
  const recordInput = sessionToWorkoutRecordInput(completed, '가슴');
  check('derived record title uses the given label', recordInput.title, '가슴 세션');
  check('derived record exercise carries setDetails from completed sets',
    recordInput.exercises?.[0].setDetails?.length, 2);
  check('derived record exercise summary uses the last completed set',
    { sets: recordInput.exercises?.[0].sets, reps: recordInput.exercises?.[0].reps, weightKg: recordInput.exercises?.[0].weightKg },
    { sets: 2, reps: 8, weightKg: 70 });
  check('derived record exercise keeps the exerciseId for future lookups',
    recordInput.exercises?.[0].exerciseId, 'bench-press');
}

// 10. An exercise with zero completed sets still appears in the record (not silently dropped),
// but without summary/setDetails fields — "완료 안 해도 종료는 막지 않는다" applies to the record too.
{
  let session = createSession('strength', 'session-13', START_ISO);
  session = addExerciseToSession(session, { id: 'ex-1', exerciseId: 'squat', exerciseName: '스쿼트' });
  const completed = completeSession(session, new Date(START_MS + 60_000).toISOString(), START_MS + 60_000);
  const recordInput = sessionToWorkoutRecordInput(completed, '하체');
  check('exercise with no completed sets is still listed', recordInput.exercises?.length, 1);
  check('exercise with no completed sets has no set summary', recordInput.exercises?.[0].sets, undefined);
}

// 11. A session completed in under a minute still gets a non-zero duration (no "0분" record)
{
  const session = createSession('strength', 'session-9', START_ISO);
  const completed = completeSession(session, new Date(START_MS + 20_000).toISOString(), START_MS + 20_000);
  const recordInput = sessionToWorkoutRecordInput(completed, '웨이트');
  check('sub-minute sessions round up to at least 1 minute', recordInput.durationMinutes, 1);
}

// 12. formatElapsedTime formatting
{
  check('formats under an hour as MM:SS', formatElapsedTime(65), '01:05');
  check('formats an hour+ as H:MM:SS', formatElapsedTime(3661), '1:01:01');
  check('formats zero', formatElapsedTime(0), '00:00');
}

console.log(
  failures === 0 ? '\nAll workout session checks passed.' : `\n${failures} workout session check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
