// Standalone verification for the pure WorkoutSession logic (src/utils/workout-session.ts).
// Run: npm run verify:session
import {
  addExerciseToSession,
  addSetToExercise,
  adjustSet,
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
  getRestProgress,
  getRestSecondsRemaining,
  heartbeatSession,
  pauseSession,
  pauseSessionForBackground,
  recoverStaleSession,
  resumeIfRecentBackground,
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

  check('rest ring is full right after starting, whatever length was chosen',
    getRestProgress(session, getRestSecondsRemaining(session, START_MS)), 1);
  check('rest ring is half way through a 90s rest',
    getRestProgress(session, getRestSecondsRemaining(session, START_MS + 45_000)), 0.5);

  // 60초를 골라도 링이 꽉 찬 채로 시작해야 한다 (예전에는 기본값 90으로 나눠 2/3에서 시작했다).
  const short = startRest(createSession('strength', 'session-11b', START_ISO), 60, START_MS);
  check('a 60s rest also starts from a full ring',
    getRestProgress(short, getRestSecondsRemaining(short, START_MS)), 1);
  check('a 60s rest ring is at one third with 20s left',
    Math.round(getRestProgress(short, 20) * 100) / 100, 0.33);
  check('rest ring never goes below zero once time is up', getRestProgress(short, 0), 0);

  // 길이 정보가 없는 옛 세션(저장된 restUntilMs만 있는 경우)도 안전하게 그려져야 한다.
  const legacy = { ...short, restTotalSeconds: undefined };
  check('a legacy rest without a stored length still yields a drawable ratio',
    getRestProgress(legacy, 30), 1);

  session = clearRest(session);
  check('clearRest removes restUntilMs', session.restUntilMs, undefined);
  check('clearRest also removes the chosen rest length', session.restTotalSeconds, undefined);
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

  // 스테퍼 연타: 증감이 누적돼야 한다. 화면에 그려진 값에서 계산하면 두 번 눌러도 한 번만 반영됐다.
  {
    let stepped = addSetToExercise(session, 'ex-1', 'set-step', { weightKg: 60, reps: 12 });
    stepped = adjustSet(stepped, 'ex-1', 'set-step', { weightKg: 2.5 });
    stepped = adjustSet(stepped, 'ex-1', 'set-step', { weightKg: 2.5 });
    stepped = adjustSet(stepped, 'ex-1', 'set-step', { reps: -1 });
    stepped = adjustSet(stepped, 'ex-1', 'set-step', { reps: -1 });
    const set = stepped.exercises[0].sets.find((s) => s.id === 'set-step');
    check('two +2.5kg taps add up to +5kg', set?.weightKg, 65);
    check('two -1 rep taps add up to -2 reps', set?.reps, 10);

    const floored = adjustSet(
      adjustSet(stepped, 'ex-1', 'set-step', { weightKg: -1000 }),
      'ex-1',
      'set-step',
      { reps: -1000 }
    );
    const flooredSet = floored.exercises[0].sets.find((s) => s.id === 'set-step');
    check('stepping down never goes below zero',
      { weightKg: flooredSet?.weightKg, reps: flooredSet?.reps }, { weightKg: 0, reps: 0 });

    const untouched = adjustSet(stepped, 'ex-1', 'set-step', { weightKg: 5 });
    const other = untouched.exercises[0].sets.find((s) => s.id === 'set-1');
    check('adjusting one set never touches the other sets', other?.weightKg, 70);
  }
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

// 13. heartbeatSession: only stamps while active, no-op otherwise
{
  let session = createSession('strength', 'session-14', START_ISO);
  session = heartbeatSession(session, START_MS + 15_000);
  check('heartbeat stamps lastHeartbeatMs while active', session.lastHeartbeatMs, START_MS + 15_000);

  const paused = pauseSession(session, START_MS + 20_000);
  const heartbeatWhilePaused = heartbeatSession(paused, START_MS + 30_000);
  check('heartbeat is a no-op while paused', heartbeatWhilePaused, paused);
}

// 14. recoverStaleSession — the "1217분 버그": a session left 'active' in storage while the
// app was backgrounded/killed for a long time must NOT count that whole gap as workout time.
{
  const THRESHOLD_MS = 3 * 60_000; // matches AppConfig.staleActiveSessionThresholdMinutes = 3

  // Fresh gap (app just reloaded a few seconds ago) — not stale, session stays untouched.
  let fresh = createSession('strength', 'session-15', START_ISO);
  fresh = heartbeatSession(fresh, START_MS + 10_000);
  const notStale = recoverStaleSession(fresh, START_MS + 10_000 + 5_000, THRESHOLD_MS);
  check('a fresh session (small gap since heartbeat) is left untouched', notStale, fresh);

  // Reproduces the reported bug: session heartbeated once, then the app was backgrounded/killed
  // for ~20 hours (1217+ minutes) before being reopened. Without the fix, computeElapsedSeconds
  // would read the full 20-hour gap as active workout time.
  let abandoned = createSession('strength', 'session-16', START_ISO);
  abandoned = heartbeatSession(abandoned, START_MS + 5 * 60_000); // last confirmed alive at +5 min
  const twentyHoursLaterMs = START_MS + 5 * 60_000 + 20 * 60 * 60_000;
  const recovered = recoverStaleSession(abandoned, twentyHoursLaterMs, THRESHOLD_MS);
  check('a session abandoned for 20h is auto-paused, not left active', recovered.status, 'paused');
  check(
    'recovered duration is bounded by the last heartbeat (5 min), not the 20h gap',
    recovered.accumulatedSeconds,
    5 * 60
  );
  check(
    'elapsed time after recovery reflects only genuinely-active time, never the abandonment gap',
    computeElapsedSeconds(recovered, twentyHoursLaterMs),
    5 * 60
  );

  // Legacy sessions saved before this fix existed have no lastHeartbeatMs — recovery must fall
  // back to activeSince so old persisted sessions don't crash or misbehave.
  let legacy = createSession('strength', 'session-17', START_ISO);
  legacy = { ...legacy, lastHeartbeatMs: undefined };
  const legacyRecovered = recoverStaleSession(legacy, START_MS + 20 * 60 * 60_000, THRESHOLD_MS);
  check('a legacy session with no lastHeartbeatMs falls back to activeSince for recovery',
    legacyRecovered.accumulatedSeconds, 0);

  // Sessions that are already paused/completed, or genuinely still fresh, are untouched (identity).
  const pausedSession = pauseSession(createSession('strength', 'session-18', START_ISO), START_MS + 60_000);
  check('recoverStaleSession never touches an already-paused session',
    recoverStaleSession(pausedSession, START_MS + 20 * 60 * 60_000, THRESHOLD_MS), pausedSession);
}

// 15. pauseSessionForBackground / resumeIfRecentBackground — a session backgrounded briefly
// (e.g. checking a notification) should resume transparently; one backgrounded for a long time,
// or paused manually by the user, must never auto-resume.
{
  const THRESHOLD_MS = 3 * 60_000;

  let session = createSession('strength', 'session-19', START_ISO);
  session = pauseSessionForBackground(session, START_MS + 30_000);
  check('pauseSessionForBackground behaves like pauseSession for accumulated time',
    session.accumulatedSeconds, 30);
  check('pauseSessionForBackground marks the session as auto-paused', session.pausedByAppBackground, true);
  check('pauseSessionForBackground records when it happened', session.pausedAtMs, START_MS + 30_000);

  const resumedQuickly = resumeIfRecentBackground(session, START_MS + 30_000 + 5_000, THRESHOLD_MS);
  check('a short background gap (5s) resumes automatically', resumedQuickly.status, 'active');
  check('auto-resume clears the background-pause markers', resumedQuickly.pausedByAppBackground, undefined);

  const stillBackgrounded = resumeIfRecentBackground(
    session,
    START_MS + 30_000 + 20 * 60_000,
    THRESHOLD_MS
  );
  check('a long background gap (20 min) is left paused, not auto-resumed', stillBackgrounded, session);

  // A manual pause must never be mistaken for an auto-pause and silently resumed.
  let manuallyPaused = createSession('strength', 'session-20', START_ISO);
  manuallyPaused = pauseSession(manuallyPaused, START_MS + 10_000);
  const notTouched = resumeIfRecentBackground(manuallyPaused, START_MS + 10_000 + 1_000, THRESHOLD_MS);
  check('a manually-paused session is never auto-resumed', notTouched, manuallyPaused);

  // This is the scenario that broke a naive in-memory ("did I just auto-pause this?") tracker:
  // pause happens, then the JS context is torn down and rebuilt (app reload/relaunch) before the
  // matching foreground event fires. Because the marker lives on the session, not in memory, a
  // brand-new resumeIfRecentBackground() call still resumes it correctly.
  const survivesContextReload = resumeIfRecentBackground(
    { ...session }, // simulates re-reading the exact same persisted session from storage after reload
    START_MS + 30_000 + 2_000,
    THRESHOLD_MS
  );
  check('auto-resume works even after a simulated context reload, since it reads from persisted state',
    survivesContextReload.status, 'active');
}

console.log(
  failures === 0 ? '\nAll workout session checks passed.' : `\n${failures} workout session check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
