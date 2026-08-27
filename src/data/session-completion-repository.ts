import { StorageKeys } from '@/services/storage/keys';
import { readRawString, removeKey, writeJSON } from '@/services/storage/local-storage';
import type { SessionCompletionReceipt } from '@/types/session-completion';
import { classifyStoredReceiptRaw } from '@/utils/stored-state';
import { normalizeStoredCompletionReceipt } from '@/utils/session-completion-compat';

/**
 * 저장된 완료 receipt를 믿을 수 없을 때 던진다. 완료 처리는 여기서 멈추고, 세션은 그대로
 * 남아 화면이 [다시 시도]를 보여 준다 — 중복 지급보다 지연이 낫다.
 */
export class UnreadableCompletionReceiptError extends Error {
  constructor() {
    super('저장된 운동 완료 기록을 읽을 수 없습니다');
    this.name = 'UnreadableCompletionReceiptError';
  }
}

/**
 * 이번에 완료하려는 세션(currentSessionId) 기준으로 저장된 receipt를 읽는다.
 *
 * 믿을 수 없는 값이면 **지우지 않고 던진다.** 버리면 파이프라인이 처음부터 다시 돌아 이미
 * 반영된 성장/XP를 다시 줄 수 있고, 억지로 살리면 안 끝난 단계를 끝났다고 볼 수 있다.
 * 단, 읽을 수 있는 sessionId가 이번 세션과 다르면 다른 세션의 잔해이므로 이번 완료를
 * 막지 않는다 — 다음 저장이 그 값을 덮어쓴다.
 */
export async function getPendingSessionCompletion(
  currentSessionId: string
): Promise<SessionCompletionReceipt | null> {
  const stored = classifyStoredReceiptRaw(await readRawString(StorageKeys.pendingSessionCompletion));
  if (stored.kind === 'none') return null;
  // 믿을 수 있는 값이면, PR 종류(kind)가 없던 시절의 receipt만 당시 의미로 복원해서 돌려준다.
  // 정규화는 빠진 필드를 채울 뿐 저장된 XP/진행 단계/sessionId를 바꾸지 않는다.
  if (stored.kind === 'usable') return normalizeStoredCompletionReceipt(stored.receipt);
  if (stored.sessionId !== undefined && stored.sessionId !== currentSessionId) return null;
  throw new UnreadableCompletionReceiptError();
}

export async function savePendingSessionCompletion(
  receipt: SessionCompletionReceipt
): Promise<void> {
  await writeJSON(StorageKeys.pendingSessionCompletion, receipt);
}

export async function clearPendingSessionCompletion(): Promise<void> {
  await removeKey(StorageKeys.pendingSessionCompletion);
}
