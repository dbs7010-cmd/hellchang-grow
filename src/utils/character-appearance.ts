import { BodyPresetDefaultParameters, BodyPresetId, DefaultBodyPresetId } from '@/config/body-presets';
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
 * TODO(character-growth): 앞으로 Body Goal / Body Growth / 체지방·근육 변화가 외형에
 * 반영되면, 그 계산 결과를 이 인터페이스에 필드로 더하고 resolver만 고친다.
 * 화면과 렌더러는 손대지 않아도 된다. 지금은 성장 계산을 하지 않으므로 필드도 없다.
 */
export interface CharacterAppearance {
  genderExpression: GenderExpression;
  bodyPresetId: BodyPresetId;
  /** 0-100, 체형 전체 볼륨 */
  size: number;
  /** 0-100, 근육 톤/선명도 */
  tone: number;
}

/** 프로필이 아직 없을 때(온보딩 시작 화면 등) 쓰는 중립 외형. */
export const DefaultCharacterAppearance: CharacterAppearance = {
  genderExpression: 'male',
  bodyPresetId: DefaultBodyPresetId,
  size: BodyPresetDefaultParameters[DefaultBodyPresetId].size,
  tone: BodyPresetDefaultParameters[DefaultBodyPresetId].tone,
};

/** 저장된 프로필 → 캐릭터 외형. 프로필이 없으면 중립 외형을 쓴다. */
export function characterAppearanceFromProfile(profile: UserProfile | null | undefined): CharacterAppearance {
  if (!profile) return DefaultCharacterAppearance;
  return {
    genderExpression: profile.genderExpression,
    bodyPresetId: profile.bodyPresetId as BodyPresetId,
    size: profile.bodyParameters.size,
    tone: profile.bodyParameters.tone,
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
  };
}
