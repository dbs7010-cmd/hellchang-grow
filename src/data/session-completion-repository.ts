import { StorageKeys } from '@/services/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/services/storage/local-storage';
import type { SessionCompletionReceipt } from '@/types/session-completion';

export async function getPendingSessionCompletion(): Promise<SessionCompletionReceipt | null> {
  return readJSON<SessionCompletionReceipt>(StorageKeys.pendingSessionCompletion);
}

export async function savePendingSessionCompletion(
  receipt: SessionCompletionReceipt
): Promise<void> {
  await writeJSON(StorageKeys.pendingSessionCompletion, receipt);
}

export async function clearPendingSessionCompletion(): Promise<void> {
  await removeKey(StorageKeys.pendingSessionCompletion);
}
