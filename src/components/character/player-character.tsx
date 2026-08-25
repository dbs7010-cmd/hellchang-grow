import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import type { CharacterAssetSlot } from '@/config/character-assets';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface PlayerCharacterProps {
  appearance: CharacterAppearance;
  /** Presentation context only. It must never select a different player identity. */
  slot: CharacterAssetSlot;
  /** Character stage height in px. */
  height: number;
  /** Fill the parent stage while preserving the renderer's intrinsic proportions. */
  fill?: boolean;
  /** LOCKED BodyState -> BodyParameters presentation input. */
  bodyParameters?: DanbaekBodyParameters | null;
  /** Subtle breathing idle. */
  idle?: boolean;
}

/**
 * Single runtime player presentation boundary.
 *
 * Every HOME / HISTORY / RESULT / SESSION surface renders Danbaek. There is no image registry,
 * photographic player fallback, or neutral second identity on this path. When bodyParameters are
 * available the LOCKED growth state is rendered; otherwise the same Danbaek Stage-0 geometry is
 * rendered. This changes presentation/routing only and does not mutate workout or growth engines.
 */
const MaxBodyScale = 1.2;

export function PlayerCharacter({
  appearance,
  slot: _slot,
  height,
  fill = false,
  bodyParameters,
  idle = false,
}: PlayerCharacterProps) {
  if (height <= 0) return null;

  const scale = Math.min(MaxBodyScale, height / CharacterIntrinsicHeight);

  return (
    <View style={[fill ? styles.bodyFill : styles.body, { height }]}>
      <CharacterSilhouette
        genderExpression={appearance.genderExpression}
        size={appearance.size}
        tone={appearance.tone}
        bodyParameters={bodyParameters}
        idle={idle}
        scale={scale}
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
