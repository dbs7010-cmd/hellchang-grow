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
