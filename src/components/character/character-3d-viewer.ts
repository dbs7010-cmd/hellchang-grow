import { GenderExpression } from '@/types/user';

/**
 * CHARACTER 360 최종 사양 계약.
 *
 * 최종 구현은 실제 3D 캐릭터 모델(.glb / .gltf)을 쓰는 가로 360° 뷰어다:
 *  - 좌우 드래그 → Y축 기준 캐릭터 연속 회전 (스냅/페이지 없음)
 *  - 상하 회전 금지
 *  - 카메라 높이/각도 고정, 캐릭터만 수평 회전
 *  - 기본 진입 정면(0°)
 *  - pinch zoom 없음 (V1 불필요)
 *  - 방향 선택 버튼 / page dot / 방향별 이미지 슬롯 없음
 *
 * 지금은 3D asset도 렌더러도 없으므로 CharacterViewer가 이 계약을 그대로 구현하되,
 * 그리는 주체만 임시 placeholder(CharacterSilhouette)다. 상호작용 계약은 이미 최종과 같아서,
 * 나중에 바뀌는 것은 "무엇을 그리는가" 하나뿐이다.
 *
 * TODO(character-3d): PlayerCharacterAssets.model3d가 채워지면
 *  1. 이 인터페이스를 구현하는 Character3DViewer 컴포넌트를 추가하고
 *     (3D 렌더링 라이브러리는 그때 도입한다 — 지금 미리 넣지 않는다),
 *  2. CharacterViewer 내부의 placeholder 분기를 Character3DViewer로 교체하고,
 *  3. placeholder fallback(CharacterSilhouette)을 제거한다.
 *     방향별 이미지 슬롯(CharacterAngle / PlayerCharacterImages)은 이미 제거됐다.
 * CharacterViewer를 호출하는 화면(홈 / 히스토리)은 props가 같아서 손댈 필요가 없다.
 */
export interface Character3DViewerProps {
  visible: boolean;
  onClose: () => void;
  /**
   * 체형 파라미터. placeholder에서는 도형 크기 보정에 쓰고,
   * 3D 모델에서는 blend shape / morph target 입력이 된다.
   */
  genderExpression: GenderExpression;
  /** 0-100, 체형 전체 볼륨 */
  size: number;
  /** 0-100, 근육 톤/선명도 */
  tone: number;
}

/** 정면. 뷰어는 열릴 때마다 항상 이 각도에서 시작한다. */
export const CharacterFrontRotationDeg = 0;

/**
 * 가로 드래그 1px당 회전할 각도. 화면 폭(약 360-412px)을 한 번 훑으면
 * 캐릭터가 반 바퀴보다 조금 더 도는 정도라 "돌려보는" 감각이 자연스럽다.
 * 3D 뷰어로 교체할 때도 같은 감도를 쓴다.
 */
export const CharacterRotationDegreesPerPixel = 0.6;

/** 회전 각도를 0-360 범위로 정규화한다 (연속 회전이라 한 바퀴를 넘어갈 수 있다). */
export function normalizeRotationDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
