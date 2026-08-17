import { ReferralRedemptionResult } from '@/types/referral';

/** 실제 추천인 서버로 교체할 때 이 인터페이스만 구현하면 된다. */
export interface ReferralService {
  redeemCode(code: string): Promise<ReferralRedemptionResult>;
}
