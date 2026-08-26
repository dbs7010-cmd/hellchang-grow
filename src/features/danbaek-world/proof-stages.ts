import type { DanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

/** First playable only: one real workout must be enough to cause an immediate World change. */
export const DanbaekWorldProofStages: DanbaekWorldStage[] = [
  { id: 'arrival' },
  {
    id: 'push-door',
    requirement: {
      movementFamily: 'push_horizontal',
      minimumLearningStage: 'observing',
      specificExerciseId: 'bench-press',
      reason: '단백이가 막힌 문을 밀어 열려면 벤치프레스에서 미는 동작을 한 번 봐야 한다.',
    },
  },
];
