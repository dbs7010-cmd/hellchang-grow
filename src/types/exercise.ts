import type { WorkoutCategory } from '@/types/workout';

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'fullBody' | 'core';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'smith'
  | 'other';

export type ExerciseTrackingType = 'weight_reps' | 'reps_only' | 'duration';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * MOTION FAMILY — 운동마다 별도 애니메이션을 만들지 않는다.
 *
 * 종목이 수십 개여도 캐릭터가 실제로 취하는 동작은 몇 가지 공통 패턴으로 수렴한다.
 * Exercise는 `animationFamily`로 그중 하나를 가리키고, 세션 화면은 종목 이름이 아니라
 * 이 값만 보고 모션을 고른다 — 종목이 늘어나도 애니메이션을 새로 만들지 않는다.
 *
 * 실제 모션 파라미터/라벨은 `config/motion-families.ts` 한 곳에서만 정의한다.
 */
export type MotionFamily =
  | 'horizontal_press'
  | 'vertical_press'
  | 'fly'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'curl'
  | 'extension'
  | 'raise'
  | 'squat'
  | 'hip_hinge'
  | 'leg_press'
  | 'leg_isolation'
  | 'calf'
  | 'core'
  | 'cardio';

/**
 * 이 운동이 어느 부위에 얼마나 기여하는지의 가중치 (합 1.0 기준).
 * 다음 단계 GrowthEngine이 "이번 세션의 볼륨을 부위별로 어떻게 나눌지" 계산할 때 쓴다.
 * 실제 신체 수치가 아니라 게임 진행도(부위별 SP)의 분배 비율이다 — 실제 체성분과 무관하다.
 */
export type SpDistribution = Partial<Record<MuscleGroup, number>>;

/**
 * Exercise DB의 원본 항목. 새 필드는 전부 optional이다 — 기존 44개 항목을 다시 쓰지 않고,
 * 값이 없으면 `utils/exercise-spec.ts`가 기존 필드(equipment/trackingType/근육군)에서
 * 결정론적으로 유도한다. 유도값이 틀린 운동만 여기서 개별적으로 덮어쓴다.
 *
 * 프리웨이트 / 머신 / 케이블 / 맨몸은 별도 시스템이 아니라 전부 이 모델 하나를 쓴다
 * (`equipment` 값만 다르다).
 */
export interface ExerciseDefinition {
  id: string;
  name: string;
  aliases?: string[];
  /** 기본값 'strength'. 유산소성 종목만 별도로 지정한다. */
  category?: WorkoutCategory;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment: Equipment;
  trackingType: ExerciseTrackingType;
  /** 캐릭터 모션 연결점. 없으면 equipment/근육군에서 유도한다. */
  animationFamily?: MotionFamily;
  /** 없으면 primary/secondary 근육군에서 유도한다. */
  spDistribution?: SpDistribution;
  defaultSets?: number;
  /** trackingType이 'duration'이면 '회'가 아니라 '초'로 읽는다. */
  defaultReps?: number;
  defaultRestSeconds?: number;
  difficulty?: ExerciseDifficulty;
  /** 운동 가이드 문서 ID. V1은 운동 상세 화면(= exercise id)과 같다. */
  guideId?: string;
  /** 기구가 없을 때의 대체 운동. 없으면 같은 부위의 다른 기구 운동에서 유도한다. */
  alternativeExerciseIds?: string[];
  instructions?: string;
  cautions?: string;
  tags?: string[];
}

/**
 * 유도값까지 전부 채워진 Exercise — 화면/세션/GrowthEngine이 실제로 소비하는 형태다.
 * `resolveExercise()`만 이 타입을 만든다. optional이 하나도 없다는 점이 중요하다:
 * 소비자는 "이 운동은 기본 세트 수가 없네"를 매번 분기하지 않는다.
 */
export interface ResolvedExercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  equipment: Equipment;
  animationFamily: MotionFamily;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  spDistribution: SpDistribution;
  /** 중량을 기록하는 운동인가 (바벨/덤벨/머신/케이블) */
  usesWeight: boolean;
  /** 체중을 저항으로 쓰는 운동인가 (풀업/딥스/푸쉬업 …) */
  usesBodyWeight: boolean;
  /** 1RM 추정이 의미 있는 복합 관절 운동인가. V1은 계산하지 않고 표시 여부 판단에만 쓴다. */
  uses1RM: boolean;
  defaultSets: number;
  defaultReps: number;
  defaultRestSeconds: number;
  difficulty: ExerciseDifficulty;
  guideId: string;
  alternativeExerciseIds: string[];
  trackingType: ExerciseTrackingType;
}
