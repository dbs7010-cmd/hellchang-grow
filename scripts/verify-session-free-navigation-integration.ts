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

// Safety semantics that must survive the UX simplification.
assert(source.includes('sessionCompletedSets === 0'), 'zero-effective-set exit stays distinct from completion');
assert(source.includes('shouldConfirmSessionExit'), 'back navigation keeps active-session protection');
assert(source.includes('endingRef.current'), 'end-workout idempotency guard remains present');
assert(source.includes('presentingSetComplete'), 'set-complete presentation remains separate from persistence');

console.log(`verify-session-free-navigation-integration: ${passed} assertions passed`);
