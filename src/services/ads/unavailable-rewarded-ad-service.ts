import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { RewardedAdResult } from '@/types/ads';

/** 실제 광고 SDK가 연결되지 않은 빌드에서는 광고도 보상도 제공하지 않는다. */
export class UnavailableRewardedAdService implements RewardedAdService {
  readonly isProviderAvailable = false;

  async isAdReady(): Promise<boolean> {
    return false;
  }

  async showRewardedAd(): Promise<RewardedAdResult> {
    return { granted: false, rewardUnits: 0 };
  }
}
