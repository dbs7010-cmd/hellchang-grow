import { ImageSourcePropType } from 'react-native';

/** 2D character call-site slots. They all resolve to the shared Danbaek renderer now. */
export type CharacterAssetSlot = 'home' | 'history' | 'result' | 'session';

export interface PlayerCharacterAssetRegistry {
  home?: ImageSourcePropType;
  history?: ImageSourcePropType;
  result?: ImageSourcePropType;
  session?: ImageSourcePropType;
  model3d?: unknown;
}

/**
 * CANON SAFETY BOUNDARY.
 *
 * The old `player_main.png` photoreal bodybuilder is deliberately NOT registered.
 * Danbaek is rendered by PlayerCharacter -> CharacterSilhouette on every surface.
 * Keeping this registry empty prevents onboarding/history/result from silently falling
 * back to a legacy identity when BodyParameters are not available.
 */
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {};

/** Kept only for compatibility with non-rendering capability checks. */
export function resolveCharacterAsset(slot: CharacterAssetSlot): ImageSourcePropType | undefined {
  return PlayerCharacterAssets[slot] ?? PlayerCharacterAssets.home;
}

/** 3D viewer is exposed only when a real Danbaek model is explicitly registered. */
export function hasPlayerCharacterModel(): boolean {
  return PlayerCharacterAssets.model3d !== undefined;
}

/** Stanley is a separate trainer identity and intentionally remains photographic. */
export const StanleyPortraitImage: ImageSourcePropType | undefined = require('@/assets/characters/trainer/stanley_portrait.png');
