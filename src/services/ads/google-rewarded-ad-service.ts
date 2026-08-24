import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import type { RewardedAdResult } from '@/types/ads';

export interface NativeRewardedAdPort {
  prepare(): Promise<boolean>;
  show(): Promise<'earned' | 'closed' | 'error'>;
}

/** Native SDK 결과를 기존 앱 계약으로 좁힌다. earned 이외에는 보상이 없으며 동시 호출은 하나만 수행한다. */
export class GoogleRewardedAdService implements RewardedAdService {
  readonly isProviderAvailable: boolean;
  private inFlight: Promise<RewardedAdResult> | null = null;
  private readonly port: NativeRewardedAdPort;

  constructor(port: NativeRewardedAdPort, enabled: boolean) {
    this.port = port;
    this.isProviderAvailable = enabled;
  }

  async isAdReady(): Promise<boolean> {
    if (!this.isProviderAvailable) return false;
    try {
      return await this.port.prepare();
    } catch {
      return false;
    }
  }

  showRewardedAd(): Promise<RewardedAdResult> {
    if (!this.isProviderAvailable) return Promise.resolve({ granted: false, rewardUnits: 0 });
    if (this.inFlight) return this.inFlight;
    const request = this.showOnce().finally(() => {
      if (this.inFlight === request) this.inFlight = null;
    });
    this.inFlight = request;
    return request;
  }

  private async showOnce(): Promise<RewardedAdResult> {
    try {
      if (!(await this.port.prepare())) return { granted: false, rewardUnits: 0 };
      const outcome = await this.port.show();
      return outcome === 'earned'
        ? { granted: true, rewardUnits: 1 }
        : { granted: false, rewardUnits: 0 };
    } catch {
      return { granted: false, rewardUnits: 0 };
    }
  }
}
