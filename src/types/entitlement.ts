/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENTITLEMENT — "이 사용자가 지금 무엇을 쓸 수 있는가"에 대한 단 하나의 답
 *
 * `SubscriptionState`(provider가 마지막으로 알려준 기록)와 이것은 다른 것이다.
 * 기록은 원본이고, `EntitlementState`는 그 기록을 **현재 시각과 신뢰 정책에 통과시킨 결과**다.
 * 화면은 기록을 직접 읽고 판단하지 않는다 — 결과만 읽는다.
 *
 * 이 파일은 결제를 하지 않는다. 결제 SDK도, 가격도, 상품 id도 여기 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** V1의 등급은 둘뿐이다. 존재하지 않는 기능을 위한 등급을 미리 만들지 않는다. */
export type EntitlementTier = 'free' | 'premium';

/**
 * 이 권리가 어디서 왔는가.
 *
 *  - `play` / `appstore` — 실제 스토어. **production에서 신뢰하는 것은 이 둘뿐이다.**
 *  - `dev` — 개발용 어댑터. production에서는 무시된다(아래 `resolveEntitlement`).
 *  - `none` — 기록 없음.
 */
export type EntitlementProvider = 'none' | 'dev' | 'play' | 'appstore';

/** 왜 이 등급이 되었는가. 디버깅과 검증에 쓰이며, 사용자에게 그대로 보여주는 문구가 아니다. */
export type EntitlementReason =
  | 'no_record'
  /** 기록이 손상됐거나 만료 시각이 없다 — 신뢰하지 않는다. */
  | 'corrupt'
  | 'expired'
  /** 개발용 기록을 production에서 만난 경우. */
  | 'untrusted_provider'
  | 'active';

export interface EntitlementState {
  readonly tier: EntitlementTier;
  readonly provider: EntitlementProvider;
  readonly reason: EntitlementReason;
  /** 만료 시각(ms). 모르면 null이며, 이 경우 premium이 되지 않는다. */
  readonly expiresAtMs: number | null;
  /**
   * provider가 마지막으로 이 권리를 확인해 준 시각(ms). 아직 실제 SDK가 없어 항상 null이다.
   * 서버/스토어 재검증을 붙이는 슬라이스가 이 값을 채우고 staleness 정책을 얹는다.
   */
  readonly lastVerifiedAtMs: number | null;
}

/**
 * 등급에서 파생되는 기능 권한. **실제로 코드에 존재하는 기능만 여기 있다** —
 * 아직 만들지 않은 기능을 위한 boolean을 미리 늘어놓지 않는다.
 */
export interface EntitlementCapabilities {
  /** 광고를 보지 않고 AI PT를 이용할 수 있는가. */
  readonly aiPtWithoutAd: boolean;
  /** 광고를 노출하는가. */
  readonly adsEnabled: boolean;
}

/** 아무 근거도 없을 때의 값. 판단이 불가능하면 항상 여기로 떨어진다. */
export const FreeEntitlement: EntitlementState = {
  tier: 'free',
  provider: 'none',
  reason: 'no_record',
  expiresAtMs: null,
  lastVerifiedAtMs: null,
};
