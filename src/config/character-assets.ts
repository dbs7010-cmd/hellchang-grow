import { ImageSourcePropType } from 'react-native';

/**
 * 캐릭터 360도 뷰어가 지원하는 방향 슬롯. 실제 3D가 아니라 방향별 정지 이미지 슬롯이다.
 */
export type CharacterAngle = 'front' | 'front-side' | 'side' | 'back-side' | 'back';

export const CharacterAngles: CharacterAngle[] = ['front', 'front-side', 'side', 'back-side', 'back'];

export const CharacterAngleLabels: Record<CharacterAngle, string> = {
  front: '정면',
  'front-side': '정측면',
  side: '측면',
  'back-side': '후측면',
  back: '후면',
};

/**
 * 최종 플레이어 캐릭터 아트가 준비되면 이 자리에 방향별 이미지 경로를 채운다
 * (assets/characters/player/ 참고). 값이 없는 방향은 CharacterSilhouette가
 * 도형 기반 placeholder로 자동 대체한다 — 코드를 고치지 않고 에셋만 넣으면 교체된다.
 */
export const PlayerCharacterImages: Partial<Record<CharacterAngle, ImageSourcePropType>> = {};

/**
 * 골드썬 포트레이트 아트가 준비되면 채운다 (assets/characters/goldsun/ 참고).
 * 없으면 TrainerProfile.portraitPlaceholder 이모지를 그대로 쓴다.
 */
export const GoldsunPortraitImage: ImageSourcePropType | undefined = undefined;
