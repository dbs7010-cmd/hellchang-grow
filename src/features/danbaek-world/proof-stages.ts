import type { DanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

/**
 * Vertical-slice content only. These stages prove the contract behavior before
 * any large world/content system is built.
 */
export const DanbaekWorldProofStages: DanbaekWorldStage[] = [
  {
    id: 'proof-arrival',
  },
  {
    id: 'proof-horizontal-push-gate',
    requirement: {
      movementFamily: 'push_horizontal',
      minimumLearningStage: 'learned',
      reason: '단백이가 밀기 동작을 배워야 길을 열 수 있다.',
    },
  },
  {
    id: 'proof-bench-gate',
    requirement: {
      movementFamily: 'push_horizontal',
      minimumLearningStage: 'learned',
      specificExerciseId: 'bench-press',
      reason: '이 장애물은 벤치프레스에서 본 동작이 필요하다.',
    },
  },
];

export function getDanbaekWorldProofStage(stageId: string) {
  return DanbaekWorldProofStages.find((stage) => stage.id === stageId);
}
