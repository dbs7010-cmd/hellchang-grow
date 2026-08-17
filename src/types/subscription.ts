export type SubscriptionStatus = 'none' | 'active' | 'expired';

export interface SubscriptionState {
  status: SubscriptionStatus;
  tierId?: string;
  startedAt?: string;
  expiresAt?: string;
}
