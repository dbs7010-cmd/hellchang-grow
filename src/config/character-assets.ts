import { ImageSourcePropType } from 'react-native';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 최종 사양: CHARACTER 360은 실제 3D 캐릭터 모델을 Y축으로 연속 회전시키는 뷰어다.
 * 아래 방향 슬롯(CharacterAngle / PlayerCharacterImages)은 3D 모델이 준비되기 전까지만
 * 쓰는 임시 fallback이며, Character3DViewer로 교체될 때 함께 제거된다.
 * 방향 선택 UI(방향 버튼 / page dot / 방향별 라벨)는 이미 제거했다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * @deprecated 임시 fallback 전용. 최종 3D 뷰어에는 "방향 슬롯" 개념이 없다 —
 * 회전은 연속적인 각도(도) 하나로 표현된다.
 */
export type CharacterAngle = 'front' | 'front-side' | 'side' | 'back-side' | 'back';

/**
 * @deprecated 임시 fallback 전용. 3D 모델(PlayerCharacterModel)이 들어오면 이 맵과
 * 이걸 읽는 코드(CharacterSilhouette의 이미지 분기)는 통째로 사라진다.
 * 값이 없는 방향은 CharacterSilhouette가 도형 placeholder로 그린다.
 */
export const PlayerCharacterImages: Partial<Record<CharacterAngle, ImageSourcePropType>> = {};

/**
 * TODO(character-3d): 실제 플레이어 캐릭터 3D 모델(.glb / .gltf)이 준비되면 여기에 채운다.
 * 예) export const PlayerCharacterModel = require('../../assets/characters/player/player.glb');
 *
 * 이 값이 채워지는 순간부터 CharacterViewer는 placeholder 대신 Character3DViewer를 렌더하고,
 * 위의 방향 슬롯 fallback은 제거한다 (components/character/character-3d-viewer.ts 참고).
 * 지금 가짜 3D를 만들거나 3D 렌더링 dependency를 미리 넣지 않는다.
 */
export const PlayerCharacterModel: unknown | undefined = undefined;

/**
 * 골드썬 포트레이트 아트가 준비되면 채운다 (assets/characters/goldsun/ 참고).
 * 없으면 TrainerProfile.portraitPlaceholder 이모지를 그대로 쓴다.
 */
export const GoldsunPortraitImage: ImageSourcePropType | undefined = undefined;
