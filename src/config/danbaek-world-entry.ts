import type { Href } from 'expo-router';

import { describeFirstPathEntry } from '@/features/danbaek-world/world-view-model';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';

export interface DanbaekWorldEntrySeam {
  available: boolean;
  route: Href | null;
}

/** WORLD runtime is now present on the integration branch. */
export const DanbaekWorldEntry: DanbaekWorldEntrySeam = {
  available: true,
  route: '/danbaek-world',
};

export interface DanbaekWorldEntrySurface {
  route: Href;
  label: string;
  subLabel: string;
}

export function resolveDanbaekWorldEntry(input: {
  profile: DanbaekLearningProfile;
  seam?: DanbaekWorldEntrySeam;
}): DanbaekWorldEntrySurface | null {
  const seam = input.seam ?? DanbaekWorldEntry;
  if (!seam.available || !seam.route) return null;

  return {
    route: seam.route,
    label: '단백세상',
    subLabel: describeFirstPathEntry(input.profile),
  };
}
