import { GrowthConfig, MaxMuscleStage } from '@/config/growth-config';
import { MuscleGroupDetailLabels } from '@/config/muscle-groups';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { MuscleGroupDetails, type MuscleGroupDetail } from '@/types/exercise';
import type { DanbaekGrowthState, GrowthApplicationResult } from '@/types/growth';

export interface GrowthRevealMuscle {
  muscle: MuscleGroupDetail;
  label: string;
  gainedSp: number;
  previousStage: number;
  currentStage: number;
  stageChanged: boolean;
  progressBefore: number;
  progressAfter: number;
  isMaxStage: boolean;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function stageProgress(totalSp: number, stage: number): number {
  if (stage >= MaxMuscleStage) return 1;
  const floor = GrowthConfig.stageThresholds[stage];
  const ceiling = GrowthConfig.stageThresholds[stage + 1];
  return clamp01((totalSp - floor) / (ceiling - floor));
}

/** Existing GrowthEngine output -> Result-only view model. No SP or stage is recalculated. */
export function buildGrowthRevealMuscles(input: {
  growth: GrowthApplicationResult | null;
  growthAfter: DanbaekGrowthState;
}): GrowthRevealMuscle[] {
  const { growth, growthAfter } = input;
  if (!growth) return [];

  return MuscleGroupDetails.flatMap((muscle) => {
    const gainedSp = growth.gainedSpByMuscle[muscle] ?? 0;
    if (!(gainedSp > 0)) return [];
    const previousStage = growth.previousStages[muscle];
    const currentStage = growth.currentStages[muscle];
    const totalAfter = growthAfter.muscles[muscle]?.totalSp ?? gainedSp;
    const totalBefore = Math.max(0, totalAfter - gainedSp);
    return [{
      muscle,
      label: MuscleGroupDetailLabels[muscle],
      gainedSp,
      previousStage,
      currentStage,
      stageChanged: currentStage > previousStage,
      progressBefore: stageProgress(totalBefore, previousStage),
      progressAfter: stageProgress(totalAfter, currentStage),
      isMaxStage: currentStage >= MaxMuscleStage,
    }];
  }).sort((a, b) => b.gainedSp - a.gainedSp);
}

export function hasPermanentBodyChange(
  before: DanbaekBodyParameters,
  after: DanbaekBodyParameters
): boolean {
  return (Object.keys(before) as (keyof DanbaekBodyParameters)[]).some(
    (key) => before[key] !== after[key]
  );
}

// ── Result reveal 순서 ──────────────────────────────────────────────────────

export type GrowthRevealPhase = 'pump' | 'before' | 'after';

/**
 * Result가 거치는 단계. **항상 실제(영구) 몸으로 끝난다.**
 *
 * 영구 변화가 없는 날에도 펌핑 상태로 끝내면, 사용자는 부푼 몸을 오늘의 결과로 이해한 뒤
 * 홈에서 작아진 몸을 보고 혼란스러워한다. 그래서 영구 변화가 없으면 BEFORE를 건너뛰고
 * PUMP → AFTER로, 있으면 기존처럼 PUMP → BEFORE → AFTER로 간다.
 *
 * 순수 함수다. 새 BodyParameters를 만들지 않고 어떤 스냅샷을 보여줄지 순서만 정한다.
 */
export function buildGrowthRevealSequence(input: {
  permanentChanged: boolean;
  reducedMotion: boolean;
}): GrowthRevealPhase[] {
  // 모션을 줄인 사용자는 연출 없이 결론(실제 몸)만 본다.
  if (input.reducedMotion) return ['after'];
  return input.permanentChanged ? ['pump', 'before', 'after'] : ['pump', 'after'];
}

/** 각 단계에서 그릴 몸. 전부 세션 완료 스냅샷에 이미 있는 값이며 다시 계산하지 않는다. */
export function revealBodyParameters(
  phase: GrowthRevealPhase,
  snapshot: {
    bodyParametersWithPump: DanbaekBodyParameters;
    bodyParametersBefore: DanbaekBodyParameters;
    bodyParametersAfter: DanbaekBodyParameters;
  }
): DanbaekBodyParameters {
  if (phase === 'pump') return snapshot.bodyParametersWithPump;
  if (phase === 'before') return snapshot.bodyParametersBefore;
  return snapshot.bodyParametersAfter;
}
