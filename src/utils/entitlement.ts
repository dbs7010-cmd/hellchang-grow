import { EntitlementConfig } from '@/config/entitlements';
import {
  FreeEntitlement,
  type EntitlementCapabilities,
  type EntitlementProvider,
  type EntitlementReason,
  type EntitlementState,
} from '@/types/entitlement';
import type { SubscriptionState, SubscriptionStatus } from '@/types/subscription';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENTITLEMENT RESOLVER — 유료 여부를 판단하는 **유일한** 곳
 *
 * 화면마다 `subscription.status === 'active'`를 따로 쓰던 것을 대체한다. 화면이 저마다
 * 판단하면 한 화면은 열리고 다른 화면은 닫히는 상태가 언젠가 반드시 생긴다.
 *
 * ### 결제를 하지 않는다
 *
 * 이 파일에도, 이 슬라이스 어디에도 결제 SDK가 없다. **없는 결제를 있는 척 흉내 내지 않는다** —
 * "결제 성공" 버튼을 만드는 대신, 결제가 붙었을 때 결과를 받을 자리만 정의한다.
 *
 * ### 순수하고 결정적이다
 *
 * 시계를 읽지 않는다. `nowMs`는 호출부가 넘긴다. 같은 입력이면 언제나 같은 등급이 나온다.
 *
 * ### 로컬 문서만으로 영구 premium이 되지 않는다
 *
 * 저장된 값은 사용자가 손댈 수 있는 파일이다. 그래서 두 가지를 강제한다.
 *
 *  1. **만료 시각이 없으면 premium이 아니다.** `{ status: 'active' }` 하나만 적어 넣어도
 *     권리가 생기지 않는다. 유효한 미래 시각이 반드시 있어야 한다.
 *  2. **production에서는 실제 스토어 provider만 인정한다.** 개발용 어댑터가 쓴 문서
 *     (`provider: 'dev'`)도, 출처가 없는 옛 문서도 릴리스 빌드에서는 무시된다.
 *     개발용 우회가 production까지 따라갈 경로가 구조적으로 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SubscriptionStatuses: readonly SubscriptionStatus[] = ['none', 'active', 'expired'];
const EntitlementProviders: readonly EntitlementProvider[] = ['none', 'dev', 'play', 'appstore'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 저장소에서 읽은 임의의 값을 다룰 수 있는 기록으로 만든다.
 *
 * 모르는 것은 지어내지 않는다 — 읽을 수 없는 필드는 **빼고**, 상태를 판단할 수 없으면
 * `'none'`으로 떨어뜨린다. 손상된 문서가 권리를 만들어 내는 방향으로는 절대 기울지 않는다.
 */
export function sanitizeSubscriptionRecord(raw: unknown): SubscriptionState {
  if (!isRecord(raw)) return { status: 'none' };

  const status = SubscriptionStatuses.includes(raw.status as SubscriptionStatus)
    ? (raw.status as SubscriptionStatus)
    : 'none';

  const provider = EntitlementProviders.includes(raw.provider as EntitlementProvider)
    ? (raw.provider as EntitlementProvider)
    : undefined;

  const state: SubscriptionState = { status };
  if (typeof raw.tierId === 'string' && raw.tierId !== '') state.tierId = raw.tierId;
  if (readTimestamp(raw.startedAt) !== null) state.startedAt = raw.startedAt as string;
  if (readTimestamp(raw.expiresAt) !== null) state.expiresAt = raw.expiresAt as string;
  if (readTimestamp(raw.lastVerifiedAt) !== null) state.lastVerifiedAt = raw.lastVerifiedAt as string;
  if (provider) state.provider = provider;

  return state;
}

export interface ResolveEntitlementInput {
  /** provider가 마지막으로 알려준 기록. 저장소에서 읽은 날것을 그대로 넘겨도 된다. */
  subscription: unknown;
  /** 판단 기준 시각. 도메인은 시계를 읽지 않는다. */
  nowMs: number;
  /**
   * 실제 스토어가 아닌 provider를 인정할지. **호출부는 `__DEV__`만 넘긴다.**
   * 이 값이 false면 개발용 기록은 존재하더라도 권리를 만들지 못한다.
   */
  allowDevProvider: boolean;
}

/** 지금 이 사용자가 무엇을 쓸 수 있는지 판단한다. 이 결과가 앱 전체의 유일한 근거다. */
export function resolveEntitlement({
  subscription,
  nowMs,
  allowDevProvider,
}: ResolveEntitlementInput): EntitlementState {
  const record = sanitizeSubscriptionRecord(subscription);
  const provider = record.provider ?? 'none';
  const expiresAtMs = readTimestamp(record.expiresAt);
  const lastVerifiedAtMs = readTimestamp(record.lastVerifiedAt);

  const free = (reason: EntitlementReason): EntitlementState => ({
    tier: 'free',
    provider,
    reason,
    expiresAtMs,
    lastVerifiedAtMs,
  });

  if (record.status === 'none') return provider === 'none' ? FreeEntitlement : free('no_record');
  if (record.status === 'expired') return free('expired');

  // 여기부터 status === 'active'.

  // 만료 시각이 없는 'active'는 신뢰하지 않는다 — 로컬 문서 한 줄로 영구 premium이 되는 길을 막는다.
  if (expiresAtMs === null) return free('corrupt');
  if (!Number.isFinite(nowMs)) return free('corrupt');
  if (expiresAtMs <= nowMs) return free('expired');

  // 출처를 모르는 기록은 개발 빌드에서도 신뢰하지 않는다. 개발용 기록은 개발 빌드에서만 통한다.
  const trusted =
    EntitlementConfig.trustedProviders.includes(provider) || (provider === 'dev' && allowDevProvider);
  if (!trusted) return free('untrusted_provider');

  return { tier: 'premium', provider, reason: 'active', expiresAtMs, lastVerifiedAtMs };
}

/** 등급에서 기능 권한을 편다. 화면은 `tier`를 비교하지 않고 이 boolean을 읽는다. */
export function entitlementCapabilities(entitlement: EntitlementState): EntitlementCapabilities {
  return EntitlementConfig.capabilities[entitlement.tier] ?? EntitlementConfig.capabilities.free;
}

export function isPremium(entitlement: EntitlementState): boolean {
  return entitlement.tier === 'premium';
}
