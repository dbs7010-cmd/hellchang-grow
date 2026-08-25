import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import type { CharacterAssetSlot } from '@/config/character-assets';
import { useAppData } from '@/context/app-data-context';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface PlayerCharacterProps {
  appearance: CharacterAppearance;
  /** Semantic placement only. It must never select a different player identity. */
  slot: CharacterAssetSlot;
  height: number;
  fill?: boolean;
  /**
   * Optional presentation override. Result/reveal can provide BEFORE/PUMP/AFTER snapshots.
   * Ordinary surfaces omit it and automatically receive the current persistent body from AppData.
   */
  bodyParameters?: DanbaekBodyParameters | null;
  idle?: boolean;
}

const MaxBodyScale = 1.2;

/**
 * Single runtime boundary for the player character.
 *
 * HOME / HISTORY / SESSION and every ordinary surface resolve to the same current persistent
 * BodyParameters. A caller may override only when it intentionally renders another approved
 * presentation snapshot (for example BEFORE/PUMP/AFTER). This prevents a missing prop from silently
 * resetting one screen to Stage 0 while another screen shows the grown body.
 *
 * Onboarding still resolves safely: before a profile/growth history exists AppData exposes the neutral
 * default body, through this same Danbaek renderer. No PNG/photorealistic/legacy fallback exists.
 */
export function PlayerCharacter({
  appearance,
  slot: _slot,
  height,
  fill = false,
  bodyParameters: bodyOverride,
  idle = false,
}: PlayerCharacterProps) {
  const { bodyParameters: currentBodyParameters } = useAppData();
  if (height <= 0) return null;

  const resolvedBodyParameters = bodyOverride ?? currentBodyParameters;

  return (
    <View style={[fill ? styles.bodyFill : styles.body, { height }]}>
      <CharacterSilhouette
        genderExpression={appearance.genderExpression}
        size={appearance.size}
        tone={appearance.tone}
        bodyParameters={resolvedBodyParameters}
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
