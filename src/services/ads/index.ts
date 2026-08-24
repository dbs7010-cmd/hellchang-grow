import { MockRewardedAdService } from '@/services/ads/mock-rewarded-ad-service';
import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import { UnavailableRewardedAdService } from '@/services/ads/unavailable-rewarded-ad-service';

/** 빌드 종류에 맞는 광고 provider를 고른다. 실제 광고 SDK가 없는 release는 보상을 주지 않는다. */
export function resolveRewardedAdService(isDev: boolean): RewardedAdService {
  return isDev ? new MockRewardedAdService() : new UnavailableRewardedAdService();
}

const isDevBuild = typeof __DEV__ !== 'undefined' && __DEV__;

export const rewardedAdService: RewardedAdService = resolveRewardedAdService(isDevBuild);
