import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { PassState } from '@/types/pass';
import { asStoredCount, asStoredRecord } from '@/utils/stored-state';

const defaultPassState: PassState = { xp: 0 };

export async function getPassState(): Promise<PassState> {
  // 레벨은 xp에서 매번 계산된다 — xp가 NaN이면 홈의 "HELL PASS Lv.N"까지 NaN이 된다.
  const stored = asStoredRecord(await readJSON<unknown>(StorageKeys.passState));
  if (!stored) return defaultPassState;
  return { xp: asStoredCount(stored.xp) };
}

export async function savePassState(state: PassState): Promise<void> {
  await writeJSON(StorageKeys.passState, state);
}
