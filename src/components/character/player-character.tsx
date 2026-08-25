import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette, type DanbaekExpression } from '@/components/character/character-silhouette';
import type { CharacterAssetSlot } from '@/config/character-assets';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface PlayerCharacterProps {
  appearance: CharacterAppearance;
  slot: CharacterAssetSlot;
  height: number;
  fill?: boolean;
  bodyParameters?: DanbaekBodyParameters | null;
  idle?: boolean;
  /** Presentation-only face state from the approved Danbaek expression language. */
  expression?: DanbaekExpression;
}

const MaxBodyScale = 1.2;

/**
 * Single identity boundary for the player character.
 *
 * IMPORTANT: every app surface renders the shared Danbaek CANON.  Registered legacy
 * raster/model assets must never become a visual fallback here: that previously made
 * onboarding/history show the old photoreal bodybuilder while HOME showed the SVG body.
 * `slot` remains in the public shape for call-site compatibility, but does not select a
 * different identity. BodyParameters only change the approved growth regions.
 */
export function PlayerCharacter({ appearance, height, fill = false, bodyParameters, idle = false, expression = 'happy' }: PlayerCharacterProps) {
  if (height <= 0) return null;
  const scale = Math.min(MaxBodyScale, height / CharacterIntrinsicHeight);

  return (
    <View style={[fill ? styles.bodyFill : styles.placeholder, { height }]}>
      <CharacterSilhouette
        genderExpression={appearance.genderExpression}
        size={appearance.size}
        tone={appearance.tone}
        bodyParameters={bodyParameters}
        idle={idle}
        expression={expression}
        scale={scale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bodyFill: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: '100%', alignItems: 'center', justifyContent: 'center' },
});
