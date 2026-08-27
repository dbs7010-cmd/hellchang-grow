/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION EXIT — 뒤로가기로 세션 화면을 벗어날 때의 판단만 담당한다.
 *
 * **여기서 세션을 끝내지 않는다.** 뒤로가기는 운동 종료가 아니라 화면 이탈이다:
 * 저장된 active session은 그대로 남고, 기록/XP/streak/Growth는 하나도 만들어지지 않는다.
 * 사용자는 홈의 [운동 계속하기]로 같은 세션에 그대로 복귀한다.
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION CONFIRM — 세션 화면 하단이 지금 무엇을 물어야 하는가.
 *
 * 두 확인은 성질이 다르다.
 *  - **exit(뒤로가기)**: 화면 이탈 여부. 뒤로가기는 ACTIVE에서도 REST에서도 눌리므로
 *    세션 화면 전체의 관심사다 — 두 화면 모두에서 보여야 한다.
 *  - **end(운동 종료)**: 기록/보상 확정. 진입점([운동 종료] 버튼)이 ACTIVE에만 있으므로
 *    ACTIVE의 관심사다. 휴식 중에 띄울 자리도, 띄울 이유도 없다.
 *
 * 예전에는 두 확인 UI가 ACTIVE 반환문 안에만 있어서, 휴식 중 뒤로가기는 이탈만 조용히
 * 막고 아무것도 보여 주지 않았고, 휴식 중에 남은 end 확인이 ACTIVE로 돌아온 뒤 뒤늦게
 * 튀어나와 같은 자리의 다음 탭이 [종료하고 기록]에 맞는 사고가 났다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type SessionConfirmKind = 'exit' | 'end';

export function resolveSessionConfirm(input: {
  confirmExit: boolean;
  confirmEnd: boolean;
  /** 휴식 화면이 화면을 차지하고 있는가 */
  resting: boolean;
  /** 결과 화면을 보고 있는가 */
  hasSummary: boolean;
  /** 종료 처리가 진행 중인가 */
  isEnding: boolean;
}): SessionConfirmKind | null {
  // 이미 끝났거나 끝내는 중이면 어떤 확인도 남기지 않는다 (결과 화면으로 새지 않게).
  if (input.hasSummary || input.isEnding) return null;
  // 이탈 확인이 항상 먼저다 — 둘은 다른 결정이고, 나가기는 세션을 남긴 채 화면만 벗어난다.
  if (input.confirmExit) return 'exit';
  /*
    종료 확인은 ACTIVE와 REST **둘 다**에서 보여 준다.

    예전에는 ACTIVE에만 진입점이 있어서, 휴식 중에 운동을 끝내려면 타이머가 끝나거나
    [다음 세트 시작]을 눌러 운동 화면으로 돌아간 뒤에야 종료할 수 있었다. 마지막 세트를
    끝내면 곧바로 휴식이 시작되므로, **운동을 끝내는 가장 흔한 순간이 정확히 그 자리**다.

    감춰서 생기던 예전 사고(휴식 중 남은 확인이 ACTIVE 복귀 후 뒤늦게 튀어나오던 문제)는
    이제 구조적으로 없다 — 두 화면 모두에서 같은 확인이 보이고 같은 자리에서 답할 수 있다.
  */
  if (input.confirmEnd) return 'end';
  return null;
}
