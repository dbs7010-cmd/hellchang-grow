import type { StageBlock } from '@/types/danbaek-contract';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WORLD → APP BLOCK HANDOFF (APP 쪽 경계 하나)
 *
 * APP은 단백세상을 구현하지 않는다. 하지만 WORLD가 "여기서 막혔다"고 말할 때 그것을 받아
 * 스탠리 화면으로 넘길 자리는 필요하다. 이 파일이 그 자리이고, 하는 일은 **한 개짜리
 * 우편함** 하나가 전부다.
 *
 *   WORLD(통합) → handOffDanbaekBlock(block) → /danbaek-block 화면
 *
 * 규칙:
 *  - 계약(`types/danbaek-contract.ts`)의 `StageBlock`을 **그대로** 받는다. 모양을 바꾸지
 *    않으므로 통합이 WORLD의 block을 변환 없이 꽂을 수 있다.
 *  - **저장하지 않는다.** 메모리에만 있고 앱을 끄면 사라진다 — block은 WORLD 판정의
 *    결과물이지 APP이 보관할 사용자 데이터가 아니다(저장소/복구 규칙을 건드리지 않는다).
 *  - 한 번에 하나만 들고 있다. 새 block이 오면 앞의 것을 덮는다 — 지금 막힌 곳은 하나다.
 *  - 여기서 WORLD를 import하지 않는다. 타입만 계약에서 온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

let pendingBlock: StageBlock | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

/**
 * WORLD가 막힘을 APP에 넘긴다. **통합이 호출하는 유일한 진입점이다.**
 * 화면 이동은 호출부가 한다 — 이 함수는 상태만 바꾸고 라우터를 건드리지 않는다.
 */
export function handOffDanbaekBlock(block: StageBlock): void {
  pendingBlock = block;
  notify();
}

/** 지금 스탠리가 설명해야 할 막힘. 없으면 null. */
export function getPendingDanbaekBlock(): StageBlock | null {
  return pendingBlock;
}

/** 안내가 끝났으면 비운다 (운동을 시작했거나 사용자가 닫았을 때). */
export function clearPendingDanbaekBlock(): void {
  if (!pendingBlock) return;
  pendingBlock = null;
  notify();
}

/** 화면이 구독한다. useSyncExternalStore가 그대로 쓸 수 있는 모양이다. */
export function subscribeToDanbaekBlock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
