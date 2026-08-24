import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';

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
