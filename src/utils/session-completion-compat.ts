import type { SessionCompletionPrSnapshot, SessionCompletionReceipt } from '@/types/session-completion';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 저장된 완료 receipt를 읽을 때의 하위 호환
 *
 * PR이 두 종류(weight / reps)로 나뉘기 **전에** 저장된 receipt에는 `prs[].kind`가 없다.
 * 그때 기록된 PR은 전부 "최고 중량 갱신"이었으므로, 읽는 시점에 weight로 채워 준다.
 * 이건 새 의미를 만드는 것이 아니라 **당시 의미를 그대로 복원**하는 것이다.
 *
 * 여기서 하지 않는 것:
 *  - receipt version을 올리지 않는다. 모양이 바뀐 게 아니라 빠진 필드를 당시 값으로 채울
 *    뿐이고, 버전을 올리면 이미 저장된 값이 갑자기 "읽을 수 없는 것"이 된다.
 *  - XP를 다시 계산하지 않는다. 보상은 snapshot.passXpAfter에 얼어 있고 재시도는 그 값을
 *    그대로 쓴다 — 여기서 kind를 채운다고 지급이 달라지면 안 된다.
 *  - PR을 버리거나 합치지 않는다. 기록/표시가 계속 같은 개수를 본다.
 *
 * 순수 함수다. scripts/verify-pr-policy.ts가 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 저장된 값은 무엇이든 들어올 수 있으므로 읽는 쪽에서 모양을 본다. */
function normalizePrSnapshot(stored: unknown): SessionCompletionPrSnapshot | null {
  if (!stored || typeof stored !== 'object') return null;
  const pr = stored as Partial<SessionCompletionPrSnapshot> & { kind?: unknown };

  if (typeof pr.exerciseId !== 'string' || typeof pr.exerciseName !== 'string') return null;
  if (typeof pr.weightKg !== 'number') return null;

  // 옛 receipt에는 kind가 없다. 그 시절의 PR은 전부 최고 중량 갱신이었다.
  const kind = pr.kind === 'reps' ? 'reps' : 'weight';

  return {
    exerciseId: pr.exerciseId,
    exerciseName: pr.exerciseName,
    kind,
    weightKg: pr.weightKg,
    ...(typeof pr.reps === 'number' ? { reps: pr.reps } : {}),
    ...(typeof pr.previousBestWeightKg === 'number'
      ? { previousBestWeightKg: pr.previousBestWeightKg }
      : {}),
    ...(typeof pr.previousBestReps === 'number' ? { previousBestReps: pr.previousBestReps } : {}),
  };
}

/**
 * 읽은 receipt를 지금 코드가 기대하는 모양으로 맞춘다. receipt 자체(버전/단계 플래그/
 * snapshot의 나머지 값)는 그대로 두고 `prs[]`의 빠진 `kind`만 채운다.
 */
export function normalizeStoredCompletionReceipt(
  stored: SessionCompletionReceipt | null
): SessionCompletionReceipt | null {
  if (!stored) return null;

  const prs = stored.snapshot?.prs;
  if (!Array.isArray(prs)) return stored;

  return {
    ...stored,
    snapshot: {
      ...stored.snapshot,
      prs: prs
        .map(normalizePrSnapshot)
        .filter((pr): pr is SessionCompletionPrSnapshot => pr !== null),
    },
  };
}
