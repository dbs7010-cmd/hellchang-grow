export interface ReferralState {
  referredByCode?: string;
  bonusDaysGranted: number;
  redeemedAt?: string;
}

export interface ReferralRedemptionResult {
  success: boolean;
  reason?: 'already_redeemed' | 'invalid_code';
  bonusDaysGranted?: number;
}
