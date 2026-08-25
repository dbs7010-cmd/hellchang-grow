import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette, type DanbaekExpression } from '@/components/character/character-silhouette';
import { CharacterAssetSlot, resolveCharacterAsset } from '@/config/character-assets';
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

export function PlayerCharacter({ appearance, slot, height, fill = false, bodyParameters, idle = false, expression = 'happy' }: PlayerCharacterProps) {
  const asset = resolveCharacterAsset(slot);

  // Growth-aware screens always use the shared layered CANON renderer. This keeps HOME,
  // SESSION, RESULT and HISTORY on one identity while BodyParameters remain the only body input.
  if (bodyParameters) {
    if (height <= 0) return null;
    return (
      <View style={[fill ? styles.bodyFill : styles.placeholder, { height }]}>
        <CharacterSilhouette
          genderExpression={appearance.genderExpression}
          size={appearance.size}
          tone={appearance.tone}
          bodyParameters={bodyParameters}
          idle={idle}
          expression={expression}
          scale={Math.min(MaxBodyScale, height / CharacterIntrinsicHeight)}
        />
      </View>
    );
  }

  // Static registered art remains the fallback for screens without BodyParameters.
  if (asset) {
    if (fill) return <Image source={asset} style={styles.imageFill} contentFit="contain" />;
    if (height <= 0) return null;
    return <Image source={asset} style={[styles.image, { height }]} contentFit="contain" />;
  }

  if (height <= 0) return null;
  return (
    <View style={[styles.placeholder, { height }]}>
      <CharacterSilhouette
        genderExpression={appearance.genderExpression}
        size={appearance.size}
        tone={appearance.tone}
        idle={idle}
        expression={expression}
        scale={Math.min(1, height / CharacterIntrinsicHeight)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%' },
  bodyFill: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  imageFill: { flex: 1, width: '100%' },
  placeholder: { width: '100%', alignItems: 'center', justifyContent: 'center' },
});
