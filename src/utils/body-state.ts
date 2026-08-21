import { BodyStateConfig } from '@/config/body-state-config';
import type { BodyHistoryEntry } from '@/types/body';
import {
  MuscleDetailToVisualGroup,
  VisualMuscleGroups,
  type BodyShapeProfile,
  type DanbaekBodyState,
  type FatStageSource,
  type NutritionState,
  type RecoveryState,
  type VisualMuscleGroup,
  type WeightTrend,
} from '@/types/body-state';
import { MuscleGroupDetails, type MuscleGroupDetail, type MuscleSpDistribution } from '@/types/exercise';
import type { DanbaekGrowthState } from '@/types/growth';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BODY STATE — 여러 축을 "지금 단백이 몸"으로 합치는 순수 레이어
 *
 * 전부 순수 함수다 (IO 없음, 저장소를 모른다). 밸런스 숫자는 전부
 * `config/body-state-config.ts`에서 온다.
 *
 * 지키는 경계:
 *  - 근육 축과 지방 축은 서로를 바꾸지 않는다. 여기서 **조합만** 한다.
 *  - 실제 체지방률이 있으면 언제나 그것이 이긴다. 추정치는 추정치라고 표시한다
 *    (`fatStageSource`) — 화면이 추정을 측정처럼 말하지 않게 하기 위한 것이다.
 *  - GrowthEngine의 stage/SP를 절대 수정하지 않는다. 읽기만 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 근육 stage(0~5) → 시각적 크기(0~1). 비선형 표는 config에 있다. */
export function muscleStageToVisualScale(stage: number): number {
  const table = BodyStateConfig.muscleStageVisualScale;
  const index = clamp(Math.round(stage), 0, table.length - 1);
  return table[index];
}

/**
 * 최근 기록으로 체중 추세를 본다. 하루치 변동(식사/수분)에 흔들리지 않도록 일정 기간과
 * 최소 기록 수를 요구하고, 증감의 "양"을 주장하지 않는다 — 게임 입력용 방향일 뿐이다.
 */
export function computeWeightTrend(entries: BodyHistoryEntry[], todayIso: string): WeightTrend {
  const { windowDays, minimumEntries, significantChangeKg } = BodyStateConfig.weightTrend;
  const today = new Date(todayIso);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);

  const recent = entries
    .filter((entry) => Number.isFinite(entry.weightKg) && entry.weightKg > 0)
    .filter((entry) => new Date(entry.date) >= cutoff)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (recent.length < minimumEntries) return 'unknown';

  const change = recent[recent.length - 1].weightKg - recent[0].weightKg;
  if (change >= significantChangeKg) return 'gaining';
  if (change <= -significantChangeKg) return 'losing';
  return 'stable';
}

/** 가장 최근에 사용자가 실제로 입력한 체지방률. 없으면 undefined (지어내지 않는다). */
export function findLatestBodyFatPercent(entries: BodyHistoryEntry[]): number | undefined {
  return [...entries]
    .filter((entry) => entry.bodyFatPercent !== undefined)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]?.bodyFatPercent;
}

/** 실제 체지방률(%) → fatStage. 구간표는 config에 있다. */
export function fatStageFromBodyFatPercent(percent: number): number {
  const band = BodyStateConfig.fat.percentBands.find((candidate) => percent >= candidate.minPercent);
  return band?.stage ?? BodyStateConfig.fat.defaultStage;
}

export interface FatStageResolution {
  stage: number;
  source: FatStageSource;
}

/**
 * fatStage 결정. 우선순위가 곧 신뢰도 순서다:
 *   1) 사용자가 입력한 실제 체지방률
 *   2) 체중 추세 + 식단 상태(근거가 둘 이상일 때만) → 게임 추정
 *   3) 중립 기본값
 * 추정으로 나온 값은 `source: 'estimated'`로 표시돼, 화면이 실제 체지방률처럼
 * 보여주지 않도록 만든다.
 */
export function resolveFatStage(input: {
  bodyFatPercent?: number;
  weightTrend: WeightTrend;
  nutritionState: NutritionState;
}): FatStageResolution {
  const { defaultStage, minStage, maxStage, estimate } = BodyStateConfig.fat;

  if (input.bodyFatPercent !== undefined && Number.isFinite(input.bodyFatPercent)) {
    return { stage: fatStageFromBodyFatPercent(input.bodyFatPercent), source: 'measured' };
  }

  const trendShift = estimate.trend[input.weightTrend];
  const nutritionShift = estimate.nutrition[input.nutritionState];
  const signals =
    (input.weightTrend === 'unknown' ? 0 : 1) + (input.nutritionState === 'unknown' ? 0 : 1);

  if (signals < estimate.minimumSignals) {
    return { stage: defaultStage, source: 'default' };
  }

  return {
    stage: clamp(defaultStage + trendShift + nutritionShift, minStage, maxStage),
    source: 'estimated',
  };
}

/** 부위 크기 가중 평균 근육량 점수 (0~1). 팔만 키워도 전신 최대치가 되지 않는다. */
export function computeMuscleMassScore(muscleStages: Record<MuscleGroupDetail, number>): number {
  const weights = BodyStateConfig.muscleMassWeights;
  let weighted = 0;
  let totalWeight = 0;
  for (const muscle of MuscleGroupDetails) {
    const weight = weights[muscle] ?? 1;
    weighted += muscleStageToVisualScale(muscleStages[muscle] ?? 0) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? round2(weighted / totalWeight) : 0;
}

/** 세부 stage → 렌더링 묶음 stage (평균). 세부 값은 그대로 남는다. */
export function groupMuscleStages(
  muscleStages: Record<MuscleGroupDetail, number>
): Record<VisualMuscleGroup, number> {
  const sums = {} as Record<VisualMuscleGroup, { total: number; count: number }>;
  for (const group of VisualMuscleGroups) sums[group] = { total: 0, count: 0 };

  for (const muscle of MuscleGroupDetails) {
    const group = MuscleDetailToVisualGroup[muscle];
    sums[group].total += muscleStages[muscle] ?? 0;
    sums[group].count += 1;
  }

  const grouped = {} as Record<VisualMuscleGroup, number>;
  for (const group of VisualMuscleGroups) {
    grouped[group] = sums[group].count > 0 ? round2(sums[group].total / sums[group].count) : 0;
  }
  return grouped;
}

/**
 * definition = leanness × (base + gain × muscleMassScore)
 *
 * 지방만 낮다고 강한 데피니션이 되지 않고(근육이 없으면 base만 남는다), 근육만 많아도
 * 지방이 높으면 가려진다(leanness가 작다). 네 가지 시나리오가 분기 없이 이 식 하나에서
 * 자연스럽게 나온다.
 */
export function computeDefinitionStage(input: {
  muscleMassScore: number;
  fatStage: number;
}): number {
  const { base, muscleGain, maxStage } = BodyStateConfig.definition;
  const leanness = clamp(1 - input.fatStage / maxStage, 0, 1);
  const definition = leanness * (base + muscleGain * clamp(input.muscleMassScore, 0, 1));
  return clamp(Math.round(definition * maxStage), 0, maxStage);
}

/** 현재 상태를 설명하는 label. 성장을 제한하지 않는다. */
export function deriveShapeProfile(input: {
  muscleMassScore: number;
  fatStage: number;
}): BodyShapeProfile {
  const fatRatio = clamp(input.fatStage / BodyStateConfig.fat.maxStage, 0, 1);
  const match = BodyStateConfig.shapeProfiles.find(
    (candidate) =>
      input.muscleMassScore >= candidate.minMuscle &&
      (candidate.maxFat === undefined || fatRatio <= candidate.maxFat) &&
      (candidate.minFat === undefined || fatRatio >= candidate.minFat)
  );
  return match?.profile ?? 'lean';
}

/**
 * 모든 축을 모아 지금의 단백이 몸 상태를 만든다.
 *
 * GrowthState는 **읽기만** 한다 — 근육 stage/SP는 여기서 절대 바뀌지 않는다.
 * pump는 인자로 따로 받는다(영구 상태에 저장되지 않는 값이라 GrowthState에 없다).
 */
export function buildDanbaekBodyState(input: {
  growth: DanbaekGrowthState;
  bodyHistory: BodyHistoryEntry[];
  nutritionState?: NutritionState;
  recoveryState?: RecoveryState;
  /** 방금 끝낸 세션의 일시적 펌핑. 없으면 펌핑 없음. */
  pumpByMuscle?: MuscleSpDistribution;
  nowIso: string;
}): DanbaekBodyState {
  const muscleStages = {} as Record<MuscleGroupDetail, number>;
  for (const muscle of MuscleGroupDetails) {
    muscleStages[muscle] = input.growth.muscles[muscle]?.currentStage ?? 0;
  }

  const nutritionState = input.nutritionState ?? input.growth.body?.nutritionState ?? 'unknown';
  const recoveryState = input.recoveryState ?? input.growth.body?.recoveryState ?? 'unknown';

  const weightTrend = computeWeightTrend(input.bodyHistory, input.nowIso);
  const fat = resolveFatStage({
    bodyFatPercent: findLatestBodyFatPercent(input.bodyHistory),
    weightTrend,
    nutritionState,
  });

  const muscleMassScore = computeMuscleMassScore(muscleStages);
  const definitionStage = computeDefinitionStage({ muscleMassScore, fatStage: fat.stage });

  return {
    muscleStages,
    groupedMuscleStages: groupMuscleStages(muscleStages),
    muscleMassScore,
    fatStage: fat.stage,
    fatStageSource: fat.source,
    definitionStage,
    pumpByMuscle: input.pumpByMuscle ?? {},
    nutritionState,
    recoveryState,
    weightTrend,
    shapeProfile: deriveShapeProfile({ muscleMassScore, fatStage: fat.stage }),
    updatedAt: input.nowIso,
  };
}
