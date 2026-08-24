import { resolveRewardedAdService } from '@/services/ads/index';
import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { RewardedAdResult } from '@/types/ads';
import { claimRewardedAiTicket, resolveAiAccess } from '@/utils/ai-access';
import { resolveEntitlement } from '@/utils/entitlement';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

function service(result: RewardedAdResult | Error): RewardedAdService {
  return {
    isProviderAvailable: true,
    async isAdReady() {
      return true;
    },
    async showRewardedAd() {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const devProvider = resolveRewardedAdService(true);
const releaseProvider = resolveRewardedAdService(false);
expect('DEV provider는 mock이라 사용 가능하다', devProvider.isProviderAvailable);
expect('release provider는 SDK 미연결 상태라 unavailable이다', !releaseProvider.isProviderAvailable);

let grantedTickets = 0;
const unavailableGranted = await claimRewardedAiTicket(releaseProvider, async (units) => {
  grantedTickets += units;
});
expect('unavailable provider는 reward false다', !unavailableGranted);
expect('unavailable provider는 ticket을 늘리지 않는다', grantedTickets === 0);

const failed = await claimRewardedAiTicket(service({ granted: false, rewardUnits: 1 }), async (units) => {
  grantedTickets += units;
});
expect('failed reward는 false다', !failed);
expect('failed reward는 ticket 증가 0이다', grantedTickets === 0);

const cancelled = await claimRewardedAiTicket(service({ granted: false, rewardUnits: 0 }), async (units) => {
  grantedTickets += units;
});
expect('cancelled reward는 false다', !cancelled);
expect('cancelled reward는 ticket 증가 0이다', grantedTickets === 0);

const exception = await claimRewardedAiTicket(service(new Error('provider failure')), async (units) => {
  grantedTickets += units;
});
expect('provider exception은 false다', !exception);
expect('provider exception은 ticket 증가 0이다', grantedTickets === 0);

const approved = await claimRewardedAiTicket(service({ granted: true, rewardUnits: 1 }), async (units) => {
  grantedTickets += units;
});
expect('approved reward는 true다', approved);
expect('approved reward는 ticket을 정확히 +1 한다', grantedTickets === 1);

const freeAccess = resolveAiAccess(false, 1);
expect('free 사용자는 ticket이 있으면 접근한다', freeAccess.allowed);
expect(
  'free AI access는 ticket을 정확히 하나 소비한다',
  freeAccess.consumeTicket && freeAccess.remainingTickets === 0
);

const premiumAccess = resolveAiAccess(true, 0);
expect('premium은 광고 없이 접근한다', premiumAccess.allowed);
expect(
  'premium AI access는 ticket을 소비하지 않는다',
  !premiumAccess.consumeTicket && premiumAccess.remainingTickets === 0
);

const blockedFree = resolveAiAccess(false, 0);
expect('ticket 0인 free 사용자는 접근이 거부된다', !blockedFree.allowed && !blockedFree.consumeTicket);

let cappedTickets = 0;
await claimRewardedAiTicket(service({ granted: true, rewardUnits: 99 }), async (units) => {
  cappedTickets += units;
});
expect('한 광고 승인은 provider 수치와 무관하게 ticket 하나만 지급한다', cappedTickets === 1);

const now = Date.parse('2026-08-24T00:00:00.000Z');
const devSubscription = {
  status: 'active',
  tierId: 'pro',
  provider: 'dev',
  expiresAt: new Date(now + 86_400_000).toISOString(),
} as const;
expect(
  'DEV subscription mock은 release entitlement를 만들지 못한다',
  resolveEntitlement({ subscription: devSubscription, nowMs: now, allowDevProvider: false }).tier === 'free'
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
