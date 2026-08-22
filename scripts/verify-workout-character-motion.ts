import { MotionFamilies } from '@/config/motion-families';
import { DefaultSetReactionLine, MuscleGroupSetReactionLines } from '@/config/muscle-groups';
import type { WorkoutSetEntry } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';
import {
  deriveWorkoutCharacterState,
  getCharacterMotionProfile,
  getExerciseReactionCopy,
  isSetCompletePresenting,
  SetCompletePresentationMs,
  willCountAsEffectiveSet,
} from '@/utils/workout-character-motion';
import {
  completeSetAndStartRest,
  computeCompletedSetsCount,
  getRestSecondsRemaining,
} from '@/utils/workout-session';

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


// ── 세트 완료 presentation window ────────────────────────────────────────────
// 연출이 "누른 그 화면에서" 일어나되, 기록과 휴식 시계는 연출과 무관하게 이미 확정돼 있다.

const presenting = (patch: Partial<Parameters<typeof isSetCompletePresenting>[0]> = {}) =>
  isSetCompletePresenting({ presenting: true, paused: false, ending: false, ...patch });

// 창 길이와 모션이 서로 맞물려 있는지 (반동이 휴식 전환에 잘리면 안 된다)
const bounce = getCharacterMotionProfile('set_complete');
expect('창은 지시된 350~500ms 범위 안에 있다', SetCompletePresentationMs >= 350 && SetCompletePresentationMs <= 500);
expect('반동은 창이 닫히기 전에 끝난다', bounce.durationMs < SetCompletePresentationMs);
expect('반동은 1회성이고 1000ms 미만이다', !bounce.repeats && bounce.durationMs > 0 && bounce.durationMs < 1000);
expect('반동의 주 동작은 위로 튀는 이동이다', bounce.translateY < 0 && Math.abs(bounce.translateY) >= 8);
expect('성장으로 읽히는 균일 확대가 아니다 (가로/세로가 어긋난다)', bounce.scaleXDelta < 0 && bounce.scaleYDelta > 0);
expect('반동은 원래 크기로 되돌아온다 (지속되는 크기 변화가 아니다)', !bounce.repeats && Math.abs(bounce.scaleYDelta) < .1);

// G/M/N. 종료와 일시정지가 언제나 창을 이긴다 — 결과 화면으로 반응이 새지 않는다.
expect('G: 창이 닫히면 곧바로 휴식 표현으로 넘어간다', !presenting({ presenting: false }));
expect('M: 운동 종료 중에는 창이 열리지 않는다', !presenting({ ending: true }));
expect('N: 결과 화면으로 넘어간 뒤에도 창이 남지 않는다', !presenting({ ending: true, presenting: true }));
expect('일시정지는 창을 이긴다', !presenting({ paused: true }));
expect('평상시에는 창이 정상적으로 열린다', presenting());
expect('K: 화면을 다시 열면(플래그 없음) 축하를 재생하지 않는다', !presenting({ presenting: false }));

// 창이 열려 있는 동안 캐릭터는 set_complete 상태다 — 휴식이 이미 시작됐어도 그렇다.
expect('창이 열린 동안 캐릭터는 SET_COMPLETE다', state({ setJustCompleted: presenting(), resting: true }) === 'set_complete');
expect('창이 닫히면 캐릭터는 REST로 넘어간다', state({ setJustCompleted: presenting({ presenting: false }), resting: true }) === 'resting');
expect('O: reduced motion은 반동을 없앤다', getCharacterMotionProfile('set_complete', undefined, true).durationMs === 0 && getCharacterMotionProfile('set_complete', undefined, true).translateY === 0);

// A~E. 어떤 세트가 창을 열 수 있는가 — 판정은 isEffectiveSet 하나만 쓴다.
expect('A: 횟수가 없는 세트는 창을 열지 않는다', !willCountAsEffectiveSet(set({ weightKg: 60, completed: false })));
expect('B: 0회 세트는 창을 열지 않는다', !willCountAsEffectiveSet(set({ weightKg: 60, reps: 0, completed: false })));
expect('C: 0kg x 유효 횟수는 창을 연다', willCountAsEffectiveSet(set({ weightKg: 0, reps: 10, completed: false })));
expect('D: 중량 미입력 x 유효 횟수는 창을 연다', willCountAsEffectiveSet(set({ reps: 10, completed: false })));
expect('E: 일반 중량 세트는 창을 연다', willCountAsEffectiveSet(set({ weightKg: 60, reps: 8, completed: false })));

// F/H/J/L. 기록과 휴식 시계는 연출과 무관하게 완료 시점에 확정된다.
const t0 = 1_700_000_000_000;
const baseSession: WorkoutSession = {
  id: 'session-presentation', startedAt: new Date(t0).toISOString(), activeSince: new Date(t0).toISOString(),
  accumulatedSeconds: 0, status: 'active', primaryCategory: 'strength',
  exercises: [{ id: 'ex-1', exerciseId: 'bench-press', exerciseName: '벤치프레스', sets: [
    { id: 'set-1', weightKg: 60, reps: 10, completed: false },
    { id: 'set-2', weightKg: 60, reps: 10, completed: false },
  ] }],
  currentExerciseId: 'ex-1', createdAt: new Date(t0).toISOString(),
};

const afterComplete = completeSetAndStartRest(baseSession, 'ex-1', 'set-1', 90, t0);
expect('F: 완료한 세트는 연출 전에 이미 completed다', afterComplete.exercises[0].sets[0].completed === true);
expect('F: 휴식 종료 절대시각도 완료 시점에 이미 확정된다', afterComplete.restUntilMs === t0 + 90_000);
expect('J: 연출 중 화면을 벗어나도 세트는 세션에 남는다', computeCompletedSetsCount(afterComplete) === 1);
expect('H: 휴식 종료 시각은 presentation 길이를 전혀 타지 않는다', afterComplete.restUntilMs === t0 + 90 * 1000);
const remainingMsAtWindowEnd = (afterComplete.restUntilMs ?? 0) - (t0 + SetCompletePresentationMs);
expect('H: 창이 닫힌 순간 남은 휴식은 딱 그만큼 줄어 있다', remainingMsAtWindowEnd === 90_000 - SetCompletePresentationMs);
expect('H: 창이 휴식을 늘리지 않는다 (90초 + 연출 아님)', remainingMsAtWindowEnd < 90_000);
expect('K: 복귀 시 남은 휴식은 절대시각에서만 계산된다',
  getRestSecondsRemaining(afterComplete, t0 + 30_000) === 60 && getRestSecondsRemaining(afterComplete, t0 + 90_000) === 0);

// I. 같은 세트에 연타가 들어와도 완료 세트가 늘어나지 않는다.
const doubleTapped = completeSetAndStartRest(afterComplete, 'ex-1', 'set-1', 90, t0 + 100);
expect('I: 같은 세트를 두 번 눌러도 완료 세트는 하나다', computeCompletedSetsCount(doubleTapped) === 1);

// L. 마지막 세트도 같은 경로를 그대로 탄다.
const lastSet = completeSetAndStartRest(afterComplete, 'ex-1', 'set-2', 90, t0 + 1000);
expect('L: 마지막 세트도 완료되고 휴식이 시작된다',
  computeCompletedSetsCount(lastSet) === 2 && lastSet.restUntilMs === t0 + 1000 + 90_000);

// P. READY 동작은 그대로다.
expect('P: 휴식이 끝나면 여전히 READY를 거친다', state({ resting: false, restJustEnded: true }) === 'ready');
expect('P: READY 창이 지나면 다시 입력 상태다', state({ resting: false, restJustEnded: false }) === 'working');

console.log(failures === 0 ? '\nAll WORKOUT CHARACTER MOTION checks passed.' : `\n${failures} WORKOUT CHARACTER MOTION check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
