import { getSubscriptionState, saveSubscriptionState } from '@/data/subscription-repository';
import { SubscriptionService } from '@/services/subscription/subscription-service';
import { SubscriptionState } from '@/types/subscription';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 개발용 구독 어댑터 — **결제를 하지 않는다**
 *
 * 실제 결제 SDK가 아직 없다. 없는 결제를 있는 척 흉내 내면 그 코드가 그대로 릴리스에 남아
 * "결제 성공"이라고 거짓말을 하게 되므로, 여기서 하는 일은 하나뿐이다: 개발 중에 premium
 * 화면을 확인할 수 있도록 **`provider: 'dev'`로 표시된** 기록을 남긴다.
 *
 * 그 표시 때문에 이 기록은 릴리스 빌드에서 권리를 만들지 못한다 —
 * `resolveEntitlement`가 실제 스토어 provider가 아닌 기록을 production에서 무시한다.
 * 사용자가 이 문서를 손으로 심어도, 앱을 릴리스로 빌드하면 premium이 되지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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
      // 실제 결제가 아니라는 사실을 데이터에 남긴다. 지우면 production에서도 무시된다.
      provider: 'dev',
    };
    await saveSubscriptionState(state);
    return state;
  }

  async cancel(): Promise<SubscriptionState> {
    const state: SubscriptionState = { status: 'none', provider: 'dev' };
    await saveSubscriptionState(state);
    return state;
  }
}

export const subscriptionService: SubscriptionService = new MockSubscriptionService();
