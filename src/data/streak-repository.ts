import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { StreakState } from '@/types/streak';
import { todayDateString } from '@/utils/date';
import { asStoredCount, asStoredDateString, asStoredFlag, asStoredRecord } from '@/utils/stored-state';
import { computeStreakUpdate } from '@/utils/streak';

const defaultStreakState: StreakState = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  rewardClaimed: false,
};

export async function getStreakState(): Promise<StreakState> {
  // 연속 일수는 화면과 보상에 그대로 쓰이고 computeStreakUpdate가 여기에 +1을 한다 —
  // 문자열이 섞이면 "5" + 1 = "51"이 된다. 읽는 시점에만 확인하고 저장값은 고쳐 쓰지 않는다.
  const stored = asStoredRecord(await readJSON<unknown>(StorageKeys.streakState));
  if (!stored) return defaultStreakState;
  return {
    currentStreakDays: asStoredCount(stored.currentStreakDays),
    longestStreakDays: asStoredCount(stored.longestStreakDays),
    lastRecordDate: asStoredDateString(stored.lastRecordDate),
    rewardClaimed: asStoredFlag(stored.rewardClaimed),
  };
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
