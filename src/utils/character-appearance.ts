import { BodyPresetDefaultParameters, BodyPresetId, DefaultBodyPresetId } from '@/config/body-presets';
import { CharacterGrowthStage, DefaultCharacterGrowthStage } from '@/config/character-growth';
import { BodyParameters } from '@/types/body';
import { GenderExpression, UserProfile } from '@/types/user';

/**
 * 캐릭터를 그리는 데 필요한 표현 상태만 모은 view-model.
 *
 * 캐릭터 렌더러가 UserProfile이나 앱 상태를 여기저기서 직접 읽지 않게 하려고 둔다 —
 * 화면은 프로필을 이 값으로 한 번 변환해서 넘기고, 렌더러는 이 값만 안다.
 * 새 도메인을 만들지 않는다: 필드는 전부 기존 타입(GenderExpression / BodyPresetId /
 * BodyParameters)을 그대로 재사용한다.
 *
 * growthStage는 resolveCharacterGrowth()가 계산한 결과를 받아 넣는다 — 화면이 성장 규칙을
 * 다시 구현하지 않는다. 이 값은 게임 아바타 표현 전용이고 실제 신체 수치를 바꾸지 않는다.
 *
 * TODO(character-growth): Body Goal / Body Growth 추세가 외형에 더 반영되면 필드를 더하고
 * resolver만 고친다. 화면과 렌더러는 손대지 않아도 된다.
 */
export interface CharacterAppearance {
  genderExpression: GenderExpression;
  bodyPresetId: BodyPresetId;
  /** 0-100, 체형 전체 볼륨 */
  size: number;
  /** 0-100, 근육 톤/선명도 */
  tone: number;
  /**
   * 캐릭터 성장 단계 (stage1~stage5). HELL PASS Lv와는 별개의 개념이다 —
   * UI에서 "Lv.N = stageN"으로 묶어 보여주지 않는다.
   */
  growthStage: CharacterGrowthStage;
}

/** 프로필이 아직 없을 때(온보딩 시작 화면 등) 쓰는 중립 외형. */
export const DefaultCharacterAppearance: CharacterAppearance = {
  genderExpression: 'male',
  bodyPresetId: DefaultBodyPresetId,
  size: BodyPresetDefaultParameters[DefaultBodyPresetId].size,
  tone: BodyPresetDefaultParameters[DefaultBodyPresetId].tone,
  growthStage: DefaultCharacterGrowthStage,
};

/**
 * 저장된 프로필 + 성장 단계 → 캐릭터 외형. 프로필이 없으면 중립 외형을 쓴다.
 * 성장 단계는 바깥에서 resolveCharacterGrowth()로 한 번만 계산해 넘긴다 (app-data-context).
 */
export function characterAppearanceFromProfile(
  profile: UserProfile | null | undefined,
  growthStage: CharacterGrowthStage = DefaultCharacterGrowthStage
): CharacterAppearance {
  if (!profile) return { ...DefaultCharacterAppearance, growthStage };
  return {
    genderExpression: profile.genderExpression,
    bodyPresetId: profile.bodyPresetId as BodyPresetId,
    size: profile.bodyParameters.size,
    tone: profile.bodyParameters.tone,
    growthStage,
  };
}

/** 온보딩처럼 아직 저장 전인 임시 값에서 만드는 경우. */
export function characterAppearanceFromDraft(input: {
  genderExpression: GenderExpression;
  bodyPresetId: BodyPresetId;
  bodyParameters: BodyParameters;
}): CharacterAppearance {
  return {
    genderExpression: input.genderExpression,
    bodyPresetId: input.bodyPresetId,
    size: input.bodyParameters.size,
    tone: input.bodyParameters.tone,
    // 온보딩 중에는 아직 운동/PASS 기록이 없다 — 항상 기본 단계에서 시작한다.
    growthStage: DefaultCharacterGrowthStage,
  };
}
