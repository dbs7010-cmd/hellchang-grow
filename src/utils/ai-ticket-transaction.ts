import type { TrainerUsageState } from '@/types/ads';

export interface AiTicketReservation {
  id: string;
}

interface TrainerUsageStore {
  read: () => Promise<TrainerUsageState>;
  write: (state: TrainerUsageState) => Promise<void>;
}

function sanitizeUsage(state: TrainerUsageState): TrainerUsageState {
  const remaining = Number.isFinite(state.rewardedPtUsesRemaining)
    ? Math.max(0, Math.floor(state.rewardedPtUsesRemaining))
    : 0;
  return {
    rewardedPtUsesRemaining: remaining,
    ...(state.lastAdWatchedAt ? { lastAdWatchedAt: state.lastAdWatchedAt } : {}),
  };
}

/**
 * 광고 ticket의 read-modify-write와 AI 요청 예약을 한 큐에서 직렬화한다.
 * 예약은 메모리에만 둔다. 앱이 종료되면 전달되지 않은 요청과 함께 사라지고, 저장 ticket은
 * 성공 응답을 실제로 받은 뒤 commit할 때만 줄어든다.
 */
export function createAiTicketCoordinator(store: TrainerUsageStore) {
  let queue: Promise<void> = Promise.resolve();
  let reservationSequence = 0;
  const reservations = new Set<string>();

  function exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  const read = async () => sanitizeUsage(await store.read());

  return {
    getState: () => exclusive(read),

    grant: (units: number, nowIso: string) =>
      exclusive(async () => {
        const state = await read();
        const grantedUnits = Number.isFinite(units) ? Math.max(0, Math.floor(units)) : 0;
        if (grantedUnits === 0) return state;
        const updated: TrainerUsageState = {
          rewardedPtUsesRemaining: state.rewardedPtUsesRemaining + grantedUnits,
          lastAdWatchedAt: nowIso,
        };
        await store.write(updated);
        return updated;
      }),

    reserve: () =>
      exclusive(async (): Promise<AiTicketReservation | null> => {
        const state = await read();
        if (state.rewardedPtUsesRemaining - reservations.size <= 0) return null;
        const reservation = { id: `ai-ticket-${++reservationSequence}` };
        reservations.add(reservation.id);
        return reservation;
      }),

    commit: (reservation: AiTicketReservation) =>
      exclusive(async (): Promise<TrainerUsageState | null> => {
        if (!reservations.has(reservation.id)) return null;
        const state = await read();
        if (state.rewardedPtUsesRemaining <= 0) {
          reservations.delete(reservation.id);
          return null;
        }
        const updated: TrainerUsageState = {
          ...state,
          rewardedPtUsesRemaining: state.rewardedPtUsesRemaining - 1,
        };
        await store.write(updated);
        reservations.delete(reservation.id);
        return updated;
      }),

    release: (reservation: AiTicketReservation) =>
      exclusive(async () => {
        reservations.delete(reservation.id);
      }),

    reservedCount: () => reservations.size,
  };
}

export type AiTicketCoordinator = ReturnType<typeof createAiTicketCoordinator>;
