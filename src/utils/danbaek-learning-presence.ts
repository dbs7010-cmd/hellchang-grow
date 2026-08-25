import { LearningStageLabels, learningStageRank } from '@/config/danbaek-learning-policy';
import { getDanbaekMovementFamily } from '@/config/danbaek-learning-map';
import { buildCopyAttemptLine, MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import type {
  DanbaekLearningProfile,
  LearnedCapability,
  LearningStage,
  MovementFamily,
} from '@/types/danbaek-contract';
import type { ExerciseDefinition } from '@/types/exercise';
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

export interface DanbaekPresence {
  /** 한 줄 요약. 항상 있다 — 본 게 없으면 없다고 말한다. */
  headline: string;
  /** 근거 한 줄. 실제 기록이 있을 때만 나온다. */
  detail: string | null;
  /** 아직 아무것도 보지 못한 상태인지. 화면이 강조를 줄일 때 쓴다. */
  waiting: boolean;
  movementFamily: MovementFamily | null;
  learningStage: LearningStage;
}

/**
 * 단계별로 단백이가 지금 무엇을 하는 중인지.
 *
 * "네가 커졌다"가 아니라 "얘가 네 동작을 따라 한다"로만 말한다 — 단백이의 학습은 플레이어의
 * 성장(Growth/HELL PASS)과 별개 축이고, 문구가 그 둘을 섞으면 축이 하나로 보인다.
 */
function headlineFor(capability: LearnedCapability): string {
  const label = withObjectParticle(MovementFamilyLabels[capability.movementFamily]);

  switch (capability.learningStage) {
    case 'observing':
      return `단백이가 옆에서 ${label} 지켜보는 중`;
    case 'imitating':
      return `단백이가 ${label} 따라 하는 중`;
    case 'learned':
      return `단백이가 ${label} 배웠어요`;
    case 'familiar':
      return `단백이가 ${label} 제법 따라 해요`;
    case 'proficient':
      return `단백이가 ${label} 능숙하게 해내요`;
    case 'unseen':
    default:
      return '단백이가 옆에서 지켜보는 중';
  }
}

/**
 * 근거 한 줄. **가장 많이 본 운동**을 말한다 — 계약이 종목별 시각을 주지 않으므로
 * "최근에 배운"이라고 하면 없는 사실이 된다.
 */
function detailFor(capability: LearnedCapability, exerciseDb: ExerciseDefinition[]): string | null {
  const [topExerciseId] = capability.representativeExerciseIds;
  if (!topExerciseId) return null;

  const name = exerciseDb.find((exercise) => exercise.id === topExerciseId)?.name;
  if (!name) return null;

  return hasLearnedStage(capability.learningStage)
    ? `${withObjectParticle(name)} 보면서 배웠어요`
    : `${withObjectParticle(name)} 제일 많이 봤어요`;
}

/**
 * HOME이 단백이 옆에 띄우는 아주 짧은 학습 현황.
 *
 * 대시보드가 아니다 — 한 줄 + 근거 한 줄이 전부이고, 기록이 없으면 죄책감을 주는 말 대신
 * 기다리고 있다고만 말한다.
 */
export function buildDanbaekPresence(input: {
  profile: DanbaekLearningProfile;
  exerciseDb: ExerciseDefinition[];
}): DanbaekPresence {
  const capability = mostRecentlyObserved(input.profile);

  if (!capability) {
    return {
      headline: '단백이가 옆에서 지켜보는 중',
      detail: null,
      waiting: true,
      movementFamily: null,
      learningStage: 'unseen',
    };
  }

  return {
    headline: headlineFor(capability),
    detail: detailFor(capability, input.exerciseDb),
    waiting: false,
    movementFamily: capability.movementFamily,
    learningStage: capability.learningStage,
  };
}

/**
 * 유효 세트를 끝낸 순간 단백이가 보이는 반응.
 *
 * 어떤 동작인지 아는 운동에서만 나온다 — 모르는 운동(직접 추가 등)에는 null을 주고, 호출부가
 * 기존 부위 반응으로 떨어진다. 아는 척하지 않는다.
 */
export function danbaekSetObservationCopy(exerciseId: string | undefined): string | null {
  if (!exerciseId) return null;
  const family = getDanbaekMovementFamily(exerciseId);
  return family ? buildCopyAttemptLine(family) : null;
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
