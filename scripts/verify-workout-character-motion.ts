import { MotionFamilies } from '@/config/motion-families';
import { deriveWorkoutCharacterState, getCharacterMotionProfile } from '@/utils/workout-character-motion';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const state = (patch: Partial<Parameters<typeof deriveWorkoutCharacterState>[0]> = {}) =>
  deriveWorkoutCharacterState({ ending: false, paused: false, resting: false, hasExercise: true, hasPendingSet: true, ...patch });

const press = getCharacterMotionProfile('working', 'horizontal_press');
const pull = getCharacterMotionProfile('working', 'horizontal_pull');
expect('A: PRESS maps to a repeating working motion', press.repeats && press.durationMs > 0);
expect('A/F: rest has its own slower reaction', state({ resting: true }) === 'resting' && getCharacterMotionProfile('resting').durationMs > press.durationMs);
expect('A/G: pause overrides the working loop', state({ paused: true }) === 'paused' && getCharacterMotionProfile('paused').durationMs === 0);
expect('B: PULL moves differently from PRESS', pull.translateX !== press.translateX && pull.scaleXDelta !== press.scaleXDelta);

const squat = getCharacterMotionProfile('working', 'squat');
expect('C: SQUAT is lower-body weighted through vertical compression', squat.translateY > 0 && squat.scaleYDelta < 0);
const curl = getCharacterMotionProfile('working', 'curl');
expect('D: CURL has a compact arm-like rotation', Math.abs(curl.rotateDeg) > 0 && Math.abs(curl.translateY) < Math.abs(squat.translateY));

const cardio = getCharacterMotionProfile('working', 'cardio');
expect('E: CARDIO has a short repeating bounce', cardio.repeats && cardio.durationMs <= 1000 && cardio.translateY < 0);
expect('E: every existing MotionFamily has a working profile', MotionFamilies.every((family) => getCharacterMotionProfile('working', family).durationMs > 0));
expect('F: rest -> working resumes through existing session inputs', state({ resting: true }) === 'resting' && state() === 'working');
expect('G: pause -> resume does not create a new state machine', state({ paused: true }) === 'paused' && state() === 'working');

const complete = getCharacterMotionProfile('complete', 'horizontal_press');
expect('H: ending wins over pause/rest and uses one short reaction', state({ ending: true, paused: true, resting: true }) === 'complete' && !complete.repeats && complete.durationMs <= 1000);
const reduced = getCharacterMotionProfile('working', 'squat', true);
expect('I: reduced motion removes outer translation/rotation/scale loop', reduced.durationMs === 0 && reduced.translateY === 0 && reduced.rotateDeg === 0 && reduced.scaleYDelta === 0);
expect('fatigued remains available but is not inferred without data', state() !== 'fatigued' && getCharacterMotionProfile('fatigued', 'squat').durationMs > squat.durationMs);

console.log(failures === 0 ? '\nAll WORKOUT CHARACTER MOTION checks passed.' : `\n${failures} WORKOUT CHARACTER MOTION check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
