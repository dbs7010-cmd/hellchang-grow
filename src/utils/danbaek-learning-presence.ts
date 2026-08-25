import { LearningStageLabels, learningStageRank } from '@/config/danbaek-learning-policy';
import { getDanbaekMovementFamily } from '@/config/danbaek-learning-map';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import {
  DanbaekGainVoiceLines,
  DanbaekSetVoiceLine,
  DanbaekStageVoiceLines,
  MovementFamilyShortLabels,
} from '@/config/danbaek-voice-lines';
import type {
  DanbaekLearningProfile,
  LearnedCapability,
  LearningStage,
  MovementFamily,
} from '@/types/danbaek-contract';
import type { LearningGain } from '@/utils/danbaek-learning';
import { withObjectParticle } from '@/utils/korean';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DANBAEK LEARNING PRESENTATION (표시 전용)
 *
 * 학습 자체는 `utils/danbaek-learning.ts`가 저장된 기록에서만 만든다. 이 파일은 그 결과를
 * **사람이 읽을 한 줄로 바꾸기만 한다** — 계산하지 않고, 저장하지 않고, 없는 사실을 더하지
 * 않는다. 헌법 2장(단백이는 아바타가 아니라 옆에서 지켜보는 별개의 존재)과 5장(숫자보다
 * 학습/모방의 언어)을 문구 층에서 지키는 자리다.
 *
 * 전부 순수 함수다. scripts/verify-danbaek-presentation.ts가 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 이 단계부터는 "봤다"가 아니라 "배웠다"고 말할 수 있다. */
const LearnedStageThreshold: LearningStage = 'learned';

export function hasLearnedStage(stage: LearningStage): boolean {
  return learningStageRank(stage) >= learningStageRank(LearnedStageThreshold);
}

/**
 * 지금 단백이가 무엇을 하고 있는가 — **가장 최근에 지켜본 계열** 하나.
 *
 * 여러 계열을 같은 날 봤다면 관찰 시각이 가장 늦은 것이 이긴다. 시각이 같으면 더 많이 본
 * 계열, 그다음은 계약 순서 — 같은 입력이면 화면이 흔들리지 않는다.
 */
export function mostRecentlyObserved(profile: DanbaekLearningProfile): LearnedCapability | null {
  let best: LearnedCapability | null = null;

  for (const capability of profile.capabilities) {
    if (capability.evidenceCount <= 0 || !capability.lastObservedAt) continue;
    if (!best) {
      best = capability;
      continue;
    }
    const observedLater = capability.lastObservedAt > (best.lastObservedAt ?? '');
    const sameMomentButMoreSeen =
      capability.lastObservedAt === best.lastObservedAt && capability.evidenceCount > best.evidenceCount;
    if (observedLater || sameMomentButMoreSeen) best = capability;
  }

  return best;
}

/** 배웠다고 말할 수 있는 계열 수. HOME/입구의 보조 문구에 쓴다. */
export function learnedFamilyCount(profile: DanbaekLearningProfile): number {
  return profile.capabilities.filter((capability) => hasLearnedStage(capability.learningStage)).length;
}

/**
 * ─── 두 층으로 말하기 ────────────────────────────────────────────────────────
 *
 * 단백이는 **자기 말**로 반응하고(PRIMARY), 정확한 상태는 그 아래 짧은 한 줄로 둔다
 * (SECONDARY). 시스템 설명문을 감정 표현 자리에 놓지 않기 위한 구분이다.
 *
 * 두 층 모두 이미 계산된 학습 스냅샷에서만 나온다 — 단계보다 앞선 말은 구조적으로 나올 수
 * 없다(대사 표가 단계로 색인돼 있다).
 */
export interface DanbaekVoice {
  /** 단백이 자신의 한마디. 항상 있다. */
  line: string;
  /** 정확한 상태 한 줄. 본 것이 없으면 그렇다고 말한다. */
  status: string;
  movementFamily: MovementFamily | null;
  learningStage: LearningStage;
  /** 아직 아무 동작도 보지 못한 상태인지. */
  waiting: boolean;
}

/** `밀기 · 따라 하는 중` — 칩/한 줄 상태 표기. */
export function formatLearningStatus(
  movementFamily: MovementFamily,
  stage: LearningStage
): string {
  return `${MovementFamilyShortLabels[movementFamily]} · ${LearningStageLabels[stage]}`;
}

/** 지금 단백이의 목소리 + 상태. 가장 최근에 지켜본 계열 하나를 말한다. */
export function buildDanbaekVoice(profile: DanbaekLearningProfile): DanbaekVoice {
  const capability = mostRecentlyObserved(profile);

  if (!capability) {
    return {
      line: DanbaekStageVoiceLines.unseen,
      status: '아직 본 동작 없음',
      movementFamily: null,
      learningStage: 'unseen',
      waiting: true,
    };
  }

  return {
    line: DanbaekStageVoiceLines[capability.learningStage],
    status: formatLearningStatus(capability.movementFamily, capability.learningStage),
    movementFamily: capability.movementFamily,
    learningStage: capability.learningStage,
    waiting: false,
  };
}

/**
 * 세트를 막 끝냈을 때의 한마디 + 무슨 동작인지.
 * 모르는 운동이면 null — 호출부가 기존 반응으로 떨어진다(아는 척하지 않는다).
 */
export function buildDanbaekSetVoice(exerciseId: string | undefined): string | null {
  if (!exerciseId) return null;
  const family = getDanbaekMovementFamily(exerciseId);
  if (!family) return null;
  return `${DanbaekSetVoiceLine} · ${MovementFamilyShortLabels[family]}`;
}

/**
 * 결과 화면에서 오늘 배운 것에 대한 한마디.
 *
 * 실제로 단계가 올라간 것이 하나라도 있을 때만 "늘었다"고 말한다 — 아니면 더 봤다고만
 * 한다(가짜 stage-up 금지, `describeLearningGain`과 같은 기준).
 */
export function buildDanbaekGainVoice(gains: LearningGain[]): string | null {
  if (gains.length === 0) return null;
  return gains.some((gain) => gain.fromStage !== gain.toStage)
    ? DanbaekGainVoiceLines.stageUp
    : DanbaekGainVoiceLines.moreEvidence;
}

export interface LearningBoardRow {
  movementFamily: MovementFamily;
  /** 짧은 동작 이름. */
  label: string;
  /** 단계 이름. */
  stageLabel: string;
  learningStage: LearningStage;
  evidenceCount: number;
}

/**
 * "단백이가 어디까지 배웠나"를 몇 줄로. 운동/히스토리 화면이 같은 값을 쓴다.
 *
 * 본 적 있는 계열만, 많이 본 순서로 낸다 — 아직 본 적 없는 계열까지 늘어놓으면 할 일 목록이
 * 되고, 그건 죄책감을 만든다. 값은 전부 스냅샷에서 그대로 온다(계산하지 않는다).
 */
export function buildLearningBoard(
  profile: DanbaekLearningProfile,
  limit = 3
): LearningBoardRow[] {
  return profile.capabilities
    .filter((capability) => capability.evidenceCount > 0)
    .sort((a, b) =>
      b.evidenceCount !== a.evidenceCount
        ? b.evidenceCount - a.evidenceCount
        : a.movementFamily.localeCompare(b.movementFamily)
    )
    .slice(0, limit)
    .map((capability) => ({
      movementFamily: capability.movementFamily,
      label: MovementFamilyShortLabels[capability.movementFamily],
      stageLabel: LearningStageLabels[capability.learningStage],
      learningStage: capability.learningStage,
      evidenceCount: capability.evidenceCount,
    }));
}

/** 본 적 있는 계열 수. "몇 가지를 지켜봤나"를 말할 때 쓴다. */
export function seenFamilyCount(profile: DanbaekLearningProfile): number {
  return profile.capabilities.filter((capability) => capability.evidenceCount > 0).length;
}

export interface LearningGainCopy {
  movementFamily: MovementFamily;
  familyLabel: string;
  /** 단계 변화 또는 "더 지켜봤다"는 사실 한 줄. */
  line: string;
  /** 실제로 단계가 올라갔는지. 올라가지 않았으면 올라간 것처럼 쓰지 않는다. */
  stageChanged: boolean;
}

/**
 * 결과 화면의 "오늘 단백이가 배운 것" 한 줄.
 *
 * 단계가 오르지 않았어도 **실제 evidence가 늘었으면** 지켜봤다고 말한다. 대신 그 경우
 * 화살표(→)를 쓰지 않는다 — 가짜 stage-up으로 읽히면 안 되기 때문이다.
 */
export function describeLearningGain(gain: LearningGain): LearningGainCopy {
  const familyLabel = MovementFamilyLabels[gain.movementFamily];
  const stageChanged = gain.fromStage !== gain.toStage;

  return {
    movementFamily: gain.movementFamily,
    familyLabel,
    line: stageChanged
      ? `${LearningStageLabels[gain.fromStage]} → ${LearningStageLabels[gain.toStage]}`
      : `${LearningStageLabels[gain.toStage]} · 오늘 ${gain.gainedEvidence}번 더 봤어요`,
    stageChanged,
  };
}
