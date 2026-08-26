import { AppConfig } from '@/config/app-config';
import { MockRewardedAdService } from '@/services/ads/mock-rewarded-ad-service';
import { selectRewardedAdService } from '@/services/ads/select-rewarded-ad-service';
import { UnavailableRewardedAdService } from '@/services/ads/unavailable-rewarded-ad-service';
import type { RewardedAdResult, TrainerUsageState } from '@/types/ads';
import { resolveRewardedAdGrant } from '@/utils/ad-reward';
import { entitlementCapabilities, resolveEntitlement } from '@/utils/entitlement';

/**
 * MONETIZATION 경계 검증 (FAILURE_LOG의 FAIL-007).
 *
 * 확인하는 것은 "광고를 실제로 보지 않았는데 유료 기능이 열리는 경로가 있는가"다.
 * 결제와 광고 SDK는 아직 없다 — 그래서 여기서 검증하는 것은 어댑터 선택 규칙과 보상 게이트,
 * 그리고 광고가 등급(entitlement)을 만들지 못한다는 경계다.
 */

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const NOW = Date.parse('2026-08-25T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

// 1. 빌드별 어댑터 선택
{
  const dev = selectRewardedAdService(true);
  const prod = selectRewardedAdService(false);
  expect('개발 빌드는 mock 어댑터', dev instanceof MockRewardedAdService);
  expect('출시 빌드는 unavailable 어댑터', prod instanceof UnavailableRewardedAdService);
  expect('출시 빌드에 mock이 선택되는 경로가 없다', !(prod instanceof MockRewardedAdService));
  expect('선택 규칙은 시계나 난수를 보지 않는다 (같은 입력이면 같은 종류)',
    selectRewardedAdService(false).constructor === prod.constructor);
}

// 2. unavailable 어댑터는 아무것도 주지 않는다
{
  const prod = new UnavailableRewardedAdService();
  expect('provider가 없다고 정직하게 알린다', prod.isProviderAvailable === false);

  const ready = await prod.isAdReady();
  expect('보여줄 광고가 없다', ready === false);

  const result = await prod.showRewardedAd();
  expect('보상이 승인되지 않는다', result.granted === false);
  expect('보상 단위가 0이다', result.rewardUnits === 0);
  expect('그 결과로는 이용권이 나가지 않는다', !resolveRewardedAdGrant(result).granted);
}

// 3. mock 어댑터는 개발 빌드에서만 의미가 있다
{
  const dev = new MockRewardedAdService();
  expect('mock은 provider가 있다고 알린다', dev.isProviderAvailable === true);
  const result = await dev.showRewardedAd();
  expect('mock은 보상을 승인한다', result.granted === true);
  expect('보상 단위는 config에서 온다', result.rewardUnits === AppConfig.rewardedPtUses);
  expect('config 보상 단위는 1 이상이다 (0이면 승인해도 무의미)', AppConfig.rewardedPtUses > 0);
  expect('그 결과는 이용권으로 이어진다', resolveRewardedAdGrant(result).granted);
}

// 4. 보상 게이트: 승인 + 유효 단위일 때만 이용권
{
  const grant = (input: RewardedAdResult | null | undefined) => resolveRewardedAdGrant(input);

  expect('승인 + 1단위면 보상', grant({ granted: true, rewardUnits: 1 }).granted);
  expect('승인 단위가 그대로 전달된다', grant({ granted: true, rewardUnits: 3 }).rewardUnits === 3);

  expect('미승인이면 보상 없음', !grant({ granted: false, rewardUnits: 5 }).granted);
  expect('미승인이면 단위도 0', grant({ granted: false, rewardUnits: 5 }).rewardUnits === 0);

  expect('rewardUnits가 0이면 보상 없음', !grant({ granted: true, rewardUnits: 0 }).granted);
  expect('rewardUnits가 음수면 보상 없음', !grant({ granted: true, rewardUnits: -3 }).granted);
  expect('rewardUnits가 NaN이면 보상 없음', !grant({ granted: true, rewardUnits: NaN }).granted);
  expect('rewardUnits가 Infinity면 보상 없음', !grant({ granted: true, rewardUnits: Infinity }).granted);
  expect('소수 단위는 내림', grant({ granted: true, rewardUnits: 2.7 }).rewardUnits === 2);
  expect('1 미만 소수는 보상 없음', !grant({ granted: true, rewardUnits: 0.5 }).granted);

  // SDK 실패/예외로 결과 자체가 없는 경우 (context의 catch 경로가 넘기는 값)
  expect('결과가 없으면(SDK 실패) 보상 없음', !grant(null).granted);
  expect('undefined도 보상 없음', !grant(undefined).granted);
  expect('실패는 단위도 0', grant(null).rewardUnits === 0);
}

// 5. 광고는 이용권만 만든다 — 등급(entitlement)을 만들지 않는다
{
  const grant = resolveRewardedAdGrant({ granted: true, rewardUnits: 2 });
  const keys = Object.keys(grant).sort().join(',');
  expect('보상 결과에는 이용권 정보만 있다', keys === 'granted,rewardUnits');
  expect(
    '보상 결과에 tier/구독/권한 필드가 없다',
    !/tier|premium|subscription|capability|entitlement/i.test(JSON.stringify(grant))
  );

  // 광고를 아무리 봐도 구독 기록이 없으면 등급은 free다
  const afterAds = resolveEntitlement({ subscription: null, nowMs: NOW, allowDevProvider: false });
  expect('광고를 봐도 구독 기록이 없으면 free', afterAds.tier === 'free');
  expect('free는 광고 없이 AI PT를 쓰지 못한다', entitlementCapabilities(afterAds).aiPtWithoutAd === false);

  // 이용권은 사용량 상태에만 쌓인다
  const usage: TrainerUsageState = { rewardedPtUsesRemaining: 0 };
  const granted: TrainerUsageState = {
    rewardedPtUsesRemaining: usage.rewardedPtUsesRemaining + grant.rewardUnits,
  };
  expect('승인된 만큼만 이용권이 는다', granted.rewardedPtUsesRemaining === 2);

  const denied = resolveRewardedAdGrant({ granted: false, rewardUnits: 9 });
  const afterDenied: TrainerUsageState = {
    rewardedPtUsesRemaining: usage.rewardedPtUsesRemaining + denied.rewardUnits,
  };
  expect('광고 실패 시 이용권은 그대로', afterDenied.rewardedPtUsesRemaining === 0);
}

// 6. 출시 빌드는 dev provider 기록을 신뢰하지 않는다
{
  const devRecord = {
    status: 'active' as const,
    tierId: 'pro',
    startedAt: new Date(NOW - HOUR).toISOString(),
    expiresAt: new Date(NOW + HOUR).toISOString(),
    provider: 'dev' as const,
  };
  const prod = resolveEntitlement({ subscription: devRecord, nowMs: NOW, allowDevProvider: false });
  expect('production에서 dev 구독 기록은 free', prod.tier === 'free');
  expect('production에서 dev 기록으로 AI PT가 열리지 않는다', !entitlementCapabilities(prod).aiPtWithoutAd);

  const dev = resolveEntitlement({ subscription: devRecord, nowMs: NOW, allowDevProvider: true });
  expect('개발 빌드에서만 dev 기록이 인정된다', dev.tier === 'premium');

  const expired = resolveEntitlement({
    subscription: { ...devRecord, expiresAt: new Date(NOW - HOUR).toISOString() },
    nowMs: NOW,
    allowDevProvider: true,
  });
  expect('개발 빌드에서도 만료는 지켜진다', expired.tier === 'free');
}

// 7. 출시 빌드 전체 경로: 광고 버튼부터 등급까지
{
  const prod = selectRewardedAdService(false);
  const result = await prod.showRewardedAd();
  const grant = resolveRewardedAdGrant(result);
  const entitlement = resolveEntitlement({ subscription: null, nowMs: NOW, allowDevProvider: false });
  expect(
    '출시 빌드에서는 광고를 눌러도 이용권도 등급도 생기지 않는다',
    !grant.granted && grant.rewardUnits === 0 && entitlement.tier === 'free'
  );
  expect('화면이 광고 버튼을 내보내지 않을 근거가 있다', prod.isProviderAvailable === false);
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
