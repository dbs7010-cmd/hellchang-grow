let shouldReturnToWorld = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

/** Expression/navigation-only intent. Never persisted into WorkoutRecord or learning evidence. */
export function markDanbaekWorldWorkoutReturn(): void {
  shouldReturnToWorld = true;
  notify();
}

export function getDanbaekWorldWorkoutReturn(): boolean {
  return shouldReturnToWorld;
}

export function subscribeToDanbaekWorldWorkoutReturn(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function consumeDanbaekWorldWorkoutReturn(): boolean {
  if (!shouldReturnToWorld) return false;
  shouldReturnToWorld = false;
  notify();
  return true;
}

export function clearDanbaekWorldWorkoutReturn(): void {
  if (!shouldReturnToWorld) return;
  shouldReturnToWorld = false;
  notify();
}
