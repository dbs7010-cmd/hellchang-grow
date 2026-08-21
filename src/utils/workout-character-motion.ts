import { MotionFamilyTransforms } from '@/config/motion-families';
import type { MotionFamily } from '@/types/exercise';

export type WorkoutCharacterState =
  | 'idle'
  | 'ready'
  | 'working'
  | 'resting'
  | 'fatigued'
  | 'paused'
  | 'complete';

export interface CharacterMotionProfile {
  translateX: number;
  translateY: number;
  rotateDeg: number;
  scaleXDelta: number;
  scaleYDelta: number;
  durationMs: number;
  repeats: boolean;
}

const neutral: CharacterMotionProfile = {
  translateX: 0,
  translateY: 0,
  rotateDeg: 0,
  scaleXDelta: 0,
  scaleYDelta: 0,
  durationMs: 0,
  repeats: false,
};

export function deriveWorkoutCharacterState(input: {
  ending: boolean;
  paused: boolean;
  resting: boolean;
  hasExercise: boolean;
  hasPendingSet: boolean;
}): WorkoutCharacterState {
  if (input.ending) return 'complete';
  if (input.paused) return 'paused';
  if (input.resting) return 'resting';
  if (!input.hasExercise) return 'idle';
  return input.hasPendingSet ? 'working' : 'ready';
}

export function getCharacterMotionProfile(
  state: WorkoutCharacterState,
  family?: MotionFamily,
  reducedMotion = false
): CharacterMotionProfile {
  if (reducedMotion) return neutral;
  if (state === 'working' && family) return MotionFamilyTransforms[family];
  if (state === 'fatigued' && family) {
    const base = MotionFamilyTransforms[family];
    return {
      ...base,
      translateX: base.translateX * .55,
      translateY: base.translateY * .55,
      rotateDeg: base.rotateDeg * .55,
      scaleXDelta: base.scaleXDelta * .55,
      scaleYDelta: base.scaleYDelta * .55,
      durationMs: Math.round(base.durationMs * 1.25),
    };
  }
  if (state === 'ready') return { ...neutral, scaleXDelta: .008, scaleYDelta: .008, durationMs: 1400, repeats: true };
  if (state === 'resting') return { ...neutral, translateY: 2, scaleYDelta: -.01, durationMs: 2200, repeats: true };
  if (state === 'complete') return { ...neutral, translateY: -3, scaleXDelta: .025, scaleYDelta: .025, durationMs: 600, repeats: false };
  return neutral;
}
