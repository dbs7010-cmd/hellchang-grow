import { WorkoutCategory, WorkoutExercise } from '@/types/workout';

export type WorkoutSessionStatus = 'active' | 'paused' | 'completed';

export interface WorkoutSession {
  id: string;
  /** 세션이 처음 시작된 시각 (ISO) — 절대 바뀌지 않는다 */
  startedAt: string;
  /** 현재 active 구간이 재개된 시각 (ISO). paused/completed일 때는 undefined */
  activeSince?: string;
  /** activeSince 이전까지 누적된 경과 시간(초). 일시정지/재개를 반복해도 정확하다 */
  accumulatedSeconds: number;
  status: WorkoutSessionStatus;
  primaryCategory: WorkoutCategory;
  /** 웨이트 등에서 선택적으로 추가하는 상세 운동 기록 (강제 아님) */
  activities?: WorkoutExercise[];
  notes?: string;
  endedAt?: string;
  createdAt: string;
}
