import type { MovementFamily } from '@/types/danbaek-contract';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 단백세상 방문 기억 (메모리 하나)
 *
 * 첫 구간의 재미는 "막혀 있던 그 문이 **내가 운동하고 오니까** 열렸다"에 있다. 그런데
 * 화면은 매번 지금 상태만 그리기 때문에, 다시 들어와도 그냥 열린 문이 있는 화면일 뿐
 * **바뀌었다는 사실 자체가 보이지 않는다.**
 *
 * 그래서 딱 두 가지만 기억한다:
 *  1) 지난번에 이 길을 봤을 때 막혀 있었는가 → 지금 열렸다면 "방금 열렸다"고 말해 줄 수 있다.
 *  2) 막힌 곳에서 운동하러 나갔는가 → 결과 화면에서 곧장 그 자리로 돌아갈 수 있다.
 *
 * 규칙은 `block-handoff.ts`와 같다:
 *  - **저장하지 않는다.** 메모리에만 있고 앱을 끄면 사라진다. 이건 사용자 데이터가 아니라
 *    "이번에 앱을 쓰는 동안 무엇을 봤는가"일 뿐이라, 저장소/복구 계약을 건드리지 않는다.
 *  - 진행도(progress)가 아니다. 무엇이 열렸는지는 언제나 실제 학습 기록에서 다시 계산된다 —
 *    여기 있는 값은 연출 타이밍에만 쓰이고, 판정에는 쓰이지 않는다.
 *  - WORLD를 import하지 않는다. 계약 타입만 쓴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WorldVisitOutcome = 'blocked' | 'cleared';

export interface WorldVisitSnapshot {
  /** 지금 서 있는(또는 방금 지나온) 구간. */
  stageId: string;
  outcome: WorldVisitOutcome;
}

export interface WorldReturn {
  stageId: string;
  movementFamily: MovementFamily;
}

let lastVisit: WorldVisitSnapshot | null = null;
let pendingReturn: WorldReturn | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

/**
 * 단백세상 화면이 열릴 때 **한 번** 부른다. 지난 방문과 비교해서 지금이 "방금 바뀐 순간"인지
 * 알려주고, 이번 방문을 기억한다.
 *
 * 렌더 중에 부르면 안 된다 — 상태를 바꾸기 때문이다. 화면은 mount effect에서 부른다.
 */
export function observeWorldVisit(current: WorldVisitSnapshot): { justCleared: boolean } {
  const previous = lastVisit;
  lastVisit = current;
  return {
    justCleared:
      previous !== null &&
      previous.outcome === 'blocked' &&
      current.outcome === 'cleared' &&
      previous.stageId === current.stageId,
  };
}

/** 테스트/재시작용. 프로덕션 화면은 부르지 않는다. */
export function resetWorldVisitMemory(): void {
  lastVisit = null;
  pendingReturn = null;
  notify();
}

/**
 * 막힌 곳에서 실제 운동을 하러 나갔다. 결과 화면이 이걸 보고 "돌아가기"를 띄운다 —
 * 운동 기록에는 아무것도 덧붙이지 않는다(WorkoutRecord의 의미는 그대로다).
 */
export function markWorldWorkoutHandoff(handoff: WorldReturn): void {
  pendingReturn = handoff;
  notify();
}

/** 돌아갈 곳이 있으면 그 자리, 없으면 null. */
export function getWorldReturn(): WorldReturn | null {
  return pendingReturn;
}

/** 돌아갔거나, 사용자가 다른 길로 갔을 때 비운다. */
export function clearWorldReturn(): void {
  if (!pendingReturn) return;
  pendingReturn = null;
  notify();
}

/** `useSyncExternalStore`가 그대로 쓸 수 있는 모양. */
export function subscribeToWorldReturn(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
