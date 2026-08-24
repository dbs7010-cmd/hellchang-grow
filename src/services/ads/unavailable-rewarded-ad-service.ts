import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { RewardedAdResult } from '@/types/ads';

/**
 * 광고 SDK가 연결되지 않은 빌드에서 쓰는 어댑터 — **보상을 주지 않는다.**
 *
 * 여기가 이 파일의 요점이다. 광고를 틀 수 없는데 "광고를 본 것"으로 처리하면,
 * 사용자는 버튼 한 번으로 유료 기능 이용권을 공짜로 얻는다. 그래서 연결되지 않았다는
 * 사실을 그대로 돌려준다 — 없는 것을 있는 척하지 않는다.
 *
 * 실제 AdMob이 붙으면 이 자리에 그 구현이 들어간다(`services/ads/index.ts`).
 */
export class UnavailableRewardedAdService implements RewardedAdService {
  readonly isProviderAvailable = false;

  async isAdReady(): Promise<boolean> {
    return false;
  }

  async showRewardedAd(): Promise<RewardedAdResult> {
    return { granted: false, rewardUnits: 0 };
  }
}
