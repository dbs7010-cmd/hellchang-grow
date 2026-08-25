import { ImageSourcePropType } from 'react-native';

/**
 * CHARACTER ASSET REGISTRY
 *
 * Runtime player identity is Danbaek only. The legacy photographic player_main.png is intentionally
 * not registered here: screens without body parameters must fall back to the shared Danbaek renderer,
 * never to a second player identity.
 */
export type CharacterAssetSlot = 'home' | 'history' | 'result' | 'session';

export interface PlayerCharacterAssetRegistry {
  home?: ImageSourcePropType;
  history?: ImageSourcePropType;
  result?: ImageSourcePropType;
  session?: ImageSourcePropType;
  model3d?: unknown;
}

/**
 * Keep this empty until an asset is explicitly approved as a Danbaek runtime asset.
 * Canonical reference PNGs under assets/characters/danbaek/canon/reference_v3 are review references;
 * they do not replace the parametric BodyParameters renderer.
 */
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {};

export function resolveCharacterAsset(slot: CharacterAssetSlot): ImageSourcePropType | undefined {
  return PlayerCharacterAssets[slot] ?? PlayerCharacterAssets.home;
}

export function hasPlayerCharacterModel(): boolean {
  return PlayerCharacterAssets.model3d !== undefined;
}

/** Stanley is a trainer, not the player identity, so his approved portrait remains registered. */
export const StanleyPortraitImage: ImageSourcePropType | undefined = require('@/assets/characters/trainer/stanley_portrait.png');
