import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { DanbaekWorldVoiceLines } from '@/config/danbaek-voice-lines';
import { runDanbaekAdventure } from '@/features/danbaek-world/adventure-runner';
import { presentDanbaekWorldBlock } from '@/features/danbaek-world/presentation';
import {
  DanbaekWorldNextPath,
  DanbaekWorldPathTitle,
  DanbaekWorldProofStages,
  DanbaekWorldStageScenes,
} from '@/features/danbaek-world/proof-stages';
import type { DanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';
import type { DanbaekLearningProfile, MovementFamily, StageBlock } from '@/types/danbaek-contract';
import { withTopicParticle } from '@/utils/korean';

/** 지도 위 한 칸. 상태표가 아니라 "어디까지 왔는가"만 보여준다. */
export interface DanbaekWorldJourneyNode {
  id: string;
  label: string;
  state: 'done' | 'current' | 'ahead';
}

interface DanbaekWorldSceneBase {
  pathTitle: string;
  journey: DanbaekWorldJourneyNode[];
  /** 지금 서 있는(또는 방금 지나온) 구간. 방문 기억이 이 값으로 변화를 판단한다. */
  stageId: string;
  /** 눈앞에서 벌어지는 일 한 줄. */
  sceneLine: string;
  /** 단백이 한마디 (PRIMARY). */
  danbaekLine: string;
  /** 정확한 상태 (SECONDARY). 실제 학습 단계보다 앞서 말하지 않는다. */
  statusLine: string;
  clearedStageIds: string[];
}

export type DanbaekWorldSceneState =
  | (DanbaekWorldSceneBase & {
      state: 'cleared';
      gate: 'open';
      /** 열린 순간을 알릴 때만 쓰는 제목. */
      title: string;
      nextGoal: { label: string; teaser: string };
    })
  | (DanbaekWorldSceneBase & {
      state: 'blocked';
      gate: 'closed';
      /** 왜 못 지나가는지. 스테이지가 쓴 문장 그대로. */
      whyLine: string;
      actionLabel: string;
      block: StageBlock;
    });

function sceneOf(stageId: string) {
  return (
    DanbaekWorldStageScenes[stageId] ?? {
      label: stageId,
      blockedLine: '단백이가 여기서 멈췄어요.',
      clearedLine: '단백이가 여기를 지나갔어요.',
    }
  );
}

/**
 * 지도. 지나온 칸 / 지금 칸 / 아직 못 간 칸으로만 나눈다.
 *
 * 마지막에 붙는 "다음 길"은 스테이지가 아니라 기대다 — 판정에 쓰이지 않고, 여기서도
 * 언제나 `ahead`다. 이걸 `current`로 만들면 갈 수 없는 곳이 지금 갈 곳처럼 보인다.
 */
function buildJourney(
  stages: readonly DanbaekWorldStage[],
  currentStageId: string | null
): DanbaekWorldJourneyNode[] {
  const currentIndex = currentStageId
    ? stages.findIndex((stage) => stage.id === currentStageId)
    : stages.length;

  const nodes: DanbaekWorldJourneyNode[] = stages.map((stage, index) => ({
    id: stage.id,
    label: sceneOf(stage.id).label,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'ahead',
  }));

  nodes.push({ id: 'next-path', label: DanbaekWorldNextPath.label, state: 'ahead' });
  return nodes;
}

/** 그 계열을 지금 어디까지 배웠는지. 배운 적이 없으면 null — 지어내지 않는다. */
function learnedStatusLine(
  profile: DanbaekLearningProfile,
  movementFamily: MovementFamily
): string | null {
  const capability = profile.capabilities.find(
    (candidate) => candidate.movementFamily === movementFamily
  );
  if (!capability) return null;
  return `${MovementFamilyLabels[movementFamily]} · ${LearningStageLabels[capability.learningStage]}`;
}

/** APP supplies persisted learning. WORLD only evaluates and projects it. */
export function buildDanbaekWorldScene(profile: DanbaekLearningProfile): DanbaekWorldSceneState {
  const stages = DanbaekWorldProofStages;
  const run = runDanbaekAdventure(stages, profile);

  if (run.outcome === 'cleared') {
    // 방금 지나온 마지막 관문이 이 장면의 주인공이다.
    const lastGated = [...stages].reverse().find((stage) => stage.requirement);
    const lastStageId = lastGated?.id ?? stages[stages.length - 1]?.id ?? 'arrival';
    const family = lastGated?.requirement?.movementFamily ?? null;

    return {
      state: 'cleared',
      gate: 'open',
      pathTitle: DanbaekWorldPathTitle,
      journey: buildJourney(stages, null),
      stageId: lastStageId,
      title: '문이 열렸어요!',
      sceneLine: sceneOf(lastStageId).clearedLine,
      danbaekLine: DanbaekWorldVoiceLines.gateCleared,
      statusLine:
        (family && learnedStatusLine(profile, family)) ?? '단백이가 본 동작으로 길을 열었어요',
      nextGoal: { label: DanbaekWorldNextPath.label, teaser: DanbaekWorldNextPath.teaser },
      clearedStageIds: run.clearedStageIds,
    };
  }

  const block = run.block!;
  const presentation = presentDanbaekWorldBlock(block);

  return {
    state: 'blocked',
    gate: 'closed',
    pathTitle: DanbaekWorldPathTitle,
    journey: buildJourney(stages, block.stageId),
    stageId: block.stageId,
    sceneLine: sceneOf(block.stageId).blockedLine,
    danbaekLine: presentation.danbaekLine,
    statusLine: presentation.statusLine,
    whyLine: presentation.whyLine,
    actionLabel: presentation.actionLabel,
    block,
    clearedStageIds: run.clearedStageIds,
  };
}

/** 화면이 "다음에 뭘 하면 되는지"를 한 줄로 물어볼 때. */
export function describeNextGoal(): string {
  return `${withTopicParticle(DanbaekWorldNextPath.label)} 아직 잠겨 있어요`;
}
