import type { MuscleGroup } from '@/types/exercise';
import type { WorkoutSessionResult } from '@/types/growth';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GROWTH ENGINE — 경계만 있는 상태 (다음 작업에서 구현)
 *
 *   WorkoutSession → WorkoutSessionResult → GrowthEngine → Muscle SP → 단백이
 *
 * 이번 WORKOUT CORE 작업에서는 실제 성장 계산을 하지 않는다. 세션 종료 결과를 넘길 수 있는
 * 인터페이스와 no-op 구현까지만 준비한다 (`services/*`의 기존 mock 패턴과 동일).
 *
 * 지켜야 할 경계:
 *  - GrowthEngine이 돌려주는 것은 **게임 진행도(부위별 SP)**다. 실제 체중/체지방률/골격근량을
 *    만들거나 바꾸지 않는다. 실제 신체 수치는 사용자 입력 또는 신뢰 가능한 측정 소스에서만 온다.
 *  - 캐릭터 외형 파라미터(bodyParameters)는 온보딩/설정의 선택에서만 나온다. SP가 외형
 *    파라미터로 흘러 들어가는 경로를 만들지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 이번 세션으로 부위별 SP가 얼마나 올랐는지. 누적 상태 저장은 구현 단계에서 정한다. */
export interface MuscleSpGain {
  muscleGroup: MuscleGroup;
  sp: number;
}

export interface GrowthResult {
  sessionId: string;
  gains: MuscleSpGain[];
  totalSp: number;
}

export interface GrowthEngine {
  /**
   * 완료된 세션 하나를 성장 입력으로 처리한다. 아직 계산 규칙이 없으므로 현재 구현은
   * 아무것도 적립하지 않는다(null). 호출부는 이미 연결돼 있으므로, 다음 작업에서는
   * 이 메서드의 구현만 채우면 된다.
   */
  applySessionResult(result: WorkoutSessionResult): Promise<GrowthResult | null>;
}
