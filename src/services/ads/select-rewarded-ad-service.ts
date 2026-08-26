import { MockRewardedAdService } from '@/services/ads/mock-rewarded-ad-service';
import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import { UnavailableRewardedAdService } from '@/services/ads/unavailable-rewarded-ad-service';

/**
 * 어떤 광고 어댑터를 쓸지 정하는 규칙. **빌드 종류 하나만 보고 결정한다.**
 *
 * `__DEV__`를 여기서 읽지 않고 인자로 받는 이유는 이 규칙이 검증 대상이기 때문이다 —
 * 출시 빌드에 보상을 주는 어댑터가 없다는 사실을 매번 다시 확인할 수 있어야 한다
 * (`scripts/verify-monetization.ts`).
 */
export function selectRewardedAdService(isDevBuild: boolean): RewardedAdService {
  return isDevBuild ? new MockRewardedAdService() : new UnavailableRewardedAdService();
}
