import { SubscriptionState } from '@/types/subscription';

/** 실제 인앱결제 SDK로 교체할 때 이 인터페이스만 구현하면 된다. */
export interface SubscriptionService {
  getStatus(): Promise<SubscriptionState>;
  subscribe(tierId: string): Promise<SubscriptionState>;
  cancel(): Promise<SubscriptionState>;
}
