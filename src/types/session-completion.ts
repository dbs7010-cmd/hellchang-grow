import type { DanbaekBodyParameters } from '@/types/body-state';
import type { GrowthApplicationResult, WorkoutSessionResult } from '@/types/growth';
import type { WorkoutCategory, WorkoutRecord } from '@/types/workout';

export interface SessionCompletionPrSnapshot {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  previousBestWeightKg?: number;
}

/** Result와 재시도에 실제로 필요한 세션 완료 데이터만 보존한다. */
export interface SessionCompletionResultSnapshot {
  sessionResult: WorkoutSessionResult;
  recordInput: Omit<WorkoutRecord, 'id' | 'createdAt'>;
  durationMinutes: number;
  category: WorkoutCategory;
  exerciseCount: number;
  completedSets: number;
  totalVolumeKg: number;
  prs: SessionCompletionPrSnapshot[];
  xpAwarded: number;
  passXpAfter: number;
  passLevel: number;
  routineCompleted: boolean;
  bodyParametersBefore: DanbaekBodyParameters;
  growth?: GrowthApplicationResult | null;
  bodyParametersAfter?: DanbaekBodyParameters;
  bodyParametersWithPump?: DanbaekBodyParameters;
  weeklyCount?: number;
  streak?: number;
}

export interface SessionCompletionReceipt {
  version: 1;
  sessionId: string;
  completedAt: string;
  growthApplied: boolean;
  workoutRecordSaved: boolean;
  rewardsSaved: boolean;
  snapshot: SessionCompletionResultSnapshot;
}
