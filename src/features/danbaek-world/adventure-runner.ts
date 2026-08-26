import type { DanbaekLearningProfile, StageBlock, StageEvaluation } from '@/types/danbaek-contract';
import type { DanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';
import { evaluateDanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

export type DanbaekAdventureRun = {
  visitedStageIds: string[];
  clearedStageIds: string[];
  currentStageId: string | null;
  outcome: 'cleared' | 'blocked';
  block: StageBlock | null;
};

/** Pure WORLD evaluation. No storage, workout, growth, reward, or learning mutation. */
export function runDanbaekAdventure(
  stages: readonly DanbaekWorldStage[],
  profile: DanbaekLearningProfile
): DanbaekAdventureRun {
  const visitedStageIds: string[] = [];
  const clearedStageIds: string[] = [];

  for (const stage of stages) {
    visitedStageIds.push(stage.id);
    const evaluation: StageEvaluation = evaluateDanbaekWorldStage(stage, profile);
    if (evaluation.outcome === 'block') {
      return {
        visitedStageIds,
        clearedStageIds,
        currentStageId: stage.id,
        outcome: 'blocked',
        block: evaluation,
      };
    }
    clearedStageIds.push(stage.id);
  }

  return { visitedStageIds, clearedStageIds, currentStageId: null, outcome: 'cleared', block: null };
}
