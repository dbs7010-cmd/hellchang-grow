import { ImageSourcePropType } from 'react-native';

/**
 * Runtime character assets are restricted to non-player support assets.
 *
 * The player identity is always rendered by the LOCKED Danbaek parametric renderer.
 * Full-body PNGs under assets/characters/player or CANON reference PNGs must never be
 * selected as a runtime fallback: doing so bypasses BodyParameters and makes different
 * screens show different characters.
 */
export type CharacterAssetSlot = 'home' | 'history' | 'result' | 'session';

/**
 * Kept as a compatibility API for callers while the presentation layer is consolidated.
 * A player slot intentionally never resolves to an image.
 */
export function resolveCharacterAsset(_slot: CharacterAssetSlot): ImageSourcePropType | undefined {
  return undefined;
}

/** CHARACTER 360 has no separate player model in V1. */
export function hasPlayerCharacterModel(): boolean {
  return false;
}

/** Stanley is a trainer/support character and is not part of the player routing policy. */
export const StanleyPortraitImage: ImageSourcePropType | undefined = require('@/assets/characters/trainer/stanley_portrait.png');
