import type { Href } from 'expo-router';

import { learnedFamilyCount } from '@/utils/danbaek-learning-presence';
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

  const learned = learnedFamilyCount(input.profile);
  return {
    route: seam.route,
    label: '단백세상',
    subLabel: learned > 0 ? `단백이가 배운 동작 ${learned}가지` : '첫 번째 길이 기다리고 있어요',
  };
}
