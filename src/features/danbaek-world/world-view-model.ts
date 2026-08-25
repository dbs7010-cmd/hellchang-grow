import type { DanbaekLearningProfile, MovementFamily, StageBlock } from '@/types/danbaek-contract';
import { runDanbaekAdventure } from '@/features/danbaek-world/adventure-runner';
import { DanbaekWorldProofStages } from '@/features/danbaek-world/proof-stages';
import { presentDanbaekWorldBlock } from '@/features/danbaek-world/presentation';

export type DanbaekWorldSceneState =
  | { state: 'cleared'; title: string; body: string; clearedStageIds: string[] }
  | { state: 'blocked'; title: string; body: string; stageId: string; clearedStageIds: string[]; actionLabel: string; recommendedMovementFamily: MovementFamily; specificExerciseId: string | null; block: StageBlock };

export function buildDanbaekWorldScene(profile: DanbaekLearningProfile): DanbaekWorldSceneState {
  const run = runDanbaekAdventure(DanbaekWorldProofStages, profile);
  if (run.outcome === 'cleared') return { state: 'cleared', title: '단백이가 길을 열었어요', body: '배운 동작으로 이번 길을 끝까지 지나갔습니다.', clearedStageIds: run.clearedStageIds };
  const block = run.block!;
  const presentation = presentDanbaekWorldBlock(block);
  return { state: 'blocked', title: presentation.title, body: presentation.body, stageId: run.currentStageId!, clearedStageIds: run.clearedStageIds, actionLabel: presentation.actionLabel, recommendedMovementFamily: presentation.recommendedMovementFamily, specificExerciseId: presentation.specificExerciseId, block };
}
