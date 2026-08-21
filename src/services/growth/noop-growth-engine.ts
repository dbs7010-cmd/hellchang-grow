import type { GrowthEngine } from '@/services/growth/growth-engine';

/**
 * V1 placeholder. 세션 결과를 받기만 하고 아무 성장도 적립하지 않는다 —
 * 실제 계산은 다음 GrowthEngine 작업에서 이 파일을 대체하는 구현으로 들어온다.
 * 호출 경로(세션 종료 → 결과 생성 → 엔진 전달)는 지금부터 살아 있다.
 */
export const noopGrowthEngine: GrowthEngine = {
  async applySessionResult() {
    return null;
  },
};
