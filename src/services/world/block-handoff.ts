import type { StageBlock } from '@/types/danbaek-contract';

let pendingBlock: StageBlock | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

export function handOffDanbaekBlock(block: StageBlock): void {
  pendingBlock = block;
  notify();
}

export function getPendingDanbaekBlock(): StageBlock | null {
  return pendingBlock;
}

export function clearPendingDanbaekBlock(): void {
  if (!pendingBlock) return;
  pendingBlock = null;
  notify();
}

export function subscribeToDanbaekBlock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
