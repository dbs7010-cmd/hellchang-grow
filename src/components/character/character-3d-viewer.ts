import type { DanbaekBodyParameters } from '@/types/body-state';
import { GenderExpression } from '@/types/user';

/**
 * CHARACTER VIEWER interaction contract.
 *
 * V1 keeps the existing horizontal drag interaction. Until a real 3D Danbaek model exists,
 * CharacterViewer renders the same canonical parametric Danbaek used by HOME/SESSION/HISTORY.
 * The viewer must therefore receive the current BodyParameters instead of silently showing Stage 0.
 */
export interface Character3DViewerProps {
  visible: boolean;
  onClose: () => void;
  genderExpression: GenderExpression;
  /** 0-100, legacy appearance input retained for future 3D compatibility. */
  size: number;
  /** 0-100, legacy appearance input retained for future 3D compatibility. */
  tone: number;
  /** Current LOCKED BodyState -> BodyParameters snapshot. */
  bodyParameters?: DanbaekBodyParameters | null;
}

export const CharacterFrontRotationDeg = 0;
export const CharacterRotationDegreesPerPixel = 0.6;

export function normalizeRotationDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
