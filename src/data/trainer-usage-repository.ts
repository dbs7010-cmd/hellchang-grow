import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { TrainerUsageState } from '@/types/ads';
import { asStoredCount, asStoredDateString, asStoredRecord } from '@/utils/stored-state';

const defaultTrainerUsageState: TrainerUsageState = {
  rewardedPtUsesRemaining: 0,
};

export async function getTrainerUsageState(): Promise<TrainerUsageState> {
  // AI PT 접근이 rewardedPtUsesRemaining > 0으로 갈린다. 문자열 "5"도 그 비교를 통과하므로,
  // 저장값이 깨지거나 조작되면 광고 없이 유료 기능이 열린다.
  const stored = asStoredRecord(await readJSON<unknown>(StorageKeys.trainerUsageState));
  if (!stored) return defaultTrainerUsageState;
  return {
    rewardedPtUsesRemaining: asStoredCount(stored.rewardedPtUsesRemaining),
    lastAdWatchedAt: asStoredDateString(stored.lastAdWatchedAt),
  };
}

export async function grantRewardedPtUses(units: number): Promise<TrainerUsageState> {
  const state = await getTrainerUsageState();
  const updated: TrainerUsageState = {
    rewardedPtUsesRemaining: state.rewardedPtUsesRemaining + units,
    lastAdWatchedAt: new Date().toISOString(),
  };
  await writeJSON(StorageKeys.trainerUsageState, updated);
  return updated;
}

export async function consumeRewardedPtUse(): Promise<TrainerUsageState> {
  const state = await getTrainerUsageState();
  const updated: TrainerUsageState = {
    ...state,
    rewardedPtUsesRemaining: Math.max(0, state.rewardedPtUsesRemaining - 1),
  };
  await writeJSON(StorageKeys.trainerUsageState, updated);
  return updated;
}
