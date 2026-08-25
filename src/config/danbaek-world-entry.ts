import type { Href } from 'expo-router';

import type { DanbaekLearningProfile } from '@/types/danbaek-contract';

export interface DanbaekWorldEntrySeam {
  available: boolean;
  route: Href | null;
}

/** Integration owns the verified WORLD route; APP only consumes this seam. */
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
  const learned = input.profile.capabilities.filter((capability) =>
    capability.learningStage === 'learned' || capability.learningStage === 'familiar' || capability.learningStage === 'proficient'
  ).length;
  return {
    route: seam.route,
    label: '단백세상',
    subLabel: learned > 0 ? `단백이가 배운 동작 ${learned}가지` : '아직 배운 동작이 없어요',
  };
}
