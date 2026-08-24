import { resolveRewardedAdService } from '@/services/ads/index';
import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { RewardedAdResult } from '@/types/ads';
import {
  claimRewardedAiTicket,
  createAiRequestGate,
  resolveAiAccess,
  runAiAccessTransaction,
} from '@/utils/ai-access';
import { createAiTicketCoordinator } from '@/utils/ai-ticket-transaction';
import { resolveEntitlement } from '@/utils/entitlement';
import { resolveMonetizationVisibility } from '@/utils/monetization-visibility';
import type { TrainerUsageState } from '@/types/ads';

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

function memoryCoordinator(initialTickets: number, failWrites = false) {
  let state: TrainerUsageState = { rewardedPtUsesRemaining: initialTickets };
  let writes = 0;
  const coordinator = createAiTicketCoordinator({
    async read() {
      return { ...state };
    },
    async write(next) {
      if (failWrites) throw new Error('storage failed');
      writes += 1;
      state = { ...next };
    },
  });
  return {
    coordinator,
    state: () => ({ ...state }),
    writes: () => writes,
  };
}

// ── Free remote AI: reserve → success commit / failure release ─────────────
{
  const memory = memoryCoordinator(1);
  const result = await runAiAccessTransaction({
    premium: false,
    aiConnected: true,
    reserve: memory.coordinator.reserve,
    commit: memory.coordinator.commit,
    release: memory.coordinator.release,
    send: async () => 'answer',
  });
  expect('free AI 성공은 응답을 반환한다', result.allowed && result.value === 'answer');
  expect('free AI 성공은 ticket을 정확히 1 감소시킨다', memory.state().rewardedPtUsesRemaining === 0);
  expect('free AI 성공은 ticket 저장을 정확히 한 번 한다', memory.writes() === 1);
  expect('free AI 성공 후 reservation이 남지 않는다', memory.coordinator.reservedCount() === 0);
}

for (const failure of ['network', 'HTTP', 'provider'] as const) {
  const memory = memoryCoordinator(1);
  let rejected = false;
  try {
    await runAiAccessTransaction({
      premium: false,
      aiConnected: true,
      reserve: memory.coordinator.reserve,
      commit: memory.coordinator.commit,
      release: memory.coordinator.release,
      send: async () => {
        throw new Error(failure);
      },
    });
  } catch {
    rejected = true;
  }
  expect(`free AI ${failure} 실패는 오류를 유지한다`, rejected);
  expect(`free AI ${failure} 실패는 ticket을 보존한다`, memory.state().rewardedPtUsesRemaining === 1);
  expect(`free AI ${failure} 실패는 reservation을 해제한다`, memory.coordinator.reservedCount() === 0);
}

// 하나의 ticket을 두 요청이 동시에 예약할 수 없다.
{
  const memory = memoryCoordinator(1);
  const [first, second] = await Promise.all([
    memory.coordinator.reserve(),
    memory.coordinator.reserve(),
  ]);
  expect('동시 요청에서 ticket 하나는 reservation 하나만 만든다', Boolean(first) && second === null);
  if (first) await memory.coordinator.release(first);
  expect('실패/취소 release 뒤 같은 ticket을 다시 예약할 수 있다', Boolean(await memory.coordinator.reserve()));
}

// 같은 reservation의 중복 commit/release는 ticket을 두 번 바꾸지 않는다.
{
  const memory = memoryCoordinator(2);
  const reservation = await memory.coordinator.reserve();
  const first = reservation ? await memory.coordinator.commit(reservation) : null;
  const duplicate = reservation ? await memory.coordinator.commit(reservation) : null;
  expect('첫 commit은 ticket 하나를 소비한다', first?.rewardedPtUsesRemaining === 1);
  expect('중복 commit은 거부된다', duplicate === null);
  expect('중복 commit으로 ticket이 추가 감소하지 않는다', memory.state().rewardedPtUsesRemaining === 1);
}

// AI 응답은 왔지만 ticket 저장이 실패하면 답변을 성공 처리하지 않는다.
{
  const memory = memoryCoordinator(1, true);
  let rejected = false;
  try {
    await runAiAccessTransaction({
      premium: false,
      aiConnected: true,
      reserve: memory.coordinator.reserve,
      commit: memory.coordinator.commit,
      release: memory.coordinator.release,
      send: async () => 'answer',
    });
  } catch {
    rejected = true;
  }
  expect('ticket commit 저장 실패는 AI 성공으로 반환하지 않는다', rejected);
  expect('ticket commit 저장 실패는 기존 ticket을 보존한다', memory.state().rewardedPtUsesRemaining === 1);
  expect('ticket commit 저장 실패도 reservation을 정리한다', memory.coordinator.reservedCount() === 0);
}

// Premium과 offline/local PT는 광고 ticket 상품이 아니다.
for (const input of [
  { name: 'premium 성공', premium: true, aiConnected: true, fail: false },
  { name: 'premium 실패', premium: true, aiConnected: true, fail: true },
  { name: 'offline PT 성공', premium: false, aiConnected: false, fail: false },
] as const) {
  const memory = memoryCoordinator(1);
  let rejected = false;
  try {
    await runAiAccessTransaction({
      premium: input.premium,
      aiConnected: input.aiConnected,
      reserve: memory.coordinator.reserve,
      commit: memory.coordinator.commit,
      release: memory.coordinator.release,
      send: async () => {
        if (input.fail) throw new Error('failed');
        return 'answer';
      },
    });
  } catch {
    rejected = true;
  }
  expect(`${input.name}은 원래 성공/실패 결과를 유지한다`, rejected === input.fail);
  expect(`${input.name}은 ticket을 소비하지 않는다`, memory.state().rewardedPtUsesRemaining === 1);
  expect(`${input.name}은 reservation을 만들지 않는다`, memory.coordinator.reservedCount() === 0);
}

{
  const memory = memoryCoordinator(0);
  const result = await runAiAccessTransaction({
    premium: false,
    aiConnected: true,
    reserve: memory.coordinator.reserve,
    commit: memory.coordinator.commit,
    release: memory.coordinator.release,
    send: async () => 'must-not-run',
  });
  expect('ticket 0 free는 remote premium AI 접근이 거부된다', !result.allowed);
  expect('ticket 0 free 거부는 저장을 만들지 않는다', memory.writes() === 0);
}

{
  const gate = createAiRequestGate();
  let sends = 0;
  let resolveRequest!: (value: string) => void;
  const operation = () => {
    sends += 1;
    return new Promise<string>((resolve) => {
      resolveRequest = resolve;
    });
  };
  const first = gate.run(operation);
  const duplicate = gate.run(operation);
  expect('빠른 중복 submit은 AI 요청을 한 번만 시작한다', sends === 1);
  expect('빠른 중복 submit은 같은 in-flight 결과를 공유한다', first === duplicate);
  resolveRequest('answer');
  expect('공유된 중복 submit 결과가 동일하다', (await first) === (await duplicate));
  expect('완료 후 in-flight gate가 정리된다', !gate.isRunning());
}

// production에서는 실제 provider/혜택 없는 UI를 숨기고 DEV 검증 경로만 유지한다.
{
  const production = resolveMonetizationVisibility(false);
  const development = resolveMonetizationVisibility(true);
  expect('production은 mock referral을 노출하지 않는다', !production.referral);
  expect('production은 fake open event pass를 노출하지 않는다', !production.openEventPass);
  expect('DEV는 referral 검증 경로를 유지한다', development.referral);
  expect('DEV는 open event 검증 경로를 유지한다', development.openEventPass);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
