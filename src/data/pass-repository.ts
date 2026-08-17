import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { PassState } from '@/types/pass';

const defaultPassState: PassState = { xp: 0 };

export async function getPassState(): Promise<PassState> {
  const state = await readJSON<PassState>(StorageKeys.passState);
  return state ?? defaultPassState;
}

export async function savePassState(state: PassState): Promise<void> {
  await writeJSON(StorageKeys.passState, state);
}
