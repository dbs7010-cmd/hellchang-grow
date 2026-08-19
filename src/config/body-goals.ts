/**
 * BODY GOAL — "지방은 CUT, 근력은 UP"을 사용자별로 구체화하는 최소 구조.
 *
 * 이 값은 앞으로 운동 추천 / 캐릭터 변화 표현 / AI PT가 공통으로 참조하는 컨텍스트다
 * (utils/recommendation-context.ts). 지금은 저장하고 보여주기만 하며, 이 값으로
 * 가짜 체지방·근육량 수치를 만들어내지 않는다.
 *
 * 성별로 목표를 나누지 않는다 — 남녀 모두 동일한 세 가지를 그대로 쓴다.
 * 목표 체형(슬림 / 애슬레틱 / 볼륨·라인 등)이나 부위 focus(하체/둔근/상체)는 이 위에
 * 별도 필드로 얹을 수 있게 두고, V1에서는 만들지 않는다.
 */
export type BodyGoalId = 'fat_cut' | 'strength_up' | 'balanced';

export const BodyGoalIds: BodyGoalId[] = ['fat_cut', 'strength_up', 'balanced'];

export const BodyGoalLabels: Record<BodyGoalId, string> = {
  fat_cut: '지방 CUT',
  strength_up: '근력 UP',
  balanced: '체형 개선',
};

export const BodyGoalDescriptions: Record<BodyGoalId, string> = {
  fat_cut: '체지방을 줄이는 데 무게를 둬요.',
  strength_up: '드는 무게와 수행 능력을 올리는 데 무게를 둬요.',
  balanced: '체중 변화보다 몸의 균형과 라인을 바꾸는 데 무게를 둬요.',
};

/**
 * 목표를 아직 고르지 않은 사용자의 기본값.
 * 체중 감량만이 성공이 아니라는 제품 방향에 맞춰 '체형 개선'을 기본으로 둔다.
 */
export const DefaultBodyGoalId: BodyGoalId = 'balanced';

/** 저장된 값이 없거나 알 수 없는 값이면 기본 목표로 떨어뜨린다. */
export function resolveBodyGoal(value: string | undefined): BodyGoalId {
  return BodyGoalIds.includes(value as BodyGoalId) ? (value as BodyGoalId) : DefaultBodyGoalId;
}

/**
 * 온보딩 선택 카드에서 쓰는 표현. 목표 이름(BodyGoalLabels)은 설정/히스토리 등 좁은 자리에서
 * 그대로 쓰고, 아이콘과 한 줄 설명이 필요한 곳만 이 표를 참조한다.
 * 특정 성별에만 해당하는 표현을 쓰지 않는다.
 */
export const BodyGoalOnboardingCopy: Record<BodyGoalId, { icon: string; label: string; description: string }> = {
  fat_cut: {
    icon: '🔥',
    label: '지방 CUT',
    description: '체지방을 줄이면서 몸의 선을 만들어요',
  },
  strength_up: {
    icon: '💪',
    label: '근력 UP',
    description: '힘과 근육을 키우는 데 집중해요',
  },
  balanced: {
    icon: '⚡',
    label: '체형 개선',
    description: '지방과 근력을 균형 있게 관리해요',
  },
};
