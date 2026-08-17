// Standalone verification for the pure WorkoutSession logic (src/utils/workout-session.ts).
// Run: npm run verify:session
import {
  addSessionActivity,
  changeSessionCategory,
  completeSession,
  computeElapsedSeconds,
  createSession,
  formatElapsedTime,
  pauseSession,
  resumeSession,
  sessionToWorkoutRecordInput,
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

// 6. Category change and optional activity logging don't affect elapsed time
{
  let session = createSession('strength', 'session-7', START_ISO);
  session = changeSessionCategory(session, 'home');
  check('category change updates primaryCategory', session.primaryCategory, 'home');

  session = addSessionActivity(session, { id: 'ex-1', name: '벤치프레스', sets: 3, reps: 10 });
  check('activity gets appended', session.activities?.length, 1);
  check('elapsed unaffected by category/activity changes',
    computeElapsedSeconds(session, START_MS + 5_000), 5);
}

// 7. Completing a session freezes final elapsed and converts cleanly to a WorkoutRecord input
{
  let session = createSession('strength', 'session-8', START_ISO);
  const completed = completeSession(session, new Date(START_MS + 42 * 60_000).toISOString(), START_MS + 42 * 60_000);
  check('completed session status is completed', completed.status, 'completed');
  check('completed session records final elapsed seconds', completed.accumulatedSeconds, 42 * 60);

  const recordInput = sessionToWorkoutRecordInput(completed, '웨이트');
  check('derived record uses the session start date', recordInput.date, '2026-08-18');
  check('derived record duration matches elapsed minutes', recordInput.durationMinutes, 42);
  check('derived record is marked completed', recordInput.completed, true);
  check('derived record gets a sensible default title', recordInput.title, '웨이트 세션');
}

// 8. A session completed in under a minute still gets a non-zero duration (no "0분" record)
{
  const session = createSession('strength', 'session-9', START_ISO);
  const completed = completeSession(session, new Date(START_MS + 20_000).toISOString(), START_MS + 20_000);
  const recordInput = sessionToWorkoutRecordInput(completed, '웨이트');
  check('sub-minute sessions round up to at least 1 minute', recordInput.durationMinutes, 1);
}

// 9. formatElapsedTime formatting
{
  check('formats under an hour as MM:SS', formatElapsedTime(65), '01:05');
  check('formats an hour+ as H:MM:SS', formatElapsedTime(3661), '1:01:01');
  check('formats zero', formatElapsedTime(0), '00:00');
}

console.log(
  failures === 0 ? '\nAll workout session checks passed.' : `\n${failures} workout session check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
