import { RewardedAdResult } from '@/types/ads';

/** 실제 AdMob 등 SDK로 교체할 때 이 인터페이스만 구현하면 된다. */
export interface RewardedAdService {
  isAdReady(): Promise<boolean>;
  showRewardedAd(): Promise<RewardedAdResult>;
}
