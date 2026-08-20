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
  /**
   * 시작 시점의 루틴 이름. 기록 제목을 "가슴 A"처럼 사용자가 고른 이름 그대로 남기기 위해
   * 세션이 직접 들고 간다 — 저장된 기록을 나중에 routineId로 되짚어 추론하지 않는다
   * (루틴 이름이 바뀌거나 삭제돼도 그날의 기록은 그대로여야 한다).
   */
  routineName?: string;
  /** 세션에 추가된 운동들 (선택/강제 아님) */
  exercises: SessionExerciseEntry[];
  /** 현재 포커스된 운동 (session.exercises 중 하나의 id) */
  currentExerciseId?: string;
  /** 휴식 타이머 종료 시각(epoch ms). 없으면 휴식 중이 아님 */
  restUntilMs?: number;
  /**
   * 이번 휴식으로 고른 전체 길이(초). 원형 타이머가 "얼마나 남았는지"를 실제 고른 값 기준으로
   * 그리기 위해 필요하다 — 이 값이 없으면 60초를 골라도 링이 2/3만 찬 채로 시작한다.
   */
  restTotalSeconds?: number;
  /**
   * status가 'active'일 때 앱이 마지막으로 살아있었던 시각(epoch ms) — 주기적으로,
   * 그리고 백그라운드 전환 직전에 갱신된다. 앱이 강제 종료돼 activeSince만으로는
   * "언제까지 실제로 운동 중이었는지" 알 수 없을 때 recoverStaleSession()이 이 값을
   * 기준으로 방치된 시간을 잘라낸다. 없으면(과거 세션) activeSince로 대체한다.
   */
  lastHeartbeatMs?: number;
  /**
   * true면 이 세션이 사용자가 직접 누른 게 아니라 앱이 백그라운드로 전환되면서
   * 자동으로 일시정지된 것이다 — 짧게 백그라운드에 있었다가 곧바로 돌아오면 이 값을 보고
   * 자동으로 재개한다. 사용자가 직접 [일시정지]를 누른 세션에는 절대 설정되지 않으며,
   * 그런 세션은 자동으로 재개되지 않는다. AppState 이벤트가 JS 컨텍스트 재시작(리로드/재실행)에도
   * 살아남지 못하므로, 이 판단은 메모리가 아니라 세션 자체에 저장해 둔다.
   */
  pausedByAppBackground?: boolean;
  /** pausedByAppBackground가 true일 때, 백그라운드 전환이 실제로 일어난 시각(epoch ms) */
  pausedAtMs?: number;
  notes?: string;
  endedAt?: string;
  createdAt: string;
}
