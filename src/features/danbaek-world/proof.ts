import type { DanbaekLearningProfile, StageEvaluation } from '@/types/danbaek-contract';
import { getDanbaekWorldProofStage } from '@/features/danbaek-world/proof-stages';
import { evaluateDanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

export type DanbaekWorldProofResult = StageEvaluation | {
  outcome: 'invalid_stage';
  stageId: string;
};

/**
 * Contract-only entry point for the first Danbaek World vertical slice.
 * It intentionally has no dependency on workout repositories, GrowthEngine,
 * UI, navigation, or storage. APP owns profile generation; WORLD consumes it.
 */
export function evaluateDanbaekWorldProof(
  stageId: string,
  profile: DanbaekLearningProfile
): DanbaekWorldProofResult {
  const stage = getDanbaekWorldProofStage(stageId);
  if (!stage) return { outcome: 'invalid_stage', stageId };
  return evaluateDanbaekWorldStage(stage, profile);
}
