import { EntitlementConfig } from '@/config/entitlements';
import { FreeEntitlement, type EntitlementProvider } from '@/types/entitlement';
import type { SubscriptionState } from '@/types/subscription';
import {
  entitlementCapabilities,
  isPremium,
  resolveEntitlement,
  sanitizeSubscriptionRecord,
} from '@/utils/entitlement';

/**
 * ENTITLEMENT FOUNDATION 검증.
 *
 * 여기서 확인하는 것은 "유료 여부가 한 곳에서, 결정적으로, 안전한 방향으로 정해지는가"다.
 * 결제는 검증하지 않는다 — 아직 결제가 없기 때문이다.
 */

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const NOW = Date.parse('2026-08-23T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const record = (input: Partial<SubscriptionState> = {}): SubscriptionState => ({
  status: 'active',
  tierId: 'pro',
  startedAt: iso(NOW - 24 * HOUR),
  expiresAt: iso(NOW + 24 * HOUR),
  provider: 'play',
  ...input,
});

const resolveProd = (subscription: unknown, nowMs = NOW) =>
  resolveEntitlement({ subscription, nowMs, allowDevProvider: false });
const resolveDev = (subscription: unknown, nowMs = NOW) =>
  resolveEntitlement({ subscription, nowMs, allowDevProvider: true });

// ── 1. 기록이 없으면 free ───────────────────────────────────────────────────
{
  const none = resolveProd(null);
  expect('기록이 없으면 free', none.tier === 'free');
  expect('기록이 없으면 reason=no_record', none.reason === 'no_record');
  expect('undefined 기록도 free', resolveProd(undefined).tier === 'free');
  expect('기본값 FreeEntitlement도 free', FreeEntitlement.tier === 'free');
  expect("status:'none'이면 free", resolveProd(record({ status: 'none' })).tier === 'free');
}

// ── 2. 유효한 스토어 구독은 premium ────────────────────────────────────────
{
  const play = resolveProd(record({ provider: 'play' }));
  expect('유효한 play 구독은 premium', play.tier === 'premium');
  expect('premium이면 reason=active', play.reason === 'active');
  expect('provider가 그대로 보존된다', play.provider === 'play');
  expect('만료 시각이 ms로 노출된다', play.expiresAtMs === NOW + 24 * HOUR);
  expect('isPremium이 같은 답을 준다', isPremium(play));
  expect('appstore도 신뢰한다', resolveProd(record({ provider: 'appstore' })).tier === 'premium');
}

// ── 3. 만료는 반드시 지켜진다 ──────────────────────────────────────────────
{
  const expired = resolveProd(record({ expiresAt: iso(NOW - 1) }));
  expect("status가 'active'여도 만료 시각이 지났으면 free", expired.tier === 'free');
  expect('만료 사유가 expired로 남는다', expired.reason === 'expired');
  expect('경계(만료 == 현재)는 만료로 본다', resolveProd(record({ expiresAt: iso(NOW) })).tier === 'free');
  expect('1ms 남았으면 아직 premium', resolveProd(record({ expiresAt: iso(NOW + 1) })).tier === 'premium');
  expect("status:'expired'는 무조건 free", resolveProd(record({ status: 'expired' })).tier === 'free');
  // 시간이 흐르면 같은 문서의 답이 바뀐다 — 로컬 문서가 영구 권리가 되지 않는다.
  const doc = record();
  expect('같은 문서도 만료 후에는 free', resolveProd(doc, NOW + 48 * HOUR).tier === 'free');
  expect('같은 문서가 만료 전에는 premium', resolveProd(doc, NOW).tier === 'premium');
}

// ── 4. 손상/조작된 문서는 권리를 만들지 못한다 ─────────────────────────────
{
  expect('만료 시각이 없는 active는 free', resolveProd({ status: 'active', provider: 'play' }).tier === 'free');
  expect(
    '만료 시각이 없는 active의 사유는 corrupt',
    resolveProd({ status: 'active', provider: 'play' }).reason === 'corrupt'
  );
  expect('파싱 불가능한 만료 시각은 free', resolveProd(record({ expiresAt: 'tomorrow' })).tier === 'free');
  expect('문자열 문서는 free', resolveProd('premium').tier === 'free');
  expect('배열 문서는 free', resolveProd([{ status: 'active' }]).tier === 'free');
  expect('숫자 문서는 free', resolveProd(42).tier === 'free');
  expect('모르는 status는 free', resolveProd(record({ status: 'PREMIUM' as never })).tier === 'free');
  expect('nowMs가 NaN이면 free', resolveProd(record(), Number.NaN).tier === 'free');
  expect('nowMs가 Infinity면 free', resolveProd(record(), Number.POSITIVE_INFINITY).tier === 'free');
}

// ── 5. DEV 우회는 production으로 새지 않는다 ───────────────────────────────
{
  const devDoc = record({ provider: 'dev' });
  expect('dev 기록은 개발 빌드에서 premium', resolveDev(devDoc).tier === 'premium');
  expect('dev 기록은 출시 빌드에서 free', resolveProd(devDoc).tier === 'free');
  expect('출시 빌드 거부 사유는 untrusted_provider', resolveProd(devDoc).reason === 'untrusted_provider');
  expect(
    '출처 없는 옛 문서는 개발 빌드에서도 free',
    resolveDev({ status: 'active', expiresAt: iso(NOW + HOUR) }).tier === 'free'
  );
  expect(
    '출처 없는 옛 문서는 출시 빌드에서도 free',
    resolveProd({ status: 'active', expiresAt: iso(NOW + HOUR) }).tier === 'free'
  );
  expect(
    '모르는 provider 문자열은 free',
    resolveDev(record({ provider: 'hacked' as EntitlementProvider })).tier === 'free'
  );
  expect(
    'dev 우회를 켜도 만료는 여전히 적용된다',
    resolveDev(record({ provider: 'dev', expiresAt: iso(NOW - 1) })).tier === 'free'
  );
  expect('신뢰 provider 목록은 실제 스토어 둘뿐', EntitlementConfig.trustedProviders.length === 2);
  expect("신뢰 목록에 'dev'가 없다", !EntitlementConfig.trustedProviders.includes('dev'));
}

// ── 6. capability는 등급에서만 나온다 ──────────────────────────────────────
{
  const premium = entitlementCapabilities(resolveProd(record()));
  const free = entitlementCapabilities(resolveProd(null));
  expect('premium은 광고 없이 AI PT', premium.aiPtWithoutAd);
  expect('premium은 광고를 보지 않는다', !premium.adsEnabled);
  expect('free는 광고 없이 AI PT 불가', !free.aiPtWithoutAd);
  expect('free는 광고가 켜진다', free.adsEnabled);
  expect(
    'capability는 등급 두 개에만 정의된다',
    Object.keys(EntitlementConfig.capabilities).sort().join(',') === 'free,premium'
  );
  // 실제로 존재하지 않는 기능을 위한 boolean을 늘어놓지 않는다.
  expect(
    'capability는 실제 존재하는 기능 둘뿐',
    Object.keys(EntitlementConfig.capabilities.free).sort().join(',') === 'adsEnabled,aiPtWithoutAd'
  );
}

// ── 7. 결정적이고 순수하다 ─────────────────────────────────────────────────
{
  const doc = record();
  const a = resolveProd(doc);
  const b = resolveProd(doc);
  expect('같은 입력이면 같은 결과', JSON.stringify(a) === JSON.stringify(b));

  const frozen = Object.freeze(record());
  resolveProd(frozen);
  expect('입력 문서를 변형하지 않는다', frozen.status === 'active' && frozen.provider === 'play');

  const realNow = Date.now;
  const realRandom = Math.random;
  Date.now = () => {
    throw new Error('resolver는 시계를 읽지 않는다');
  };
  Math.random = () => {
    throw new Error('resolver는 난수를 쓰지 않는다');
  };
  let clean = true;
  try {
    resolveProd(record());
    resolveDev(record({ provider: 'dev' }));
    sanitizeSubscriptionRecord(record());
  } catch {
    clean = false;
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
  }
  expect('Date.now / Math.random을 쓰지 않는다', clean);
}

// ── 8. sanitize는 모르는 값을 지어내지 않는다 ──────────────────────────────
{
  const cleaned = sanitizeSubscriptionRecord({
    status: 'active',
    tierId: 'pro',
    expiresAt: 'not-a-date',
    provider: 'dev',
    junk: 'x',
  });
  expect('읽을 수 없는 만료 시각은 빼 버린다', cleaned.expiresAt === undefined);
  expect('모르는 필드는 남기지 않는다', !('junk' in cleaned));
  expect('읽을 수 있는 값은 보존한다', cleaned.tierId === 'pro' && cleaned.provider === 'dev');
  expect('비어 있는 문서는 none으로', sanitizeSubscriptionRecord({}).status === 'none');
  expect('null은 none으로', sanitizeSubscriptionRecord(null).status === 'none');
  expect(
    'lastVerifiedAt은 파싱 가능할 때만 남는다',
    sanitizeSubscriptionRecord({ status: 'none', lastVerifiedAt: 'x' }).lastVerifiedAt === undefined
  );
  expect(
    'lastVerifiedAt이 결과에 노출된다',
    resolveProd(record({ lastVerifiedAt: iso(NOW - HOUR) })).lastVerifiedAtMs === NOW - HOUR
  );
  expect('검증 기록이 없으면 null로 남는다 (지어내지 않는다)', resolveProd(record()).lastVerifiedAtMs === null);
}

// ── 9. entitlement는 게임 재화/성장과 무관하다 ─────────────────────────────
{
  // 이 모듈이 아는 것은 구독 기록뿐이다. Battle / Growth / Workout을 import하지 않는다.
  const premium = resolveProd(record());
  const keys = Object.keys(premium).sort().join(',');
  expect('entitlement 결과에 재화/성장 필드가 없다', keys === 'expiresAtMs,lastVerifiedAtMs,provider,reason,tier');
  const caps = entitlementCapabilities(premium);
  expect(
    'capability에 coins/damage/stage/SP가 없다',
    !Object.keys(caps).some((key) => /coin|damage|stage|sp|fatigue|token|growth/i.test(key))
  );
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
