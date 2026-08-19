import { ImageSourcePropType } from 'react-native';

import { CharacterGrowthStage } from '@/config/character-growth';
import { GenderExpression } from '@/types/user';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHARACTER ASSET REGISTRY
 *
 * "어디서 어떤 캐릭터 에셋을 쓰는가"를 한 곳에서만 정한다. 화면 코드는 파일 경로를 모르고,
 * 슬롯 이름(home/history/result)과 3D 모델 자리만 안다.
 *
 * 렌더링 계층은 둘로 나뉜다:
 *  - 2D (home / history / result): 가벼운 전신 이미지 하나. 같은 캐릭터 identity를 공유한다.
 *  - 3D (model3d): CHARACTER 360 전용. 진입할 때만 로딩한다 (홈에서 3D를 불러오지 않는다).
 *
 * 규격은 docs/ASSETS.md에 정리돼 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 2D 캐릭터가 쓰이는 자리. 슬롯이 늘어도 화면 코드는 이 유니온만 본다. */
export type CharacterAssetSlot = 'home' | 'history' | 'result';

/** 성별 × 성장 단계별 2D 에셋. 채운 조합만 쓰이고, 나머지는 아래 단일 슬롯으로 떨어진다. */
export type CharacterGrowthImageMap = Partial<
  Record<GenderExpression, Partial<Record<CharacterGrowthStage, ImageSourcePropType>>>
>;

/** 성별 × 성장 단계별 3D 모델(.glb). 2D와 같은 성장 단계로 고른다. */
export type CharacterGrowthModelMap = Partial<
  Record<GenderExpression, Partial<Record<CharacterGrowthStage, unknown>>>
>;

export interface PlayerCharacterAssetRegistry {
  /**
   * 성장 단계별 메인 2D. 파일명 규칙: char_{gender}_{stage}.png
   * 예) growth: { male: { stage1: require('.../char_male_stage1.png') } }
   *
   * 단계별 에셋이 최우선이고, 해당 조합이 비어 있으면 아래 단일 슬롯(home/history/result)을
   * 쓴다. "가까운 다른 단계"로 대체하지 않는다 — 사용자가 엉뚱한 단계를 보게 되기 때문이다.
   */
  growth?: CharacterGrowthImageMap;
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
   * 성장 단계별 3D 모델. 파일명 규칙: char_{gender}_{stage}.glb
   * 2D와 같은 성장 단계(resolveCharacterGrowth 결과)로 고른다.
   */
  growthModels3d?: CharacterGrowthModelMap;
  /**
   * 단계 구분이 없는 단일 3D 모델. growthModels3d에 해당 조합이 없을 때 쓴다.
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
 * 같은 이미지를 여러 슬롯에서 써도 파일을 복제하지 않는다. home 하나만 채우면
 * history/result가 자동으로 그걸 쓴다 (resolveCharacterAsset 참고).
 */
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {};

/**
 * 화면 슬롯 + 성별 + 성장 단계에 맞는 2D 에셋을 고른다.
 *
 * 우선순위:
 *   1. growth[gender][stage]      — 성장 단계 전용 에셋
 *   2. PlayerCharacterAssets[slot] — 단계 구분 없는 화면별 에셋
 *   3. PlayerCharacterAssets.home  — 메인 캐릭터
 *   4. undefined                   — 호출부가 중립 placeholder를 그린다
 *
 * 화면마다 다른 캐릭터처럼 보이지 않게 항상 같은 identity로 떨어진다.
 */
export function resolveCharacterAsset(
  slot: CharacterAssetSlot,
  genderExpression?: GenderExpression,
  stage?: CharacterGrowthStage
): ImageSourcePropType | undefined {
  const staged =
    genderExpression && stage ? PlayerCharacterAssets.growth?.[genderExpression]?.[stage] : undefined;
  return staged ?? PlayerCharacterAssets[slot] ?? PlayerCharacterAssets.home;
}

/**
 * CHARACTER 360이 쓸 3D 모델을 고른다. 단계별 모델이 없으면 단일 모델로 떨어진다.
 * 여기서 모델을 로딩하지 않는다 — 존재 여부만 돌려준다.
 */
export function resolveCharacterModel(
  genderExpression?: GenderExpression,
  stage?: CharacterGrowthStage
): unknown | undefined {
  const staged =
    genderExpression && stage
      ? PlayerCharacterAssets.growthModels3d?.[genderExpression]?.[stage]
      : undefined;
  return staged ?? PlayerCharacterAssets.model3d;
}

/** 3D 모델이 준비됐는지. CHARACTER 360만 이 값을 본다. */
export function hasPlayerCharacterModel(
  genderExpression?: GenderExpression,
  stage?: CharacterGrowthStage
): boolean {
  return resolveCharacterModel(genderExpression, stage) !== undefined;
}

/**
 * 스탠리 포트레이트. 트레이너 화면의 3:4 슬롯과 대화 말풍선 옆 원형 아바타에 쓴다.
 * 없으면 TrainerProfile.portraitPlaceholder(중립 이모지)를 그대로 쓴다.
 */
export const StanleyPortraitImage: ImageSourcePropType | undefined = undefined;
