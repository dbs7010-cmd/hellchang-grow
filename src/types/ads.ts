export interface RewardedAdResult {
  granted: boolean;
  rewardUnits: number;
}

export interface TrainerUsageState {
  rewardedPtUsesRemaining: number;
  lastAdWatchedAt?: string;
}
