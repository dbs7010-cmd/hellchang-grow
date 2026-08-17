import { getSubscriptionState, saveSubscriptionState } from '@/data/subscription-repository';
import { SubscriptionService } from '@/services/subscription/subscription-service';
import { SubscriptionState } from '@/types/subscription';

const MOCK_SUBSCRIPTION_DURATION_DAYS = 30;

export class MockSubscriptionService implements SubscriptionService {
  async getStatus(): Promise<SubscriptionState> {
    return getSubscriptionState();
  }

  async subscribe(tierId: string): Promise<SubscriptionState> {
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + MOCK_SUBSCRIPTION_DURATION_DAYS);

    const state: SubscriptionState = {
      status: 'active',
      tierId,
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    await saveSubscriptionState(state);
    return state;
  }

  async cancel(): Promise<SubscriptionState> {
    const state: SubscriptionState = { status: 'none' };
    await saveSubscriptionState(state);
    return state;
  }
}

export const subscriptionService: SubscriptionService = new MockSubscriptionService();
