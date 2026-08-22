import { MotionFamilies } from '@/config/motion-families';
import { DefaultSetReactionLine, MuscleGroupSetReactionLines } from '@/config/muscle-groups';
import type { WorkoutSetEntry } from '@/types/workout';
import {
  deriveWorkoutCharacterState,
  getCharacterMotionProfile,
  getExerciseReactionCopy,
  willCountAsEffectiveSet,
} from '@/utils/workout-character-motion';

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


// ── 세션 중 단백이 반응 (표현 전용 transient state) ─────────────────────────
const set = (over: Partial<WorkoutSetEntry>): WorkoutSetEntry => ({ id: 's', completed: true, ...over });

expect('1: an invalid set (no reps) triggers no reaction', !willCountAsEffectiveSet(set({})));
expect('1: a 0-rep set triggers no reaction', !willCountAsEffectiveSet(set({ weightKg: 100, reps: 0 })));
// 완료 직전 세트(completed: false)를 받는 것이 실제 호출 계약이다.
expect('1: a pending set with no reps triggers no reaction', !willCountAsEffectiveSet(set({ completed: false })));
expect('1: a pending 0-rep set triggers no reaction', !willCountAsEffectiveSet(set({ weightKg: 100, reps: 0, completed: false })));
expect('2: a pending set with real reps does trigger the reaction', willCountAsEffectiveSet(set({ reps: 10, completed: false })));
expect('3: a pending 0kg x 10 set triggers the reaction', willCountAsEffectiveSet(set({ weightKg: 0, reps: 10, completed: false })));
expect('2: a reps-only set triggers the reaction', willCountAsEffectiveSet(set({ reps: 12 })));
expect('3: a 0kg x 10 set triggers the reaction', willCountAsEffectiveSet(set({ weightKg: 0, reps: 10 })));
expect('4: a weighted set triggers the reaction', willCountAsEffectiveSet(set({ weightKg: 60, reps: 8 })));

expect('2/3/4: the reaction state wins over the auto-started rest for its short window',
  state({ setJustCompleted: true, resting: true }) === 'set_complete');
expect('5: once the reaction window ends the session falls back to REST',
  state({ setJustCompleted: false, resting: true }) === 'resting');
expect('6: when rest ends the character shows READY before the next input',
  state({ resting: false, restJustEnded: true }) === 'ready');
expect('6: READY gives way to the normal input state once the window passes',
  state({ resting: false, restJustEnded: false }) === 'working');
expect('7: ending the workout clears any transient reaction',
  state({ ending: true, setJustCompleted: true, restJustEnded: true }) === 'complete');
expect('7: pause also wins over the transient reaction',
  state({ paused: true, setJustCompleted: true }) === 'paused');

const reaction = getCharacterMotionProfile('set_complete');
expect('the set reaction is one short non-repeating bounce', !reaction.repeats && reaction.durationMs > 0 && reaction.durationMs <= 1000);
expect('the set reaction is muted with reduced motion', getCharacterMotionProfile('set_complete', undefined, true).durationMs === 0);

expect('copy: a known muscle group gets its own line', getExerciseReactionCopy('chest') === MuscleGroupSetReactionLines.chest);
expect('copy: legs and back do not share a line', getExerciseReactionCopy('legs') !== getExerciseReactionCopy('back'));
expect('copy: an unmapped exercise falls back to one generic line', getExerciseReactionCopy(undefined) === DefaultSetReactionLine);
expect('copy: every muscle group has exactly one line', Object.values(MuscleGroupSetReactionLines).every((line) => line.length > 0));

console.log(failures === 0 ? '\nAll WORKOUT CHARACTER MOTION checks passed.' : `\n${failures} WORKOUT CHARACTER MOTION check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
