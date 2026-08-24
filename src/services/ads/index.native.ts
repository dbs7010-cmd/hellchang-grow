import {
  resolvePublicAppEnvironment,
  resolveRewardedAdRuntimeConfig,
} from '@/config/rewarded-ads';
import { GoogleMobileAdsPort } from '@/services/ads/google-mobile-ads-port.native';
import { GoogleRewardedAdService } from '@/services/ads/google-rewarded-ad-service';
import { MockRewardedAdService } from '@/services/ads/mock-rewarded-ad-service';
import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import { UnavailableRewardedAdService } from '@/services/ads/unavailable-rewarded-ad-service';

export function resolveNativeRewardedAdService(input: {
  isDev: boolean;
  environment?: string;
  productionAdUnitId?: string;
}): RewardedAdService {
  if (input.isDev) return new MockRewardedAdService();
  const config = resolveRewardedAdRuntimeConfig({
    environment: resolvePublicAppEnvironment(input.environment),
    productionAdUnitId: input.productionAdUnitId,
  });
  if (!config.enabled || !config.adUnitId) return new UnavailableRewardedAdService();
  return new GoogleRewardedAdService(new GoogleMobileAdsPort(config.adUnitId), true);
}

const isDevBuild = typeof __DEV__ !== 'undefined' && __DEV__;
export const rewardedAdService = resolveNativeRewardedAdService({
  isDev: isDevBuild,
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  productionAdUnitId: process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID,
});
