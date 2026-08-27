import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { OpenEventPassState } from '@/types/event';
import { asStoredDateString, asStoredFlag, asStoredRecord } from '@/utils/stored-state';

const defaultOpenEventPassState: OpenEventPassState = { active: false };

export async function getOpenEventPassState(): Promise<OpenEventPassState> {
  // 만료 시각은 설정 화면에서 new Date(...)로 표시되고, 추천인 보너스가 여기에 며칠을 더해
  // toISOString()을 부른다 — 읽을 수 없는 값이면 "Invalid Date"가 찍히거나 그 자리에서 던진다.
  // active의 의미(만료 없는 active를 어떻게 볼 것인가)는 바꾸지 않는다. 모양만 확인한다.
  const stored = asStoredRecord(await readJSON<unknown>(StorageKeys.openEventPassState));
  if (!stored) return defaultOpenEventPassState;
  return {
    active: asStoredFlag(stored.active),
    activatedAt: asStoredDateString(stored.activatedAt),
    expiresAt: asStoredDateString(stored.expiresAt),
  };
}

export async function saveOpenEventPassState(state: OpenEventPassState): Promise<void> {
  await writeJSON(StorageKeys.openEventPassState, state);
}
