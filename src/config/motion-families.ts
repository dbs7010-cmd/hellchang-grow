import type { Equipment, MotionFamily, MuscleGroup } from '@/types/exercise';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOTION FAMILY REGISTRY
 *
 * "종목마다 애니메이션을 만들지 않는다"를 코드로 강제하는 자리다. 캐릭터(단백이)가 실제로
 * 재생하는 모션은 여기 있는 것이 전부이며, Exercise는 `animationFamily`로 그중 하나를
 * 가리킬 뿐이다. 새 운동을 추가할 때 새 모션을 만드는 게 아니라 기존 family에 붙인다.
 *
 * V1의 모션은 실제 애니메이션 클립이 아니라 **파라미터**다 (축/진폭/한 반복 길이).
 * `components/character/character-motion-stage.tsx`가 이 값으로 공통 루프를 돌린다.
 * 실제 스프라이트/립sync 애니메이션이 준비되면 각 family에 `clip` 필드를 추가하고
 * 화면 코드는 그대로 둔다 — 연결 지점은 이 파일 하나다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 모션이 캐릭터를 어느 축으로 움직이는가. 스프라이트가 없을 때의 placeholder 표현 규칙. */
export type MotionAxis = 'vertical' | 'horizontal' | 'scale';

export interface MotionFamilyDescriptor {
  id: MotionFamily;
  /** 사용자에게 보여줄 수 있는 이름 (운동 상세/디버그용). 도메인 ID와 분리해 둔다. */
  label: string;
  axis: MotionAxis;
  /** placeholder 모션의 이동량(px) 또는 scale 변화량(비율). */
  amplitude: number;
  /** 1회 반복(내렸다 올리기)에 걸리는 시간(ms). */
  repDurationMs: number;
}

export const MotionFamilyDescriptors: Record<MotionFamily, MotionFamilyDescriptor> = {
  horizontal_press: { id: 'horizontal_press', label: '수평 밀기', axis: 'horizontal', amplitude: 6, repDurationMs: 2000 },
  vertical_press: { id: 'vertical_press', label: '수직 밀기', axis: 'vertical', amplitude: 8, repDurationMs: 2000 },
  fly: { id: 'fly', label: '모으기', axis: 'horizontal', amplitude: 5, repDurationMs: 2400 },
  horizontal_pull: { id: 'horizontal_pull', label: '수평 당기기', axis: 'horizontal', amplitude: 6, repDurationMs: 2000 },
  vertical_pull: { id: 'vertical_pull', label: '수직 당기기', axis: 'vertical', amplitude: 9, repDurationMs: 2200 },
  curl: { id: 'curl', label: '컬', axis: 'vertical', amplitude: 4, repDurationMs: 1800 },
  extension: { id: 'extension', label: '익스텐션', axis: 'vertical', amplitude: 4, repDurationMs: 1800 },
  raise: { id: 'raise', label: '레이즈', axis: 'horizontal', amplitude: 4, repDurationMs: 1800 },
  squat: { id: 'squat', label: '스쿼트', axis: 'vertical', amplitude: 12, repDurationMs: 2600 },
  hip_hinge: { id: 'hip_hinge', label: '힙 힌지', axis: 'vertical', amplitude: 10, repDurationMs: 2600 },
  leg_press: { id: 'leg_press', label: '레그프레스', axis: 'vertical', amplitude: 8, repDurationMs: 2400 },
  leg_isolation: { id: 'leg_isolation', label: '하체 고립', axis: 'vertical', amplitude: 5, repDurationMs: 2000 },
  calf: { id: 'calf', label: '카프', axis: 'vertical', amplitude: 4, repDurationMs: 1400 },
  core: { id: 'core', label: '코어', axis: 'scale', amplitude: 0.03, repDurationMs: 2400 },
  cardio: { id: 'cardio', label: '유산소', axis: 'vertical', amplitude: 6, repDurationMs: 900 },
};

export const MotionFamilies: MotionFamily[] = Object.keys(MotionFamilyDescriptors) as MotionFamily[];

export function getMotionFamilyDescriptor(family: MotionFamily): MotionFamilyDescriptor {
  return MotionFamilyDescriptors[family];
}

/**
 * `animationFamily`가 지정되지 않은 운동의 fallback. Exercise DB의 44개 항목에는 전부
 * 명시돼 있으므로 이 함수는 [직접 운동 추가]로 만든 즉석 운동에만 쓰인다 —
 * 그런 운동도 캐릭터가 아무것도 하지 않는 상태로 남지 않게 한다.
 */
export function inferMotionFamily(input: {
  primaryMuscleGroup: MuscleGroup;
  equipment: Equipment;
}): MotionFamily {
  switch (input.primaryMuscleGroup) {
    case 'chest':
      return 'horizontal_press';
    case 'back':
      return 'horizontal_pull';
    case 'shoulders':
      return 'vertical_press';
    case 'arms':
      return 'curl';
    case 'legs':
      return 'squat';
    case 'core':
      return 'core';
    case 'fullBody':
    default:
      return input.equipment === 'bodyweight' ? 'cardio' : 'hip_hinge';
  }
}
