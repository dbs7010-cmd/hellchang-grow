import { ImageSourcePropType } from 'react-native';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHARACTER ASSET REGISTRY
 *
 * "어디서 어떤 캐릭터 에셋을 쓰는가"를 한 곳에서만 정한다. 화면 코드는 파일 경로를 모르고,
 * 슬롯 이름(home/history/result)과 3D 모델 자리만 안다.
 *
 * V1은 **단일 플레이어 아바타**다. 운동 기록으로 전신이 자동으로 커지는 성장 단계
 * (stage1~stage5)는 쓰지 않는다 — 특정 부위만 운동했는데 전신이 같이 커지는 표현은
 * 실제 운동과 맞지 않는다. 성취감은 HELL PASS / 운동 기록 / streak / 완료 이펙트로 낸다.
 *
 * TODO(character-body-parts): 실제 3D 모델 단계에 가면 chest / back / shoulders / arms /
 * legs를 각각 움직이는 부위별 body parameter 확장을 검토한다. V1에서는 구현하지 않는다.
 *
 * 규격은 docs/ASSETS.md에 정리돼 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 2D 캐릭터가 쓰이는 자리. 슬롯이 늘어도 화면 코드는 이 유니온만 본다. */
export type CharacterAssetSlot = 'home' | 'history' | 'result';

export interface PlayerCharacterAssetRegistry {
  /** 메인 전신 2D. 나머지 슬롯의 기본값이기도 하다. */
  home?: ImageSourcePropType;
  /** 히스토리 [몸 변화] 미니 프리뷰. 비우면 home을 쓴다. */
  history?: ImageSourcePropType;
  /**
   * 운동 완료 화면. 비우면 home을 쓴다.
   * TODO(character-pose): 승리/회복 포즈 variation이 생기면 여기만 채우면 된다 —
   * RESULT 화면 레이아웃은 그대로 둔다. V1은 기본 캐릭터 하나로 충분하다.
   */
  result?: ImageSourcePropType;
  /**
   * CHARACTER 360용 3D 모델(.glb / .gltf). 단계 구분 없이 하나다.
   *
   * 타입을 unknown으로 둔 이유: 지금은 3D 렌더링 dependency가 없어서 모델 소스 타입을
   * 확정할 수 없다. 렌더러를 도입할 때 그 라이브러리의 소스 타입으로 좁힌다.
   */
  model3d?: unknown;
}

/**
 * 실제 에셋이 들어오면 여기만 채운다 (assets/characters/player/ 참고).
 * 비어 있으면 각 화면이 중립 placeholder(도형 실루엣)를 그린다 — 코드 수정 불필요.
 *
 * 존재하지 않는 파일을 require하면 번들이 깨지므로, 파일을 실제로 넣은 뒤에만 연결한다.
 */
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {};

/**
 * 화면 슬롯에 맞는 2D 에셋을 고른다. 전용 에셋이 없으면 메인(home) 캐릭터로 떨어지고,
 * 그것도 없으면 undefined — 호출부가 중립 placeholder를 그린다.
 * 화면마다 다른 캐릭터처럼 보이지 않게 항상 같은 identity로 떨어진다.
 */
export function resolveCharacterAsset(slot: CharacterAssetSlot): ImageSourcePropType | undefined {
  return PlayerCharacterAssets[slot] ?? PlayerCharacterAssets.home;
}

/** 3D 모델이 준비됐는지. CHARACTER 360만 이 값을 본다. */
export function hasPlayerCharacterModel(): boolean {
  return PlayerCharacterAssets.model3d !== undefined;
}

/**
 * 스탠리 포트레이트. 트레이너 화면의 3:4 슬롯과 대화 말풍선 옆 원형 아바타에 쓴다.
 * 홈에서는 스탠리 전신을 쓰지 않는다 — 얼굴/상반신 포트레이트만 노출한다.
 * 없으면 TrainerProfile.portraitPlaceholder(중립 이모지)를 그대로 쓴다.
 */
export const StanleyPortraitImage: ImageSourcePropType | undefined = undefined;
