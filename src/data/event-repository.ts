import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { OpenEventPassState } from '@/types/event';

const defaultOpenEventPassState: OpenEventPassState = { active: false };

export async function getOpenEventPassState(): Promise<OpenEventPassState> {
  const state = await readJSON<OpenEventPassState>(StorageKeys.openEventPassState);
  return state ?? defaultOpenEventPassState;
}

export async function saveOpenEventPassState(state: OpenEventPassState): Promise<void> {
  await writeJSON(StorageKeys.openEventPassState, state);
}
