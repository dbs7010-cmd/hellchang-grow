/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION EXIT — 뒤로가기로 세션 화면을 벗어날 때의 판단만 담당한다.
 *
 * **여기서 세션을 끝내지 않는다.** 뒤로가기는 운동 종료가 아니라 화면 이탈이다:
 * 저장된 active session은 그대로 남고, 기록/XP/streak/Growth는 하나도 만들어지지 않는다.
 * 사용자는 홈의 [운동으로 돌아가기]로 같은 세션에 그대로 복귀한다.
 *
 * 그래서 이 모듈은 저장소도, 완료 파이프라인(SessionCompletionReceipt)도 import하지 않는다 —
 * 순수 판단 함수 하나뿐이다. (scripts/verify-core-loop.ts가 이 경계를 검증한다.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function shouldConfirmSessionExit(input: {
  /** 진행 중인 세션이 있는가 (paused 포함 — 일시정지도 아직 끝난 게 아니다) */
  hasActiveSession: boolean;
  /** 결과 화면을 보고 있는가. 이미 끝난 운동이므로 막지 않는다. */
  hasSummary: boolean;
  /** 종료 처리가 진행 중인가. 완료 흐름을 가로막지 않는다. */
  isEnding: boolean;
  /** 사용자가 이미 [세션 유지하고 나가기]를 눌렀는가 */
  exitConfirmed: boolean;
}): boolean {
  if (!input.hasActiveSession) return false;
  if (input.hasSummary || input.isEnding) return false;
  return !input.exitConfirmed;
}
