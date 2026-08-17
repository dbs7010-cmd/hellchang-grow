import { WorkoutCategory, WorkoutSetEntry } from '@/types/workout';
import { MuscleGroup } from '@/types/exercise';

export type WorkoutSessionStatus = 'active' | 'paused' | 'completed';

export interface SessionExerciseEntry {
  id: string;
  /** Exercise DB ID, 또는 [직접 운동 추가]로 만든 즉석 ID */
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSetEntry[];
}

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
  /** 부위 선택으로 시작했다면 기록 (기록 제목/이전 기록 조회에 사용, 선택) */
  primaryMuscleGroup?: MuscleGroup;
  /** [이 루틴으로 시작]으로 시작했다면 해당 Routine ID (루틴 완료 감지에 사용) */
  routineId?: string;
  /** 세션에 추가된 운동들 (선택/강제 아님) */
  exercises: SessionExerciseEntry[];
  /** 현재 포커스된 운동 (session.exercises 중 하나의 id) */
  currentExerciseId?: string;
  /** 휴식 타이머 종료 시각(epoch ms). 없으면 휴식 중이 아님 */
  restUntilMs?: number;
  notes?: string;
  endedAt?: string;
  createdAt: string;
}
