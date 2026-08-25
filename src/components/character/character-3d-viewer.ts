import type { DanbaekBodyParameters } from '@/types/body-state';
import { GenderExpression } from '@/types/user';

/**
 * CHARACTER VIEWER interaction contract.
 * V1 has no separate 3D player identity. Until an approved 3D Danbaek exists, the viewer must
 * render the same parametric Danbaek and the same current BodyParameters as the rest of the app.
 */
export interface Character3DViewerProps {
  visible: boolean;
  onClose: () => void;
  genderExpression: GenderExpression;
  size: number;
  tone: number;
  /** Current LOCKED BodyState -> BodyParameters snapshot. */
  bodyParameters?: DanbaekBodyParameters | null;
}

export const CharacterFrontRotationDeg = 0;
export const CharacterRotationDegreesPerPixel = 0.6;

export function normalizeRotationDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
