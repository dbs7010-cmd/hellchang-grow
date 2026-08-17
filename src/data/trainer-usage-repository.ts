import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { TrainerUsageState } from '@/types/ads';

const defaultTrainerUsageState: TrainerUsageState = {
  rewardedPtUsesRemaining: 0,
};

export async function getTrainerUsageState(): Promise<TrainerUsageState> {
  const state = await readJSON<TrainerUsageState>(StorageKeys.trainerUsageState);
  return state ?? defaultTrainerUsageState;
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
