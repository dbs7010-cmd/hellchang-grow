import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import type { CharacterAssetSlot } from '@/config/character-assets';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface PlayerCharacterProps {
  appearance: CharacterAppearance;
  /** Semantic placement only. It must never select a different player identity. */
  slot: CharacterAssetSlot;
  height: number;
  fill?: boolean;
  /** Current persistent body. Missing data means neutral Stage 0, never an image fallback. */
  bodyParameters?: DanbaekBodyParameters | null;
  idle?: boolean;
}

const MaxBodyScale = 1.2;

/**
 * Single runtime boundary for the player character.
 *
 * Every surface renders the same LOCKED Danbaek identity. bodyParameters may change the
 * approved body regions; absence of bodyParameters renders neutral Stage 0 through the
 * same renderer. No PNG/photorealistic/legacy player fallback is permitted here.
 */
export function PlayerCharacter({
  appearance,
  slot: _slot,
  height,
  fill = false,
  bodyParameters,
  idle = false,
}: PlayerCharacterProps) {
  if (height <= 0) return null;

  return (
    <View style={[fill ? styles.bodyFill : styles.body, { height }]}>
      <CharacterSilhouette
        genderExpression={appearance.genderExpression}
        size={appearance.size}
        tone={appearance.tone}
        bodyParameters={bodyParameters ?? undefined}
        idle={idle}
        scale={Math.min(MaxBodyScale, height / CharacterIntrinsicHeight)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyFill: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
