import type { EntitlementCapabilities, EntitlementProvider, EntitlementTier } from '@/types/entitlement';

/**
 * 등급 ↔ 기능 권한 표. 화면이 `tier === 'premium'`을 직접 비교하지 않게 하려고 있다 —
 * 나중에 등급이 늘어나도 바뀌는 곳은 이 표 하나다.
 *
 * **가격은 여기 없다.** 가격/통화/상품명은 스토어 product metadata가 원본이고, 코드에 박으면
 * 지역별 가격·환율·프로모션과 즉시 어긋난다. 이 저장소는 상품 id조차 아직 정의하지 않는다.
 */
export const EntitlementConfig = {
  capabilities: {
    free: { aiPtWithoutAd: false, adsEnabled: true },
    premium: { aiPtWithoutAd: true, adsEnabled: false },
  } satisfies Record<EntitlementTier, EntitlementCapabilities>,

  /**
   * production에서 권리를 인정하는 provider. 여기 없는 provider의 기록은 **무시된다** —
   * 개발용 어댑터가 만든 문서를 릴리스 빌드에 들고 가도 premium이 되지 않는다.
   */
  trustedProviders: ['play', 'appstore'] as readonly EntitlementProvider[],
} as const;
