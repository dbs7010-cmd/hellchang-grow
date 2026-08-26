import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { DanbaekBlockVoiceLines, MovementFamilyShortLabels } from '@/config/danbaek-voice-lines';
import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';
import { withObjectParticle, withTopicParticle } from '@/utils/korean';

export type DanbaekWorldBlockPresentation = {
  /** 왜 못 지나가는지 한 줄. 스테이지가 직접 쓴 문장을 그대로 쓴다. */
  whyLine: string;
  /** 단백이 자신의 한마디 (PRIMARY). */
  danbaekLine: string;
  /** 정확한 상태 한 줄 (SECONDARY). 단계보다 앞서 말하지 않는다. */
  statusLine: string;
  /** 지금 누를 행동. "운동 메뉴"가 아니라 이 상황을 푸는 행동으로 읽혀야 한다. */
  actionLabel: string;
  recommendedMovementFamily: MovementFamily;
  specificExerciseId: string | null;
};

/**
 * WORLD 판정(StageBlock)을 사람이 읽는 말로 옮긴다.
 *
 * 계열 이름은 `config/danbaek-movement-labels.ts` 하나에서만 온다 — 예전에는 이 파일이 같은
 * 계열을 "앞으로 미는 운동"으로, 앱의 나머지는 "미는 동작"으로 불러서 같은 배움이 화면마다
 * 다른 이름을 갖고 있었다.
 */
export function presentDanbaekWorldBlock(block: StageBlock): DanbaekWorldBlockPresentation {
  const family = block.recommendedMovementFamily;

  return {
    whyLine: block.requirement.reason,
    danbaekLine: DanbaekBlockVoiceLines.needsPractice,
    statusLine: `${withTopicParticle(MovementFamilyLabels[family])} 아직 배우지 못했어요`,
    // 실제로 벌어지는 일 그대로 — 내가 하고, 단백이가 옆에서 본다.
    actionLabel: `${withObjectParticle(MovementFamilyShortLabels[family])} 보여주러 가기`,
    recommendedMovementFamily: family,
    specificExerciseId: block.requirement.specificExerciseId ?? null,
  };
}
