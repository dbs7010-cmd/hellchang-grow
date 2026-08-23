export const StorageKeys = {
  userProfile: 'hellchang.userProfile.v1',
  onboardingComplete: 'hellchang.onboardingComplete.v1',
  bodyHistory: 'hellchang.bodyHistory.v1',
  workoutRecords: 'hellchang.workoutRecords.v1',
  activeWorkoutSession: 'hellchang.activeWorkoutSession.v1',
  pendingSessionCompletion: 'hellchang.pendingSessionCompletion.v1',
  routines: 'hellchang.routines.v1',
  passState: 'hellchang.passState.v1',
  growthState: 'hellchang.growthState.v1',
  /** GYM BATTLE CORE 게임 상태. 운동 기록/성장 상태와 별도 키다 (서로를 복제하지 않는다). */
  battleState: 'hellchang.battleState.v1',
  streakState: 'hellchang.streakState.v1',
  subscriptionState: 'hellchang.subscriptionState.v1',
  trainerUsageState: 'hellchang.trainerUsageState.v1',
  referralState: 'hellchang.referralState.v1',
  openEventPassState: 'hellchang.openEventPassState.v1',
} as const;
