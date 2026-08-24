import type { NativeRewardedAdPort } from '@/services/ads/google-rewarded-ad-service';

interface RewardedInstance {
  addAdEventListener(type: string, listener: () => void): () => void;
  load(): void;
  show(): Promise<void>;
}

interface GoogleMobileAdsModule {
  default(): { initialize(): Promise<unknown> };
  AdEventType: { CLOSED: string; ERROR: string };
  RewardedAdEventType: { EARNED_REWARD: string; LOADED: string };
  AdsConsent: { gatherConsent(): Promise<{ canRequestAds: boolean }> };
  RewardedAd: {
    createForAdRequest(
      id: string,
      options?: { requestNonPersonalizedAdsOnly?: boolean }
    ): RewardedInstance;
  };
}

declare const require: (moduleId: 'react-native-google-mobile-ads') => GoogleMobileAdsModule;
// Metro resolves this literal to the native dependency installed by EAS; web never imports .native.ts.
const { default: mobileAds, AdEventType, AdsConsent, RewardedAd, RewardedAdEventType } =
  require('react-native-google-mobile-ads');

/** UMP 동의가 광고 요청을 허용한 뒤에만 SDK를 초기화하고 rewarded ad를 load한다. */
export class GoogleMobileAdsPort implements NativeRewardedAdPort {
  private initialized = false;
  private rewarded: RewardedInstance | null = null;
  private loaded = false;

  private readonly adUnitId: string;

  constructor(adUnitId: string) {
    this.adUnitId = adUnitId;
  }

  async prepare(): Promise<boolean> {
    const consent = await AdsConsent.gatherConsent();
    if (!consent.canRequestAds) return false;
    if (!this.initialized) {
      await mobileAds().initialize();
      this.initialized = true;
    }
    if (this.loaded && this.rewarded) return true;
    return this.load();
  }

  async show(): Promise<'earned' | 'closed' | 'error'> {
    const rewarded = this.rewarded;
    if (!rewarded || !this.loaded) return 'error';
    this.loaded = false;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (outcome: 'earned' | 'closed' | 'error') => {
        if (settled) return;
        settled = true;
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.rewarded = null;
        resolve(outcome);
      };
      const unsubscribers = [
        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          finish('earned');
        }),
        rewarded.addAdEventListener(AdEventType.CLOSED, () => finish('closed')),
        rewarded.addAdEventListener(AdEventType.ERROR, () => finish('error')),
      ];
      rewarded.show().catch(() => finish('error'));
    });
  }

  private async load(): Promise<boolean> {
    const rewarded = RewardedAd.createForAdRequest(this.adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    this.rewarded = rewarded;
    return new Promise((resolve) => {
      const cleanups: (() => void)[] = [];
      const finish = (loaded: boolean) => {
        cleanups.forEach((cleanup) => cleanup());
        this.loaded = loaded;
        resolve(loaded);
      };
      cleanups.push(rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => finish(true)));
      cleanups.push(rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false)));
      rewarded.load();
    });
  }
}
