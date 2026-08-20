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
 * V1은 단일 아바타다 — 운동 기록으로 전신이 자동으로 커지는 성장 단계 필드는 없다.
 * 여기 있는 값은 전부 사용자가 온보딩/설정에서 고른 프로필에서만 온다.
 *
 * TODO(character-body-parts): 실제 3D 모델 단계에서 chest / back / shoulders / arms / legs
 * 부위별 파라미터를 검토한다. 그때 이 인터페이스에 필드를 더하면 화면은 손대지 않아도 된다.
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
export function characterAppearanceFromProfile(
  profile: UserProfile | null | undefined
): CharacterAppearance {
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
