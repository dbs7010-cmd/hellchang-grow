import type { GrowthApplicationResult, WorkoutSessionResult } from '@/types/growth';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GROWTH ENGINE
 *
 *   WorkoutSession → WorkoutSessionResult → GrowthEngine → Muscle SP → 단백이
 *
 * 세션 화면은 엔진을 모르고, 엔진은 세션/화면을 모른다. 오가는 것은 순수 데이터뿐이다.
 * 구현은 `local-growth-engine.ts`이며, 앱이 쓰는 인스턴스는 `index.ts`에서만 고른다.
 *
 * 지켜야 할 경계:
 *  - 엔진이 돌려주는 것은 **게임 진행도(부위별 SP)**다. 실제 체중/체지방률/골격근량을
 *    만들거나 바꾸지 않는다 — 실제 신체 수치는 사용자 입력 또는 신뢰 가능한 측정 소스에서만 온다.
 *  - 캐릭터 외형 파라미터(bodyParameters)는 온보딩/설정의 선택에서만 나온다. SP가 외형
 *    파라미터로 흘러 들어가는 경로를 만들지 않는다.
 *  - Account Level(PASS XP)과 Muscle SP는 독립이다. 하나를 다른 하나의 alias로 만들지 않는다.
 *
 * TODO(fat-engine): 지방/컨디션 축은 별도 엔진이 맡는다. 근육 SP 계산과 섞지 않고,
 * `DanbaekGrowthState.body`(fatStage / definitionStage / nutritionState / recoveryState)에
 * 독립적으로 쓰도록 한다. 이번 단계에서는 그 자리만 비워 뒀다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface GrowthEngine {
  /**
   * 완료된 세션 하나를 성장 입력으로 처리하고, 반영 결과를 돌려준다.
   * 성장에 반영할 것이 없으면(부위를 알 수 없는 운동뿐, 또는 이미 반영된 세션) null.
   */
  applySessionResult(result: WorkoutSessionResult): Promise<GrowthApplicationResult | null>;
}
