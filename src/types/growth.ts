import type {
  MotionFamily,
  MuscleGroup,
  MuscleGroupDetail,
  MuscleSpDistribution,
  SpDistribution,
} from '@/types/exercise';

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
  /**
   * 이 운동의 추정 1RM(kg). 과거 기록과 이번 세션의 완료 세트 중 가장 높은 추정값이며,
   * 신뢰할 수 없으면(중량 없음/반복수 과다) 비어 있다 — GrowthEngine은 이 값이 없어도
   * SP를 계산한다(중립 강도 배수를 쓴다). 세션 결과에 담는 이유는 과거 기록을 아는 쪽이
   * 여기뿐이기 때문이다 (엔진은 저장소를 모른다).
   */
  estimatedOneRepMaxKg?: number;
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GROWTH STATE — 실제 운동으로 쌓이는 부위별 성장 상태 (영속화 대상)
 *
 * 세 축을 서로 섞지 않는다:
 *  - **Account Level (PASS XP)**: 게임 플레이 진행도. `types/pass.ts`가 따로 들고 있다.
 *  - **Muscle SP**: 아래 상태. 실제 운동 기록에서만 쌓인다.
 *  - **Fat / Definition**: 식단·체중 추세 축. 아직 계산하지 않는다 (`BodyCompositionState`).
 *
 * Muscle SP는 게임 진행도이며 사용자의 실제 체중/체지방률/골격근량이 아니다.
 * 이 상태가 실제 신체 기록(BodyHistoryEntry)을 만들거나 바꾸는 경로는 존재하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface MuscleGrowthState {
  /** 지금까지 이 부위에 쌓인 총 SP. stage와 무관하게 계속 누적된다. */
  totalSp: number;
  /** totalSp를 threshold에 대입해 얻은 현재 단계 (0~5). 저장하지만 언제나 재계산 가능하다. */
  currentStage: number;
  lastGainAt?: string;
}

/**
 * 지방/컨디션 축. 이번 단계에서는 **아무도 채우지 않는다** — 다음 FatEngine이 들어올
 * 자리만 잡아둔다. 근육 SP 계산은 이 값을 절대 읽지 않는다 (두 엔진은 독립적이다).
 */
export interface BodyCompositionState {
  fatStage?: number;
  definitionStage?: number;
  nutritionState?: unknown;
  recoveryState?: unknown;
}

export interface DanbaekGrowthState {
  /** 저장 스키마 버전. 필드가 늘어나도 예전 저장값을 그대로 읽기 위한 최소 장치. */
  version: number;
  muscles: Record<MuscleGroupDetail, MuscleGrowthState>;
  totalWorkoutSp: number;
  /**
   * 하루 상한(soft cap) 계산용 당일 누적치. 날짜가 바뀌면 통째로 리셋된다 —
   * 히스토리가 아니라 계산용 임시 집계라서 하루치만 들고 있는다.
   */
  daily: {
    /** YYYY-MM-DD */
    date: string;
    spByMuscle: MuscleSpDistribution;
  };
  /** 마지막으로 반영한 세션. 같은 세션이 두 번 적립되지 않게 한다. */
  lastSessionId?: string;
  updatedAt: string;
  /** 예약 영역 (FatEngine). 근육 SP와 섞지 않는다. */
  body?: BodyCompositionState;
}

// ── 엔진 반환값 ─────────────────────────────────────────────────────────────

export interface MuscleStageChange {
  muscle: MuscleGroupDetail;
  /** 화면에서 부위를 묶어 보여줄 때 쓴다 (세부 부위를 그대로 노출하지 않아도 되도록). */
  group: MuscleGroup;
  previousStage: number;
  currentStage: number;
}

/**
 * 세션 하나를 성장에 반영한 결과. 다음 단계(운동 종료 성장 연출 / DanbaekRenderer)가
 * 이 데이터만 보고 화면을 만들 수 있어야 한다.
 */
export interface GrowthApplicationResult {
  sessionId: string;
  gainedSpByMuscle: MuscleSpDistribution;
  previousStages: Record<MuscleGroupDetail, number>;
  currentStages: Record<MuscleGroupDetail, number>;
  stageChanges: MuscleStageChange[];
  /**
   * 이번 세션의 일시적 펌핑. **저장하지 않는다** — 영구 성장(SP)과 다른 값이며,
   * 결과 화면/캐릭터 연출에서 잠깐 쓰기 위한 것이다.
   */
  pumpByMuscle: MuscleSpDistribution;
  totalSpGained: number;
}
