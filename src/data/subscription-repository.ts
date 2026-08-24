import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { SubscriptionState } from '@/types/subscription';
import { sanitizeSubscriptionRecord } from '@/utils/entitlement';

/**
 * 저장소에 있는 것은 provider가 알려준 **기록**이지 권리가 아니다. 손댈 수 있는 파일이므로
 * 읽을 때마다 형태를 검사한다 — 읽을 수 없는 값은 지어내지 않고 떨어뜨린다.
 * 유료 여부 판단은 `resolveEntitlement`가 한다.
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const state = await readJSON<unknown>(StorageKeys.subscriptionState);
  return sanitizeSubscriptionRecord(state);
}

export async function saveSubscriptionState(state: SubscriptionState): Promise<void> {
  await writeJSON(StorageKeys.subscriptionState, sanitizeSubscriptionRecord(state));
}
