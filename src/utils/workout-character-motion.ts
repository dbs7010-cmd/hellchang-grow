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
  /**
   * 세트를 끝낸 직후의 짧은 한 번짜리 반동. 반복하지 않고 곧 휴식/입력 상태로 넘어간다.
   *
   * 위로 튀는 translateY가 주 동작이고, 스케일은 **가로 -/세로 +로 어긋나게** 둔다 —
   * 가로세로가 함께 커지면 "몸이 커졌다"(성장)로 읽히기 때문이다. 여기서 커지는 것은
   * 아무것도 없고, 460ms 안에 원래 크기로 정확히 돌아온다.
   * presentation window(480ms)보다 짧아야 반동이 휴식 전환에 잘리지 않는다.
   */
  if (state === 'set_complete') {
    return { ...neutral, translateY: -10, scaleXDelta: -.015, scaleYDelta: .04, durationMs: 460, repeats: false };
  }
  if (state === 'ready') return { ...neutral, scaleXDelta: .008, scaleYDelta: .008, durationMs: 1400, repeats: true };
  if (state === 'resting') return { ...neutral, translateY: 2, scaleYDelta: -.01, durationMs: 2200, repeats: true };
  if (state === 'complete') return { ...neutral, translateY: -3, scaleXDelta: .025, scaleYDelta: .025, durationMs: 600, repeats: false };
  return neutral;
}

// ── 세트 완료 presentation window ────────────────────────────────────────────

/**
 * 세트를 끝낸 직후 **휴식 화면으로 넘어가기 전에** 단백이 반응을 보여 주는 시간(ms).
 *
 * 예전에는 완료를 누른 지 100ms도 안 돼 화면 전체가 휴식으로 바뀌어서, 반응이 방금 누른
 * 화면이 아니라 낯선 화면의 작은 캐릭터(104px → 70px)에서 일어났다. 이 창 동안에는 운동
 * 화면을 그대로 두고 같은 크기의 단백이가 반응한 뒤 휴식으로 넘어간다.
 *
 * **연출 시간일 뿐 휴식 시간이 아니다.** 세트 완료와 함께 확정된 restUntilMs는 이미
 * 흐르고 있으므로, 이 창이 끝났을 때 남은 휴식은 정확히 그만큼 줄어 있다.
 * set_complete 모션(durationMs)보다 조금 길게 잡아 반동이 잘리지 않게 한다.
 */
export const SetCompletePresentationMs = 480;

/**
 * 지금 세트 완료 반응을 보여 주는 중인가.
 *
 * `presenting`은 완료를 누른 화면이 켜 둔 **표현 전용 플래그**다 — 저장되지 않으므로
 * 화면을 벗어났다 돌아오면 꺼져 있고, 그때는 남은 휴식 절대시각만 보고 곧바로 휴식으로
 * 들어간다(축하를 다시 재생하지 않는다).
 *
 * 종료와 일시정지는 언제나 이 창을 이긴다 — 결과 화면이나 일시정지로 반응이 새지 않는다.
 * 이 창은 화면 표시만 붙잡는다. 세트 기록도, 휴식 종료 시각도 이미 확정된 뒤다.
 */
export function isSetCompletePresenting(input: {
  presenting: boolean;
  paused: boolean;
  ending: boolean;
}): boolean {
  return input.presenting && !input.paused && !input.ending;
}
