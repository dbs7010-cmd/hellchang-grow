import type { MovementFamily } from '@/types/danbaek-contract';
import { withObjectParticle } from '@/utils/korean';

/**
 * 움직임 계열의 사람 말 이름.
 *
 * 계약(`types/danbaek-contract.ts`)의 값은 APP↔WORLD가 주고받는 식별자라 영어 그대로 두고,
 * 화면에 나갈 이름만 여기서 고른다 — 표시 문자열을 도메인 값에 박지 않는다.
 *
 * 단백이가 "무엇을 따라 하는지"를 말하는 자리라, 기구 이름(벤치프레스)이 아니라 동작
 * (미는 동작)으로 부른다. 같은 계열이면 기구가 달라도 같은 배움이기 때문이다.
 */
export const MovementFamilyLabels: Record<MovementFamily, string> = {
  push_horizontal: '미는 동작',
  pull_vertical: '매달려 당기는 동작',
  pull_horizontal: '당기는 동작',
  squat: '앉았다 일어서는 동작',
  hinge: '숙였다 세우는 동작',
  push_vertical: '머리 위로 미는 동작',
  carry: '들고 버티는 동작',
  locomotion: '이동하는 동작',
};

/**
 * 유효한 세트를 끝냈을 때 단백이가 보이는 반응 한 줄.
 *
 * 헌법 2장: 단백이는 플레이어를 **지켜보고 따라 한다**. 그래서 "네 근육이 커졌다"가 아니라
 * "얘가 방금 그 동작을 따라 해봤다"로 말한다. 실제 학습(evidence)은 세트가 아니라 저장된
 * 기록에서 나오므로, 이 문장은 연출일 뿐 학습을 만들지 않는다.
 */
export function buildCopyAttemptLine(movementFamily: MovementFamily): string {
  return `단백이가 ${withObjectParticle(MovementFamilyLabels[movementFamily])} 따라 해본다`;
}
