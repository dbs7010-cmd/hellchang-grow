import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { ReferralState } from '@/types/referral';

const defaultReferralState: ReferralState = { bonusDaysGranted: 0 };

export async function getReferralState(): Promise<ReferralState> {
  const state = await readJSON<ReferralState>(StorageKeys.referralState);
  return state ?? defaultReferralState;
}

export async function saveReferralState(state: ReferralState): Promise<void> {
  await writeJSON(StorageKeys.referralState, state);
}
