import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { SubscriptionState } from '@/types/subscription';

const defaultSubscriptionState: SubscriptionState = { status: 'none' };

export async function getSubscriptionState(): Promise<SubscriptionState> {
  const state = await readJSON<SubscriptionState>(StorageKeys.subscriptionState);
  return state ?? defaultSubscriptionState;
}

export async function saveSubscriptionState(state: SubscriptionState): Promise<void> {
  await writeJSON(StorageKeys.subscriptionState, state);
}
