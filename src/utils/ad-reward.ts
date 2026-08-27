import type { RewardedAdResult } from '@/types/ads';

/**
 * 광고 결과를 이용권으로 바꿀지 정하는 규칙.
 *
 * **광고가 실제로 보상을 승인했을 때만 이용권이 늘어난다.** 광고를 틀 수 없는 빌드에서
 * "광고를 본 것"으로 처리하면 사용자는 버튼 한 번으로 유료 기능 이용권을 얻는다.
 *
 * SDK가 실패해 결과가 없는 경우(null)도 무보상이다 — 실패를 성공으로 읽지 않는다.
 * 이 함수는 이용권만 정한다. 구독/등급(entitlement)은 만들지 않는다 — 광고로 premium이
 * 되는 경로는 존재하지 않는다.
 */
export function resolveRewardedAdGrant(result: RewardedAdResult | null | undefined): {
  granted: boolean;
  rewardUnits: number;
} {
  if (!result || !result.granted) return { granted: false, rewardUnits: 0 };
  const units = Math.floor(result.rewardUnits);
  if (!Number.isFinite(units) || units <= 0) return { granted: false, rewardUnits: 0 };
  return { granted: true, rewardUnits: units };
}
