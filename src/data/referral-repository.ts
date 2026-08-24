import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { ReferralState } from '@/types/referral';
import { asStoredCount, asStoredDateString, asStoredRecord, asStoredText } from '@/utils/stored-state';

const defaultReferralState: ReferralState = { bonusDaysGranted: 0 };

export async function getReferralState(): Promise<ReferralState> {
  // bonusDaysGranted는 오픈 이벤트 패스 만료일 계산에 더해진다 — 숫자가 아니면 날짜가 깨진다.
  const stored = asStoredRecord(await readJSON<unknown>(StorageKeys.referralState));
  if (!stored) return defaultReferralState;
  return {
    referredByCode: asStoredText(stored.referredByCode),
    bonusDaysGranted: asStoredCount(stored.bonusDaysGranted),
    redeemedAt: asStoredDateString(stored.redeemedAt),
  };
}

export async function saveReferralState(state: ReferralState): Promise<void> {
  await writeJSON(StorageKeys.referralState, state);
}
