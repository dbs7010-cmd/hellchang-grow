import { MotionFamilyTransforms } from '@/config/motion-families';
import { DefaultSetReactionLine, MuscleGroupSetReactionLines } from '@/config/muscle-groups';
import type { MotionFamily, MuscleGroup } from '@/types/exercise';
import type { WorkoutSetEntry } from '@/types/workout';
import { isEffectiveSet } from '@/utils/workout-session';

/**
 * 세션 화면의 단백이 표현 상태. **전부 일시적인 표현값이다** — 여기서 성장(SP/Stage/
 * BodyParameters)을 만들거나 바꾸지 않는다. 실제 성장과 보상은 운동 종료 파이프라인에서만
 * 일어난다. 'set_complete'와 'ready'는 짧게 스쳐가는 반응 상태다.
 */
export type WorkoutCharacterState =
  | 'idle'
  | 'ready'
  | 'working'
  | 'set_complete'
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
  /** 방금 유효 세트를 끝낸 짧은 순간인가 (화면이 타이머로 껐다 켜는 일시 플래그) */
  setJustCompleted?: boolean;
  /** 휴식이 막 끝난 짧은 순간인가 */
  restJustEnded?: boolean;
}): WorkoutCharacterState {
  if (input.ending) return 'complete';
  if (input.paused) return 'paused';
  // 세트 완료 반응은 자동으로 시작되는 휴식보다 먼저 보여야 한다 — 그 뒤 휴식으로 넘어간다.
  if (input.setJustCompleted) return 'set_complete';
  if (input.resting) return 'resting';
  if (!input.hasExercise) return 'idle';
  if (input.restJustEnded) return 'ready';
  return input.hasPendingSet ? 'working' : 'ready';
}

/**
 * 지금 완료하려는 세트가 실제 기록으로 남을 세트인가 — 남지 않을 세트에는 캐릭터도
 * 반응하지 않는다.
 *
 * 호출 시점은 **완료 직전**이라 아직 completed가 false다. 그래서 완료 후의 모습으로
 * 바꿔 기존 isEffectiveSet에 그대로 물어본다 — 판정식(횟수 > 0)을 여기에 복제하지 않는다.
 */
export function willCountAsEffectiveSet(set: WorkoutSetEntry | undefined): boolean {
  return Boolean(set && isEffectiveSet({ ...set, completed: true }));
}

/** 방금 자극한 부위에 대한 단백이의 한 줄. 부위를 모르면 범용 문구 하나로 떨어진다. */
export function getExerciseReactionCopy(muscleGroup?: MuscleGroup): string {
  return muscleGroup ? MuscleGroupSetReactionLines[muscleGroup] : DefaultSetReactionLine;
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
  // 세트를 끝낸 직후의 짧은 한 번짜리 반동. 반복하지 않고 곧 휴식/입력 상태로 넘어간다.
  if (state === 'set_complete') {
    return { ...neutral, translateY: -4, scaleXDelta: .03, scaleYDelta: .03, durationMs: 700, repeats: false };
  }
  if (state === 'ready') return { ...neutral, scaleXDelta: .008, scaleYDelta: .008, durationMs: 1400, repeats: true };
  if (state === 'resting') return { ...neutral, translateY: 2, scaleYDelta: -.01, durationMs: 2200, repeats: true };
  if (state === 'complete') return { ...neutral, translateY: -3, scaleXDelta: .025, scaleYDelta: .025, durationMs: 600, repeats: false };
  return neutral;
}
