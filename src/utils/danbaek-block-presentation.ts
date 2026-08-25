import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { DanbaekBlockVoiceLines, MovementFamilyShortLabels } from '@/config/danbaek-voice-lines';
import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';
import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord } from '@/types/workout';
import {
  buildStanleyBlockLine,
  requiredExerciseForBlock,
  resolveBlockRoute,
} from '@/utils/danbaek-block-routing';
import { withInstrumentalParticle, withObjectParticle, withTopicParticle } from '@/utils/korean';
import type { QuickStartExercise } from '@/utils/workout-start';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK → 스탠리 화면 (표현 모델)
 *
 * 흐름은 한 방향이고 각 단계가 한 가지만 한다:
 *
 *   WORLD가 준 StageBlock
 *     → resolveBlockRoute()       (어떤 실제 운동으로 되돌릴지 — 기존 어댑터)
 *     → buildBlockPresentation()  (여기: 사람이 읽을 모델)
 *     → 화면                       (그리기만 한다)
 *     → 기존 startWorkoutSession()
 *
 * 여기서 하지 않는 것:
 *  - 운동 추천 계산 (전부 `resolveBlockRoute`가 한다 — 새 추천 엔진을 만들지 않는다)
 *  - 학습/스테이지 판정 (WORLD가 이미 내린 판정을 말로 옮길 뿐이다)
 *  - WorkoutRecord 읽기 외의 무엇 (읽기만 한다. 쓰지 않는다)
 *  - WORLD 내부 import (계약 타입만 쓴다)
 *
 * 순수 함수다. scripts/verify-danbaek-block-flow.ts가 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BlockPrimaryAction {
  /** 지금 누르면 시작되는 운동. 후보가 하나도 없으면 이 값이 없다. */
  exercise: QuickStartExercise;
  /** 버튼에 쓸 문구. */
  label: string;
  /** 왜 이 운동인지 한 줄. */
  note: string;
}

export interface BlockPresentation {
  /** WORLD가 준 값 그대로. 화면이 다시 판정하지 않는다. */
  stageId: string;
  movementFamily: MovementFamily;
  explanationKey: string;
  /** 사람이 읽을 계열 이름. */
  familyLabel: string;
  /** 요구된 최소 학습 단계의 사람 말 이름. 요구가 없으면 null. */
  requiredStageLabel: string | null;
  /** 스테이지가 콕 집어 요구했고 실제 DB에 있는 운동. 없으면 null. */
  requiredExercise: { exerciseId: string; name: string } | null;
  /** 스탠리가 순서대로 할 말. 지어낸 수치/운동 이름은 들어가지 않는다. */
  stanleyLines: string[];
  /** 지금 바로 시작할 수 있는 운동 후보. 없으면 빈 배열이다. */
  exercises: QuickStartExercise[];
  /** 후보들의 대표 부위. 세션 시작에 그대로 넘긴다. */
  muscleGroup?: MuscleGroup;
  /** 후보가 없을 때 화면이 보여줄 안내. 후보가 있으면 null. */
  emptyLine: string | null;
  /**
   * 사용자가 알아야 할 세 가지 — 계약 용어가 아니라 사람 말로.
   *  1) 단백이가 왜 못 지나가는가  2) 무엇을 배우면 되는가  3) 지금 뭘 하면 되는가
   */
  danbaekLine: string;
  whyBlockedLine: string;
  whatToLearnLine: string;
  /** 지금 눌러야 할 단 하나의 행동. 후보가 없으면 null. */
  primaryAction: BlockPrimaryAction | null;
  /** 그 외 후보. 선택 피로를 만들지 않도록 primary와 분리해서 작게 둔다. */
  otherExercises: QuickStartExercise[];
}

/**
 * 관계를 문장으로 못 박는 줄.
 *
 * 헌법 2장: 스탠리가 가르치는 상대는 **플레이어**다. 단백이는 옆에서 보고 따라 할 뿐이고,
 * 스탠리가 단백이를 훈련시키는 구조가 아니다. "단백이를 강하게 만들어 주세요" 같은 일반
 * RPG 문구가 이 화면에 들어오지 않도록 여기서 한 줄로 고정한다.
 */
const StanleyRelationshipLine = '제가 자세를 봐 드리면, 단백이는 옆에서 보고 따라 합니다.';

/** 후보가 하나도 없을 때. 없는 운동을 만들어 내는 대신 없다고 말한다. */
function buildEmptyLine(familyLabel: string): string {
  return `${withTopicParticle(familyLabel)} 지금 바로 연결할 수 있는 운동이 없습니다.`;
}

export function buildBlockPresentation(input: {
  block: StageBlock;
  exerciseDb: ExerciseDefinition[];
  records: WorkoutRecord[];
  /** 화면에 세울 후보 수 상한. 기본값은 라우팅 어댑터의 기본값을 따른다. */
  limit?: number;
}): BlockPresentation {
  const { block, exerciseDb, records, limit } = input;

  const route = resolveBlockRoute({ block, exerciseDb, records, limit });
  const required = requiredExerciseForBlock(block, exerciseDb);
  const familyLabel = MovementFamilyLabels[route.movementFamily];

  const requiredStageLabel = block.requirement.minimumLearningStage
    ? LearningStageLabels[block.requirement.minimumLearningStage]
    : null;

  const stanleyLines: string[] = [
    // 왜 막혔는지 + 무엇이 더 필요한지. WORLD가 준 reason과 실제 후보 이름만 쓴다.
    buildStanleyBlockLine(block, route.exercises.slice(0, 2).map((exercise) => exercise.exerciseName)),
  ];

  if (required) {
    // 계약 4항의 예외 — 이 구간이 특정 운동을 요구할 때만 나온다.
    stanleyLines.push(`이 구간은 ${withObjectParticle(required.name)} 콕 집어 요구합니다.`);
  }

  if (route.exercises.length === 0) {
    stanleyLines.push(
      `${buildEmptyLine(familyLabel)} 오늘은 하고 싶은 부위로 시작하시고, 이 동작은 다음에 잡으시죠.`
    );
  }

  stanleyLines.push(StanleyRelationshipLine);

  const [first, ...rest] = route.exercises;
  const primaryAction: BlockPrimaryAction | null = first
    ? {
        exercise: first,
        label: `${withInstrumentalParticle(first.exerciseName)} 시작`,
        note:
          required?.id === first.exerciseId
            ? '이 구간이 요구하는 운동이에요'
            : `${withObjectParticle(MovementFamilyShortLabels[route.movementFamily])} 단백이가 보고 배워요`,
      }
    : null;

  return {
    stageId: block.stageId,
    movementFamily: route.movementFamily,
    explanationKey: route.explanationKey,
    familyLabel,
    requiredStageLabel,
    requiredExercise: required ? { exerciseId: required.id, name: required.name } : null,
    stanleyLines,
    exercises: route.exercises,
    muscleGroup: route.muscleGroup,
    emptyLine: route.exercises.length === 0 ? buildEmptyLine(familyLabel) : null,
    // 사용자는 계약도 movement family도 알 필요가 없다 — 세 가지만 알면 된다.
    danbaekLine: first ? DanbaekBlockVoiceLines.needsPractice : DanbaekBlockVoiceLines.noRoute,
    whyBlockedLine: block.requirement.reason,
    whatToLearnLine: required
      ? `${withObjectParticle(required.name)} 더 보여주면 돼요`
      : `${withObjectParticle(MovementFamilyShortLabels[route.movementFamily])} 더 보여주면 돼요`,
    primaryAction,
    otherExercises: rest,
  };
}

/**
 * 후보 한 줄의 보조 설명. "왜 이 운동인가"를 한 번에 읽히게 한다.
 * 요구된 운동이면 그렇다고 말하고, 아니면 계열 이름을 말한다 — 없는 이유를 만들지 않는다.
 */
export function describeBlockCandidate(
  presentation: BlockPresentation,
  candidate: QuickStartExercise
): string {
  if (presentation.requiredExercise?.exerciseId === candidate.exerciseId) {
    return '이 구간이 요구하는 운동';
  }
  return `${presentation.familyLabel} · 단백이가 보고 배울 동작`;
}
