import type { ImageSourcePropType } from 'react-native';

import manifestJson from '../../assets/characters/danbaek/game/manifest.json' with { type: 'json' };
import type { WorkoutCharacterState } from '@/utils/workout-character-motion';

export const DanbaekGameAssetSlots = [
  'idle', 'happy', 'ready', 'working', 'set_complete', 'resting', 'paused', 'complete',
  'before', 'pump', 'after', 'celebration',
] as const;

export type DanbaekGameAssetSlot = (typeof DanbaekGameAssetSlots)[number];
export type DanbaekGameAssetId = `danbaek.game.${DanbaekGameAssetSlot}.v1`;
export type DanbaekGameAssetFallback = 'canon_parametric_v3';

export interface DanbaekGameAssetManifestEntry {
  id: DanbaekGameAssetId;
  slot: DanbaekGameAssetSlot;
  filename: string;
  dimensions: { width: number; height: number };
  anchor: { x: number; y: number };
  pivot: { x: number; y: number };
  boundingBox: { x: number; y: number; width: number; height: number };
  approval: 'pending' | 'approved' | 'rejected';
  fallback: DanbaekGameAssetFallback;
}

export interface ResolvedDanbaekGameAsset {
  descriptor: DanbaekGameAssetManifestEntry;
  source: ImageSourcePropType;
}

export const DanbaekGameAssetManifest = manifestJson as Omit<typeof manifestJson, 'assets'> & {
  assets: DanbaekGameAssetManifestEntry[];
};

/**
 * Metro requires static require() calls. Add one only after the exact PNG exists and review has
 * marked the matching manifest entry approved. An empty registry is a valid production state.
 */
const ApprovedDanbaekGameAssetSources: Record<DanbaekGameAssetId, ImageSourcePropType> = {
  'danbaek.game.idle.v1': require('@/assets/characters/danbaek/game/danbaek-game-idle-v1.png'),
  'danbaek.game.happy.v1': require('@/assets/characters/danbaek/game/danbaek-game-happy-v1.png'),
  'danbaek.game.ready.v1': require('@/assets/characters/danbaek/game/danbaek-game-ready-v1.png'),
  'danbaek.game.working.v1': require('@/assets/characters/danbaek/game/danbaek-game-working-v1.png'),
  'danbaek.game.set_complete.v1': require('@/assets/characters/danbaek/game/danbaek-game-set-complete-v1.png'),
  'danbaek.game.resting.v1': require('@/assets/characters/danbaek/game/danbaek-game-resting-v1.png'),
  'danbaek.game.paused.v1': require('@/assets/characters/danbaek/game/danbaek-game-paused-v1.png'),
  'danbaek.game.complete.v1': require('@/assets/characters/danbaek/game/danbaek-game-complete-v1.png'),
  'danbaek.game.before.v1': require('@/assets/characters/danbaek/game/danbaek-game-before-v1.png'),
  'danbaek.game.pump.v1': require('@/assets/characters/danbaek/game/danbaek-game-pump-v1.png'),
  'danbaek.game.after.v1': require('@/assets/characters/danbaek/game/danbaek-game-after-v1.png'),
  'danbaek.game.celebration.v1': require('@/assets/characters/danbaek/game/danbaek-game-celebration-v1.png'),
};

const manifestBySlot = new Map(
  DanbaekGameAssetManifest.assets.map((entry) => [entry.slot, entry] as const)
);

export function resolveDanbaekGameAsset(
  slot: DanbaekGameAssetSlot,
  options: { hasBodyParameters: boolean; allowBodyParametersAsset?: boolean }
): ResolvedDanbaekGameAsset | undefined {
  const descriptor = manifestBySlot.get(slot);
  if (!descriptor || descriptor.approval !== 'approved') return undefined;

  // A single full-body PNG cannot represent independent BodyParameters. Preserve the LOCKED
  // growth renderer until a reviewed asset contract explicitly supports that parameter state.
  if (options.hasBodyParameters && !options.allowBodyParametersAsset) return undefined;

  const source = ApprovedDanbaekGameAssetSources[descriptor.id];
  return source ? { descriptor, source } : undefined;
}

export const SessionGameAssetSlots: Record<WorkoutCharacterState, DanbaekGameAssetSlot> = {
  idle: 'idle',
  ready: 'ready',
  working: 'working',
  set_complete: 'set_complete',
  resting: 'resting',
  fatigued: 'working',
  paused: 'paused',
  complete: 'complete',
};

export const HomeGameAssetSlots = ['idle', 'happy'] as const satisfies readonly DanbaekGameAssetSlot[];
export const ResultGameAssetSlots = ['before', 'pump', 'after', 'celebration'] as const satisfies readonly DanbaekGameAssetSlot[];
