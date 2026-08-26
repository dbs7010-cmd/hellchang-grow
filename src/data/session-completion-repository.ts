import { StorageKeys } from '@/services/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/services/storage/local-storage';
import type { SessionCompletionReceipt } from '@/types/session-completion';
import { normalizeStoredCompletionReceipt } from '@/utils/session-completion-compat';

/**
 * 저장된 완료 receipt를 읽는 유일한 경계.
 *
 * PR 종류(weight/reps)가 생기기 전에 저장된 receipt에는 prs[].kind가 없다 — 읽는 자리에서
 * 당시 의미(최고 중량 갱신)로 채워 준다. 버전을 올리지도, XP를 다시 계산하지도 않는다.
 */
export async function getPendingSessionCompletion(): Promise<SessionCompletionReceipt | null> {
  const stored = await readJSON<SessionCompletionReceipt>(StorageKeys.pendingSessionCompletion);
  return normalizeStoredCompletionReceipt(stored);
}

export async function savePendingSessionCompletion(
  receipt: SessionCompletionReceipt
): Promise<void> {
  await writeJSON(StorageKeys.pendingSessionCompletion, receipt);
}

export async function clearPendingSessionCompletion(): Promise<void> {
  await removeKey(StorageKeys.pendingSessionCompletion);
}
