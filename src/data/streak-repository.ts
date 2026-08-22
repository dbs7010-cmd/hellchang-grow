import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { StreakState } from '@/types/streak';
import { todayDateString } from '@/utils/date';
import { computeStreakUpdate } from '@/utils/streak';

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
  return registerRecordDate(todayDateString());
}

/** pending completion이 날짜를 넘겨 재시도돼도 원래 운동 날짜로 idempotent하게 반영한다. */
export async function registerRecordDate(recordDate: string): Promise<StreakState> {
  const state = await getStreakState();
  const updated = computeStreakUpdate(state, recordDate);

  if (updated === state) {
    return state;
  }

  await writeJSON(StorageKeys.streakState, updated);
  return updated;
}

export async function claimStreakReward(): Promise<StreakState> {
  const state = await getStreakState();
  const updated: StreakState = { ...state, rewardClaimed: true };
  await writeJSON(StorageKeys.streakState, updated);
  return updated;
}
