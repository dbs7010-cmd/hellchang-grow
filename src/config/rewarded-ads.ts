export type PublicAppEnvironment = 'development' | 'preview' | 'production';

/** Google의 공식 Android rewarded test unit. production에서는 절대 선택하지 않는다. */
export const GoogleAndroidRewardedTestUnitId = 'ca-app-pub-3940256099942544/5224354917';

export interface RewardedAdRuntimeConfig {
  enabled: boolean;
  adUnitId: string | null;
  testMode: boolean;
}

export function resolvePublicAppEnvironment(value: string | undefined): PublicAppEnvironment {
  if (value === 'production' || value === 'preview') return value;
  return 'development';
}

/**
 * 개발/preview는 Google 공식 test unit만 사용한다. production은 외부에서 실제 unit이
 * 주입된 경우에만 활성화한다. 값이 없으면 광고/보상 모두 fail closed다.
 */
export function resolveRewardedAdRuntimeConfig(input: {
  environment: PublicAppEnvironment;
  productionAdUnitId?: string;
}): RewardedAdRuntimeConfig {
  if (input.environment !== 'production') {
    return { enabled: true, adUnitId: GoogleAndroidRewardedTestUnitId, testMode: true };
  }
  const adUnitId = input.productionAdUnitId?.trim() ?? '';
  return adUnitId
    ? { enabled: true, adUnitId, testMode: false }
    : { enabled: false, adUnitId: null, testMode: false };
}
