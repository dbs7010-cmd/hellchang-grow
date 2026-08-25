let shouldReturnToWorld = false;

/** Expression/navigation-only intent. Never persisted into WorkoutRecord or learning evidence. */
export function markDanbaekWorldWorkoutReturn(): void {
  shouldReturnToWorld = true;
}

export function consumeDanbaekWorldWorkoutReturn(): boolean {
  if (!shouldReturnToWorld) return false;
  shouldReturnToWorld = false;
  return true;
}

export function clearDanbaekWorldWorkoutReturn(): void {
  shouldReturnToWorld = false;
}
