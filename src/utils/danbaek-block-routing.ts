import { DanbaekLearningExerciseMap } from '@/config/danbaek-learning-map';
import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';
import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord } from '@/types/workout';
import { resolveExercise } from '@/utils/exercise-spec';
import type { QuickStartExercise } from '@/utils/workout-start';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WORLD BLOCK → 현실 운동으로 되돌리는 경로
 *
 * 헌법 4장: BLOCK은 벌이 아니라 **"단백이가 아직 이걸 못 배웠다"는 안내**이고, 그 안내는
 * 다시 현실 운동으로 이어져야 한다. 여기서 하는 일은 그 번역 하나다.
 *
 *   WORLD가 준 block (계열 + 이유)
 *     → 스탠리가 할 말
 *     → 그 계열의 실제 운동 후보(기존 Exercise DB)
 *     → 기존 세션 시작 경로가 그대로 받는 모양(QuickStartExercise)
 *
 * 여기서 하지 않는 것: WORLD 내부 구현, 스테이지 판정, 새 운동 DB. 계열 → 운동 매핑은
 * 이미 있는 `DanbaekLearningExerciseMap`을 **역으로** 읽을 뿐이다 — 학습에 쓰는 지도와
 * 안내에 쓰는 지도가 어긋날 수 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BlockRoute {
  movementFamily: MovementFamily;
  /** WORLD가 준 설명 키 — 문구 자체는 APP이 고른다. */
  explanationKey: string;
  /** 스탠리가 플레이어에게 할 한 줄. 지어낸 수치를 넣지 않는다. */
  stanleyLine: string;
  /** 세션 시작에 그대로 넘길 수 있는 운동 후보. 비어 있으면 안내만 하고 시작 버튼을 내지 않는다. */
  exercises: QuickStartExercise[];
  /** 후보들의 대표 부위 — 세션이 기록 제목/추천에 쓰는 값과 같은 종류다. */
  muscleGroup?: MuscleGroup;
}

/** 계열에 속하는 Exercise DB id들. 학습 지도를 역으로 읽는다. */
export function exerciseIdsForMovementFamily(movementFamily: MovementFamily): string[] {
  return Object.entries(DanbaekLearningExerciseMap)
    .filter(([, family]) => family === movementFamily)
    .map(([exerciseId]) => exerciseId);
}

/**
 * 막힌 계열을 오늘 할 수 있는 운동으로 바꾼다.
 *
 * 후보 순서: **내가 해본 적 있는 운동 먼저**, 그다음 DB 순서. 한 번도 안 해본 기구만
 * 들이밀어 "이건 못 해요"가 되는 상황을 줄인다(운동 시작 화면의 추천과 같은 원칙).
 */
export function resolveBlockRoute(input: {
  block: StageBlock;
  exerciseDb: ExerciseDefinition[];
  records: WorkoutRecord[];
  limit?: number;
}): BlockRoute {
  const { block, exerciseDb, records, limit = 4 } = input;
  const family = block.recommendedMovementFamily;

  const familyIds = new Set(exerciseIdsForMovementFamily(family));
  const inFamily = exerciseDb.filter((exercise) => familyIds.has(exercise.id));

  const familiarIds: string[] = [];
  for (const record of [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    for (const entry of record.exercises ?? []) {
      if (!entry.exerciseId || familiarIds.includes(entry.exerciseId)) continue;
      if (familyIds.has(entry.exerciseId)) familiarIds.push(entry.exerciseId);
    }
  }

  const ordered = [
    ...familiarIds
      .map((id) => inFamily.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is ExerciseDefinition => Boolean(exercise)),
    ...inFamily.filter((exercise) => !familiarIds.includes(exercise.id)),
  ].slice(0, limit);

  const exercises: QuickStartExercise[] = ordered.map((exercise) => {
    const resolved = resolveExercise(exercise, exerciseDb);
    return {
      exerciseId: resolved.id,
      exerciseName: resolved.name,
      targetSets: resolved.defaultSets,
      defaultRestSeconds: resolved.defaultRestSeconds,
    };
  });

  return {
    movementFamily: family,
    explanationKey: block.explanationKey,
    stanleyLine: buildStanleyBlockLine(block, ordered.slice(0, 2).map((exercise) => exercise.name)),
    exercises,
    muscleGroup: ordered[0]?.primaryMuscleGroup,
  };
}

/**
 * 스탠리의 안내 한 줄.
 *
 * 계약이 준 `reason`을 그대로 쓰고 없는 사실을 덧붙이지 않는다. 운동 이름도 실제 후보에서만
 * 온다 — WORLD가 못 준 정보를 APP이 지어내면 그 순간 "가짜 코칭"이 된다.
 */
export function buildStanleyBlockLine(block: StageBlock, exerciseNames: string[]): string {
  const requirement = block.requirement;
  const needed = requirement.minimumLearningStage
    ? `${LearningStageLabels[requirement.minimumLearningStage]} 정도는 돼야 합니다.`
    : '아직 더 봐야 합니다.';

  const head = `${requirement.reason} 단백이가 ${needed}`;
  if (exerciseNames.length === 0) return head;

  return `${head} 오늘 ${exerciseNames.join(', ')}부터 같이 가시죠.`;
}
