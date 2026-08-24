import type { RewardedAdResult } from '@/types/ads';

/** 실제 AdMob 등 SDK로 교체할 때 이 인터페이스만 구현하면 된다. */
export interface RewardedAdService {
  /**
   * 광고 provider가 이 빌드에 실제로 연결돼 있는가.
   *
   * `isAdReady`(지금 이 순간 보여줄 광고가 준비됐는가)와 다르다. 이쪽은 빌드 차원의
   * 사실이라 화면이 "광고 보기" 버튼을 아예 내보낼지 말지를 정하는 데 쓴다 —
   * 누를 수는 있는데 아무 일도 일어나지 않는 버튼을 만들지 않기 위한 것이다.
   */
  readonly isProviderAvailable: boolean;
  isAdReady(): Promise<boolean>;
  showRewardedAd(): Promise<RewardedAdResult>;
}
