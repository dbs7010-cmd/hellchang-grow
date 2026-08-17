import { AppConfig } from '@/config/app-config';
import { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import { RewardedAdResult } from '@/types/ads';

export class MockRewardedAdService implements RewardedAdService {
  async isAdReady(): Promise<boolean> {
    return true;
  }

  async showRewardedAd(): Promise<RewardedAdResult> {
    return { granted: true, rewardUnits: AppConfig.rewardedPtUses };
  }
}

export const rewardedAdService: RewardedAdService = new MockRewardedAdService();
