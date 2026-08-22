import type { WorkoutSession } from '@/types/workout-session';
import type {
  SessionCompletionReceipt,
  SessionCompletionResultSnapshot,
} from '@/types/session-completion';

/** paused/completed 세션의 진행 mutation을 context 경계에서 일관되게 차단한다. */
export function mutateSessionIfActive(
  session: WorkoutSession,
  mutate: (activeSession: WorkoutSession) => WorkoutSession
): WorkoutSession {
  return session.status === 'active' ? mutate(session) : session;
}

/**
 * Growth 저장을 완료 처리의 첫 성공 경계로 고정한다. Growth가 실패하면 이후의 기록/XP와
 * session cleanup은 실행되지 않아, 저장된 active session으로 안전하게 재시도할 수 있다.
 */
export interface SessionCompletionOperations {
  loadReceipt: () => Promise<SessionCompletionReceipt | null>;
  saveReceipt: (receipt: SessionCompletionReceipt) => Promise<void>;
  clearReceipt: () => Promise<void>;
  applyGrowth: (
    snapshot: SessionCompletionResultSnapshot
  ) => Promise<Pick<SessionCompletionResultSnapshot,
    'growth' | 'bodyParametersAfter' | 'bodyParametersWithPump'>>;
  saveWorkoutRecord: (snapshot: SessionCompletionResultSnapshot) => Promise<void>;
  saveRewards: (
    snapshot: SessionCompletionResultSnapshot
  ) => Promise<Pick<SessionCompletionResultSnapshot, 'weeklyCount' | 'streak'>>;
  cleanupSession: (snapshot: SessionCompletionResultSnapshot) => Promise<void>;
}

const completionsInFlight = new Map<string, Promise<SessionCompletionReceipt>>();

/** receipt의 마지막 성공 단계 다음부터 재개하는 session-id 기반 완료 파이프라인. */
export function runSessionCompletion(
  initial: SessionCompletionReceipt,
  operations: SessionCompletionOperations
): Promise<SessionCompletionReceipt> {
  const existing = completionsInFlight.get(initial.sessionId);
  if (existing) return existing;

  const task = runSessionCompletionOnce(initial, operations).finally(() => {
    completionsInFlight.delete(initial.sessionId);
  });
  completionsInFlight.set(initial.sessionId, task);
  return task;
}

async function runSessionCompletionOnce(
  initial: SessionCompletionReceipt,
  operations: SessionCompletionOperations
): Promise<SessionCompletionReceipt> {
  const stored = await operations.loadReceipt();
  let receipt = stored?.sessionId === initial.sessionId ? stored : initial;
  if (!stored || stored.sessionId !== initial.sessionId) {
    await operations.saveReceipt(receipt);
  }

  if (!receipt.growthApplied) {
    const growthSnapshot = await operations.applyGrowth(receipt.snapshot);
    receipt = {
      ...receipt,
      growthApplied: true,
      snapshot: { ...receipt.snapshot, ...growthSnapshot },
    };
    await operations.saveReceipt(receipt);
  }

  if (!receipt.workoutRecordSaved) {
    await operations.saveWorkoutRecord(receipt.snapshot);
    receipt = { ...receipt, workoutRecordSaved: true };
    await operations.saveReceipt(receipt);
  }

  if (!receipt.rewardsSaved) {
    const rewardSnapshot = await operations.saveRewards(receipt.snapshot);
    receipt = {
      ...receipt,
      rewardsSaved: true,
      snapshot: { ...receipt.snapshot, ...rewardSnapshot },
    };
    await operations.saveReceipt(receipt);
  }

  await operations.cleanupSession(receipt.snapshot);
  await operations.clearReceipt();
  return receipt;
}
