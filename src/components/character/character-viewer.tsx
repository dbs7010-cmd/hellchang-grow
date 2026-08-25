import { Modal } from 'react-native';

import type { Character3DViewerProps } from '@/components/character/character-3d-viewer';

export type CharacterViewerProps = Character3DViewerProps;

/**
 * Transitional compatibility shell.
 * 360 viewing is removed from the product direction, but HOME still contains legacy references.
 * Keep this inert component only until those references are removed atomically; it must not expose UI.
 */
export function CharacterViewer(_props: CharacterViewerProps) {
  return <Modal visible={false} transparent />;
}
