import type { Href } from 'expo-router';

import { learnedFamilyCount } from '@/utils/danbaek-learning-presence';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 단백세상 입구 SEAM (APP 쪽 경계 하나)
 *
 * APP은 **단백세상을 구현하지 않는다.** WORLD는 다른 브랜치의 소유이고, 여기서 그 내부를
 * 추측해 흉내 내면 통합할 때 두 개의 서로 다른 세상이 남는다.
 *
 * 그래서 이 파일이 하는 일은 하나다 — "입구가 생기면 HOME이 어디로 보내야 하는가"를
 * 한 곳에 모아 두는 것. 통합(rebuild/integration)은 `DanbaekWorldEntry` 한 줄만 바꾸면
 * 되고, HOME 화면 코드는 손대지 않는다.
 *
 * 지금은 route가 없다. **없는 route로 가는 버튼을 만들지 않는다** — 눌러도 아무 일이
 * 없는 입구는 입구가 아니라 버그다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface DanbaekWorldEntrySeam {
  /** WORLD가 이 앱에 연결됐는지. 통합 전까지는 false다. */
  available: boolean;
  /** 연결됐을 때 이동할 경로. APP은 이 값을 만들지 않고 받기만 한다. */
  route: Href | null;
}

/**
 * 통합 전 기본값. rebuild/integration이 WORLD 라우트를 붙일 때 여기만 바꾼다.
 * (APP 브랜치에서 route를 채우면 그 순간 WORLD를 추측해 만든 것이 된다.)
 */
export const DanbaekWorldEntry: DanbaekWorldEntrySeam = {
  available: false,
  route: null,
};

export interface DanbaekWorldEntrySurface {
  route: Href;
  label: string;
  /** 학습에서 나오는 보조 문구. 없는 진행도를 지어내지 않는다. */
  subLabel: string;
}

/**
 * HOME에 입구를 낼지, 낸다면 뭐라고 쓸지.
 *
 * seam이 닫혀 있으면 null이다 — 화면은 그때 아무것도 그리지 않는다. 보조 문구는 APP이
 * 이미 아는 학습(배운 계열 수)에서만 나오고, WORLD의 스테이지/진행도는 쓰지 않는다.
 * WORLD가 준 적 없는 값이기 때문이다.
 */
export function resolveDanbaekWorldEntry(input: {
  profile: DanbaekLearningProfile;
  seam?: DanbaekWorldEntrySeam;
}): DanbaekWorldEntrySurface | null {
  const seam = input.seam ?? DanbaekWorldEntry;
  if (!seam.available || !seam.route) return null;

  const learned = learnedFamilyCount(input.profile);

  return {
    route: seam.route,
    label: '단백세상',
    subLabel: learned > 0 ? `단백이가 배운 동작 ${learned}가지` : '아직 배운 동작이 없어요',
  };
}
