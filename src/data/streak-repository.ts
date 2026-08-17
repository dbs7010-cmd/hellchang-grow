import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { StreakState } from '@/types/streak';
import { todayDateString, yesterdayDateString } from '@/utils/date';

const defaultStreakState: StreakState = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  rewardClaimed: false,
};

export async function getStreakState(): Promise<StreakState> {
  const state = await readJSON<StreakState>(StorageKeys.streakState);
  return state ?? defaultStreakState;
}

export async function registerTodayRecord(): Promise<StreakState> {
  const state = await getStreakState();
  const today = todayDateString();

  if (state.lastRecordDate === today) {
    return state;
  }

  const isConsecutive = state.lastRecordDate === yesterdayDateString(today);
  const currentStreakDays = isConsecutive ? state.currentStreakDays + 1 : 1;

  const updated: StreakState = {
    currentStreakDays,
    longestStreakDays: Math.max(state.longestStreakDays, currentStreakDays),
    lastRecordDate: today,
    rewardClaimed: state.rewardClaimed,
  };

  await writeJSON(StorageKeys.streakState, updated);
  return updated;
}

export async function claimStreakReward(): Promise<StreakState> {
  const state = await getStreakState();
  const updated: StreakState = { ...state, rewardClaimed: true };
  await writeJSON(StorageKeys.streakState, updated);
  return updated;
}
