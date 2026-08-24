import { AppConfig } from '@/config/app-config';
import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { RewardedAdResult } from '@/types/ads';

/**
 * 개발용 보상형 광고 어댑터 — **개발 빌드에서만 존재한다.**
 *
 * 광고를 재생하지 않고 곧바로 보상을 준다. 개발 중에 AI PT 화면을 열어 보기 위한 것이고,
 * 출시 빌드에서는 이 어댑터가 선택되지 않는다(`services/ads/index.ts`).
 */
export class MockRewardedAdService implements RewardedAdService {
  readonly isProviderAvailable = true;

  async isAdReady(): Promise<boolean> {
    return true;
  }

  async showRewardedAd(): Promise<RewardedAdResult> {
    return { granted: true, rewardUnits: AppConfig.rewardedPtUses };
  }
}
