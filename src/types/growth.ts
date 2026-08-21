import type { MotionFamily, MuscleGroup, SpDistribution } from '@/types/exercise';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WORKOUT SESSION RESULT — 세션과 GrowthEngine 사이의 유일한 계약
 *
 *   WorkoutSession → WorkoutSessionResult → GrowthEngine → Muscle SP → 캐릭터
 *
 * 세션 화면은 GrowthEngine을 모르고, GrowthEngine은 WorkoutSession/AsyncStorage를 모른다.
 * 둘 사이에 오가는 것은 이 순수 데이터뿐이다.
 *
 * 이 결과는 **게임 입력**이다. 여기 있는 어떤 값도 사용자의 실제 신체 수치(체중/체지방률/
 * 골격근량)를 자동으로 만들거나 바꾸지 않는다 — 실제 수치는 사용자 입력이나 신뢰 가능한
 * 측정 소스에서만 들어온다. `bodyWeightKg`도 계산 입력으로 읽기만 하고 쓰지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SessionSetResult {
  weightKg?: number;
  reps?: number;
  /** weightKg × reps. 둘 중 하나라도 없으면(맨몸/시간 종목) 0이다. */
  volumeKg: number;
}

export interface SessionExerciseResult {
  /** Exercise DB ID, 또는 [직접 운동 추가]로 만든 즉석 ID */
  exerciseId: string;
  exerciseName: string;
  /** DB에 없는 즉석 운동이면 false — GrowthEngine이 SP 배분을 건너뛸지 판단한다. */
  inExerciseDb: boolean;
  animationFamily: MotionFamily;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  /** 이 운동의 볼륨을 부위별로 나누는 비율 (합 1.0). */
  spDistribution: SpDistribution;
  /** 완료된 세트만 담는다 — 입력만 하고 완료하지 않은 세트는 결과가 아니다. */
  sets: SessionSetResult[];
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  maxWeightKg?: number;
}

export interface SessionPersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  /** 이 세션 이전까지의 최고 중량. 처음 한 운동이면 undefined. */
  previousBestWeightKg?: number;
}

export interface WorkoutSessionResult {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  /** 실제로 '운동 중'이었던 시간(초) — 일시정지/방치 구간은 빠져 있다. */
  activeSeconds: number;
  exercises: SessionExerciseResult[];
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  personalRecords: SessionPersonalRecord[];
  /**
   * 세션 시점에 알고 있는 사용자 체중(kg). 맨몸 운동의 부하 추정에 필요해서 넘긴다.
   * 실제 입력된 값이 없으면 undefined다 — 지어내지 않는다.
   */
  bodyWeightKg?: number;
  /** 부위별 볼륨 합계 (spDistribution 적용 후). GrowthEngine의 1차 입력. */
  volumeByMuscleGroup: Partial<Record<MuscleGroup, number>>;
}
