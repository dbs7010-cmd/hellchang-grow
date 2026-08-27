import fs from 'node:fs';

const source = fs.readFileSync('src/app/session.tsx', 'utf8');

let passed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
}

// Domain/persistence calls that the presentation pass must preserve.
assert(source.includes('completeSessionSet(currentExercise.id, setId'), 'set completion persistence remains wired');
assert(source.includes('getAutoRestSeconds('), 'automatic rest remains wired');
assert(source.includes('endWorkoutSession()'), 'normal workout completion remains wired');
assert(source.includes('discardWorkoutSession()'), 'zero-effective-set discard remains wired');
assert(source.includes('setCurrentSessionExercise'), 'direct exercise switching remains wired');
assert(source.includes('addExerciseToSession'), 'mid-session exercise add remains wired');

// A session that has no exercise yet must still say what to do next, and the
// saved record must be reachable straight from the result screen.
assert(source.includes('hasSessionExercises'), 'empty session is an explicit presentation state');
assert(
  source.includes('운동을 하나 고르면 바로 세트를 기록할 수 있어요. 세트를 완료해야 기록이 남아요.'),
  'empty session states the next step and what makes a record'
);
assert(source.includes('addExerciseOpen'), 'exercise picking stays open while the session is empty');
assert(
  source.includes('await setCurrentSessionExercise(entryId)'),
  'a freshly added exercise becomes the one being worked on'
);
assert(source.includes('findWorkoutRecordForSession'), 'result screen resolves the persisted record');
assert(source.includes("pathname: '/workout-record'"), 'result screen opens the shared record detail');

// Safety semantics that must survive the UX simplification.
assert(source.includes('sessionCompletedSets === 0'), 'zero-effective-set exit stays distinct from completion');
assert(source.includes('shouldConfirmSessionExit'), 'back navigation keeps active-session protection');
assert(source.includes('endingRef.current'), 'end-workout idempotency guard remains present');
assert(source.includes('presentingSetComplete'), 'set-complete presentation remains separate from persistence');

console.log(`verify-session-free-navigation-integration: ${passed} assertions passed`);
