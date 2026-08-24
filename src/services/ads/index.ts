import type { RewardedAdService } from '@/services/ads/rewarded-ad-service';
import { selectRewardedAdService } from '@/services/ads/select-rewarded-ad-service';

/**
 * 어떤 광고 어댑터를 쓸지 앱 시작 시 한 번 정한다 — `services/trainer/index.ts`가
 * 엔드포인트 유무로 PT 구현을 고르는 것과 같은 방식이다.
 *
 * **출시 빌드에는 보상을 주는 어댑터가 없다.** 실제 SDK가 붙기 전까지 광고를 본 것처럼
 * 즉시 이용권을 주는 경로가 production에 존재하면 안 되기 때문이다. 개발 빌드의 mock은
 * `__DEV__` 안에서만 선택되므로 번들에서 함께 제거된다.
 *
 * 선택 규칙 자체는 `selectRewardedAdService()`에 있다 (순수 함수, 검증 가능).
 */
export const rewardedAdService: RewardedAdService = selectRewardedAdService(__DEV__);
