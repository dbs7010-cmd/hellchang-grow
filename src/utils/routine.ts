import type { Routine } from '@/types/routine';

/** dayOfWeek는 Date.getDay() 규칙(0=일~6=토)을 그대로 인자로 받는다 — 순수 함수. */
export function getTodaysScheduledRoutine(routines: Routine[], dayOfWeek: number): Routine | null {
  return routines.find((routine) => routine.scheduledDays?.includes(dayOfWeek)) ?? null;
}
