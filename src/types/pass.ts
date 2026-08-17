/**
 * PASS는 게임 진행도다 — 사용자의 실제 몸/근육 수치를 직접 올리지 않는다 (제품 기획 21장).
 * 레벨은 저장하지 않고 xp로부터 매번 계산한다 (utils/pass.ts) — 중복/불일치 데이터를 피한다.
 */
export interface PassState {
  xp: number;
}
