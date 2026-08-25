import {
  DanbaekRepresentativeExerciseLimit,
  learningStageForEvidence,
} from '@/config/danbaek-learning-policy';
import { getDanbaekMovementFamily } from '@/config/danbaek-learning-map';
import {
  DANBAEK_CONTRACT_VERSION,
  MovementFamilies,
  type DanbaekLearningProfile,
  type LearnedCapability,
  type MovementFamily,
} from '@/types/danbaek-contract';
import type { WorkoutExercise, WorkoutRecord } from '@/types/workout';
import { effectiveSetDetails } from '@/utils/workout-stats';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DANBAEK LEARNING ADAPTER (APP → WORLD)
 *
 * 단백이는 플레이어의 아바타가 아니다. 옆에서 **실제로 수행된 운동을 지켜보고 따라 하며**
 * 배운다. 그래서 학습의 근거는 오직 하나다 — 이미 저장된 유효한 운동 기록.
 *
 * 여기서 하지 않는 것(헌법 3장, 공유 계약 1·2항):
 *  - WorkoutRecord/PR/세트를 만들거나 바꾸지 않는다. 읽기만 한다.
 *  - UI 클릭, 운동 선택, 취소된 세션, 무효 세트, WORLD 보상은 근거가 되지 않는다.
 *  - 같은 완료 기록을 두 번 읽었다고 evidence가 늘지 않는다.
 *
 * 순수 함수다. 시계도 저장소도 읽지 않는다 — 호출부가 시각을 넘긴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * evidence 하나 = "완료된 기록 하나에서 실제로 수행된 운동 한 종목".
 *
 * 유효성 판정은 새로 만들지 않고 기존 규칙을 그대로 쓴다:
 *  - 세트 상세가 있으면 `effectiveSetDetails`(= `isEffectiveSet`: 완료 + 횟수 > 0)
 *  - 세트 상세가 없는 옛 기록은 저장된 요약값(reps > 0)으로 같은 뜻을 본다
 *
 * 취소된 세션은 애초에 WorkoutRecord가 만들어지지 않고(`완료 세트 0개 → 기록 없이 나가기`),
 * 무효 세트는 저장 시점에 제거된다(`sessionToWorkoutRecordInput`). 그래도 옛 데이터와
 * 손상된 값이 들어올 수 있으므로 읽는 쪽에서 한 번 더 본다.
 */
function performedRealWork(exercise: WorkoutExercise): boolean {
  const details = effectiveSetDetails(exercise);
  if (details) return details.length > 0;
  return (exercise.sets ?? 0) > 0 && (exercise.reps ?? 0) > 0;
}

/**
 * 같은 운동을 두 번 세지 않기 위한 기록 식별자.
 *
 * 세션에서 만들어진 기록은 `sessionId`가 idempotency key다(완료 파이프라인이 같은 세션을
 * 두 번 저장하지 않는다). 수동/옛 기록에는 없으므로 `id`로 떨어진다.
 */
function recordKey(record: WorkoutRecord): string {
  return record.sessionId ?? record.id;
}

interface FamilyEvidence {
  evidenceCount: number;
  lastObservedAt: string | null;
  byExerciseId: Map<string, number>;
}

/** 관찰 시각. 기록의 실제 저장 시각을 쓰고, 없으면 운동 날짜로 떨어진다. */
function observedAt(record: WorkoutRecord): string {
  return record.createdAt || record.date;
}

/**
 * 유효한 운동 기록에서 단백이가 배운 것을 만든다.
 *
 * 입력은 **이미 저장된 기록 배열**이다 — 이 함수가 저장소를 읽지 않으므로, 화면/테스트가
 * 같은 배열을 넣으면 항상 같은 결과가 나온다(deterministic).
 */
export function buildDanbaekLearningProfile(input: {
  records: WorkoutRecord[];
  generatedAt: string;
}): DanbaekLearningProfile {
  const { records, generatedAt } = input;

  const evidence = new Map<MovementFamily, FamilyEvidence>();
  const seenRecords = new Set<string>();

  for (const record of records) {
    // 완료로 표시되지 않은 기록은 근거가 아니다.
    if (record.completed !== true) continue;

    // 같은 기록이 두 번 들어와도 한 번만 센다.
    const key = recordKey(record);
    if (seenRecords.has(key)) continue;
    seenRecords.add(key);

    const countedInThisRecord = new Set<string>();

    for (const exercise of record.exercises ?? []) {
      const exerciseId = exercise.exerciseId;
      if (!exerciseId) continue; // 직접 추가한 운동은 어떤 동작인지 알 수 없다.

      const family = getDanbaekMovementFamily(exerciseId);
      if (!family) continue; // 아직 매핑되지 않은 운동은 학습 근거로 쓰지 않는다.

      if (!performedRealWork(exercise)) continue;

      // 한 기록 안에서 같은 종목이 두 줄로 들어와도 한 번이다.
      const withinRecordKey = `${family}:${exerciseId}`;
      if (countedInThisRecord.has(withinRecordKey)) continue;
      countedInThisRecord.add(withinRecordKey);

      const current = evidence.get(family) ?? {
        evidenceCount: 0,
        lastObservedAt: null,
        byExerciseId: new Map<string, number>(),
      };
      current.evidenceCount += 1;
      current.byExerciseId.set(exerciseId, (current.byExerciseId.get(exerciseId) ?? 0) + 1);

      const at = observedAt(record);
      if (!current.lastObservedAt || at > current.lastObservedAt) current.lastObservedAt = at;

      evidence.set(family, current);
    }
  }

  // 여덟 계열을 항상 같은 순서로 낸다 — WORLD가 "본 적 없음"과 "빠진 값"을 구분하지 않아도 된다.
  const capabilities: LearnedCapability[] = MovementFamilies.map((movementFamily) => {
    const found = evidence.get(movementFamily);
    const evidenceCount = found?.evidenceCount ?? 0;

    return {
      movementFamily,
      learningStage: learningStageForEvidence(evidenceCount),
      evidenceCount,
      lastObservedAt: found?.lastObservedAt ?? null,
      representativeExerciseIds: found ? topExerciseIds(found.byExerciseId) : [],
    };
  });

  return {
    contractVersion: DANBAEK_CONTRACT_VERSION,
    generatedAt,
    capabilities,
  };
}

/** 많이 본 종목부터. 같은 횟수면 id 순서 — 화면과 테스트가 흔들리지 않게 한다. */
function topExerciseIds(byExerciseId: Map<string, number>): string[] {
  return [...byExerciseId.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .slice(0, DanbaekRepresentativeExerciseLimit)
    .map(([exerciseId]) => exerciseId);
}

/** 한 계열의 학습 상태를 꺼낸다. 없으면 unseen 0 (계약상 항상 존재하지만 방어적으로). */
export function capabilityFor(
  profile: DanbaekLearningProfile,
  movementFamily: MovementFamily
): LearnedCapability {
  return (
    profile.capabilities.find((capability) => capability.movementFamily === movementFamily) ?? {
      movementFamily,
      learningStage: 'unseen',
      evidenceCount: 0,
      lastObservedAt: null,
      representativeExerciseIds: [],
    }
  );
}

export interface LearningGain {
  movementFamily: MovementFamily;
  gainedEvidence: number;
  fromStage: LearnedCapability['learningStage'];
  toStage: LearnedCapability['learningStage'];
}

/**
 * 이번 운동으로 **무엇이 달라졌는가**. 결과 화면이 "단백이가 오늘 무엇을 배웠는지"를
 * 말할 수 있게 두 스냅샷의 차이만 계산한다 — 새 상태를 저장하지 않는다.
 */
export function diffLearningProfiles(
  before: DanbaekLearningProfile,
  after: DanbaekLearningProfile
): LearningGain[] {
  const gains: LearningGain[] = [];

  for (const capability of after.capabilities) {
    const previous = capabilityFor(before, capability.movementFamily);
    const gainedEvidence = capability.evidenceCount - previous.evidenceCount;
    if (gainedEvidence <= 0) continue;

    gains.push({
      movementFamily: capability.movementFamily,
      gainedEvidence,
      fromStage: previous.learningStage,
      toStage: capability.learningStage,
    });
  }

  return gains;
}
