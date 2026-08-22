export type WorkoutCategory =
  | 'strength'
  | 'home'
  | 'running'
  | 'walking'
  | 'cycling'
  | 'sports'
  | 'other';

export type WorkoutIntensity = 'low' | 'medium' | 'high';

export interface WorkoutSetEntry {
  id: string;
  weightKg?: number;
  reps?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  /** Exercise DB(`config/exercises.ts`)의 ID. 직접 추가한 운동은 없을 수 있다. */
  exerciseId?: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  /**
   * 세트별 상세 기록 — WEIGHT CORE(실시간 세트 기록)부터 추가됐다. 없으면 위 sets/reps/weightKg
   * 요약값만 있는 이전 방식 데이터이므로, 조회 코드는 항상 이 필드가 없을 수 있다고 가정한다.
   */
  setDetails?: WorkoutSetEntry[];
}

export interface WorkoutRecord {
  id: string;
  /** 새 Core Loop 세션 기록의 idempotency key. 과거/수동 기록에는 없을 수 있다. */
  sessionId?: string;
  /** YYYY-MM-DD, 기록 대상 날짜 */
  date: string;
  category: WorkoutCategory;
  title: string;
  durationMinutes?: number;
  intensity?: WorkoutIntensity;
  exercises?: WorkoutExercise[];
  memo?: string;
  completed: boolean;
  createdAt: string;
}
