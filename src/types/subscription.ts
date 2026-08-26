import type { EntitlementProvider } from '@/types/entitlement';

export type SubscriptionStatus = 'none' | 'active' | 'expired';

/**
 * provider가 마지막으로 알려준 구독 기록 **그대로**다. 이 값을 그대로 믿고 화면을 잠그거나
 * 열지 않는다 — 현재 시각과 신뢰 정책을 통과시킨 결과(`EntitlementState`)를 쓴다
 * (`src/utils/entitlement.ts`).
 */
export interface SubscriptionState {
  status: SubscriptionStatus;
  tierId?: string;
  startedAt?: string;
  expiresAt?: string;
  /**
   * 이 기록을 만든 주체. 없으면 출처를 모르는 기록이므로 production에서 신뢰하지 않는다.
   * (이 필드가 생기기 전에 저장된 문서가 여기 해당한다.)
   */
  provider?: EntitlementProvider;
  /** provider가 마지막으로 이 기록을 확인해 준 시각(ISO). 실제 SDK 연동 슬라이스가 채운다. */
  lastVerifiedAt?: string;
}
