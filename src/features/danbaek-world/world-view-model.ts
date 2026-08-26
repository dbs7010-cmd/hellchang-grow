import type { DanbaekLearningProfile, StageBlock } from '@/types/danbaek-contract';
import { runDanbaekAdventure } from '@/features/danbaek-world/adventure-runner';
import { DanbaekWorldProofStages } from '@/features/danbaek-world/proof-stages';
import { presentDanbaekWorldBlock } from '@/features/danbaek-world/presentation';

export type DanbaekWorldSceneState =
  | {
      state: 'cleared';
      title: string;
      body: string;
      clearedStageIds: string[];
    }
  | {
      state: 'blocked';
      title: string;
      body: string;
      clearedStageIds: string[];
      actionLabel: string;
      block: StageBlock;
    };

/** APP supplies persisted learning. WORLD only evaluates and projects it. */
export function buildDanbaekWorldScene(profile: DanbaekLearningProfile): DanbaekWorldSceneState {
  const run = runDanbaekAdventure(DanbaekWorldProofStages, profile);
  if (run.outcome === 'cleared') {
    return {
      state: 'cleared',
      title: '문이 열렸어요!',
      body: '단백이가 실제 운동에서 본 미는 동작으로 문을 열었습니다. 다음 길에는 당기는 움직임이 필요해 보여요.',
      clearedStageIds: run.clearedStageIds,
    };
  }

  const block = run.block!;
  const presentation = presentDanbaekWorldBlock(block);
  return {
    state: 'blocked',
    title: presentation.title,
    body: presentation.body,
    clearedStageIds: run.clearedStageIds,
    actionLabel: presentation.actionLabel,
    block,
  };
}
