/**
 * Development-only runtime identity probe.
 *
 * This file deliberately carries the source commit that introduced it so a
 * device screenshot/log can prove which source generation is actually
 * running. Keep it presentation-only: no workout/growth state depends on it.
 */
export const RuntimeBuildIdentity = {
  marker: 'DANBAEK-RUNTIME-PROBE-20260826-A',
  sourceBranch: 'main',
  sourceBaseCommit: '00646bd7e2ed206b632fc99d72b9328825882d62',
} as const;

export const RuntimeBuildIdentityLabel =
  `${RuntimeBuildIdentity.marker} | ${RuntimeBuildIdentity.sourceBranch} | base:${RuntimeBuildIdentity.sourceBaseCommit.slice(0, 8)}`;
