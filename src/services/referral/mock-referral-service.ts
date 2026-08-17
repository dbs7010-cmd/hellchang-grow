import { AppConfig } from '@/config/app-config';
import { getReferralState, saveReferralState } from '@/data/referral-repository';
import { ReferralService } from '@/services/referral/referral-service';
import { ReferralRedemptionResult } from '@/types/referral';

export class MockReferralService implements ReferralService {
  async redeemCode(code: string): Promise<ReferralRedemptionResult> {
    const trimmed = code.trim();
    if (!trimmed) {
      return { success: false, reason: 'invalid_code' };
    }

    const state = await getReferralState();
    if (state.referredByCode) {
      return { success: false, reason: 'already_redeemed' };
    }

    await saveReferralState({
      referredByCode: trimmed,
      bonusDaysGranted: AppConfig.referralBonusDays,
      redeemedAt: new Date().toISOString(),
    });

    return { success: true, bonusDaysGranted: AppConfig.referralBonusDays };
  }
}

export const referralService: ReferralService = new MockReferralService();
