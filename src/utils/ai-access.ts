import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { TrainerUsageState } from '@/types/ads';
import type { AiTicketReservation } from '@/utils/ai-ticket-transaction';

export interface AiAccessDecision {
  allowed: boolean;
  consumeTicket: boolean;
  remainingTickets: number;
}

/** premium은 ticket을 쓰지 않고, free는 남은 ticket 하나로만 접근한다. */
export function resolveAiAccess(premium: boolean, ticketsRemaining: number): AiAccessDecision {
  const tickets = Math.max(0, Math.floor(ticketsRemaining));
  if (premium) return { allowed: true, consumeTicket: false, remainingTickets: tickets };
  if (tickets > 0) return { allowed: true, consumeTicket: true, remainingTickets: tickets - 1 };
  return { allowed: false, consumeTicket: false, remainingTickets: 0 };
}

/** 광고 승인과 ticket 저장이 모두 성공했을 때만 true다. 실패·취소·예외는 보상을 만들지 않는다. */
export async function claimRewardedAiTicket(
  service: RewardedAdService,
  grantTickets: (units: number) => Promise<void>
): Promise<boolean> {
  try {
    const result = await service.showRewardedAd();
    if (!result.granted || result.rewardUnits <= 0) return false;
    await grantTickets(1);
    return true;
  } catch {
    return false;
  }
}

interface RunAiAccessTransactionInput<T> {
  premium: boolean;
  aiConnected: boolean;
  reserve: () => Promise<AiTicketReservation | null>;
  commit: (reservation: AiTicketReservation) => Promise<TrainerUsageState | null>;
  release: (reservation: AiTicketReservation) => Promise<void>;
  send: () => Promise<T>;
}

export type AiAccessTransactionResult<T> =
  | { allowed: false }
  | { allowed: true; value: T; trainerUsage?: TrainerUsageState };

/**
 * Premium과 offline PT는 ticket을 쓰지 않는다. Free remote AI만 먼저 한 장을 예약하고,
 * 유효한 응답 뒤 commit한다. 요청/응답/저장 실패는 예약을 풀어 ticket을 보존한다.
 */
export async function runAiAccessTransaction<T>(
  input: RunAiAccessTransactionInput<T>
): Promise<AiAccessTransactionResult<T>> {
  if (input.premium || !input.aiConnected) {
    return { allowed: true, value: await input.send() };
  }

  const reservation = await input.reserve();
  if (!reservation) return { allowed: false };

  try {
    const value = await input.send();
    const trainerUsage = await input.commit(reservation);
    if (!trainerUsage) throw new Error('AI 이용권을 확정하지 못했습니다.');
    return { allowed: true, value, trainerUsage };
  } catch (error) {
    await input.release(reservation);
    throw error;
  }
}

/** 빠른 연타와 서로 다른 화면의 동시 호출도 하나의 진행 중 요청을 공유한다. */
export function createAiRequestGate() {
  let inFlight: Promise<unknown> | null = null;
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      if (inFlight) return inFlight as Promise<T>;
      const request = operation().finally(() => {
        if (inFlight === request) inFlight = null;
      });
      inFlight = request;
      return request;
    },
    isRunning: () => inFlight !== null,
  };
}
