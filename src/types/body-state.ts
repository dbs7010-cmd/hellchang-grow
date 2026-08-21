import type { MuscleGroupDetail, MuscleSpDistribution } from '@/types/exercise';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DANBAEK BODY STATE — 여러 축을 하나의 "지금 단백이 몸" 상태로 합치는 레이어
 *
 *   Muscle SP / Stage  ┐
 *   실제 체지방·체중    ├→ DanbaekBodyState → DanbaekBodyParameters → Renderer
 *   식단 / 회복        ┘
 *
 * 축들은 서로를 **직접 바꾸지 않는다**. 근육이 늘었다고 체지방이 내려가지 않고, 식단이
 * 좋다고 근육 SP가 생기지 않는다. 조합은 오직 이 레이어(그리고 그 뒤의 파라미터 변환)
 * 에서만 일어난다.
 *
 * 여기 있는 값은 전부 **게임 표현용 수치**다. 실제 체지방률·체중·골격근량이 아니며,
 * 실제 신체 기록(BodyHistoryEntry)을 만들거나 바꾸지 않는다. 추정으로 만들어진 값을
 * 측정값처럼 보여줘서도 안 된다 — 그래서 `fatStageSource`가 항상 함께 다닌다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 하루 식단을 한 줄로 평가한 값. 상세 음식 기록/음식 DB는 V1에 없다. */
export type NutritionState = 'good' | 'normal' | 'poor' | 'unknown';

/** 수면/컨디션. 입력 소스가 아직 없으므로 기본은 'unknown'이다. */
export type RecoveryState = 'good' | 'normal' | 'poor' | 'unknown';

/** 최근 체중 추세. 하루치 변동이 아니라 일정 기간의 기록에서 판단한다. */
export type WeightTrend = 'gaining' | 'stable' | 'losing' | 'unknown';

/**
 * fatStage가 어디서 나왔는지. 'measured'가 아닌 값을 실제 체지방률처럼 표시하면 안 된다.
 *  - measured  : 사용자가 직접 입력한 체지방률에서 환산
 *  - estimated : 체중 추세 + 식단 상태로 만든 게임 추정치
 *  - default   : 판단할 데이터가 없어 중립값
 */
export type FatStageSource = 'measured' | 'estimated' | 'default';

/**
 * 현재 상태를 설명하는 label. **성장을 제한하는 클래스가 아니다** — 운동/식단에 따라
 * 언제든 다른 값으로 자연스럽게 옮겨간다. 렌더링 힌트/트레이너 대사/디버그용이다.
 */
export type BodyShapeProfile = 'lean' | 'soft' | 'athletic' | 'muscular' | 'bulky' | 'massive';

/**
 * 렌더링에서 다루는 부위 묶음(8). 저장/계산의 단위인 `MuscleGroupDetail`(13)을 대체하지
 * 않는다 — 그림에서 실제로 따로 움직이는 덩어리 기준으로 묶은 것이라, 화면 필터용
 * `MuscleGroup`(가슴/등/하체/…)과도 경계가 다르다(하체가 둔근/허벅지/종아리로 갈라진다).
 */
export type VisualMuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'arms'
  | 'back'
  | 'abs'
  | 'glutes'
  | 'thighs'
  | 'calves';

/** 세부 근육 → 렌더링 묶음. 세부 값은 그대로 남고, 묶음은 파생값일 뿐이다. */
export const MuscleDetailToVisualGroup: Record<MuscleGroupDetail, VisualMuscleGroup> = {
  chest: 'chest',
  frontDelts: 'shoulders',
  sideDelts: 'shoulders',
  rearDelts: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  lats: 'back',
  upperBack: 'back',
  abs: 'abs',
  glutes: 'glutes',
  quads: 'thighs',
  hamstrings: 'thighs',
  calves: 'calves',
};

export const VisualMuscleGroups: VisualMuscleGroup[] = [
  'chest',
  'shoulders',
  'arms',
  'back',
  'abs',
  'glutes',
  'thighs',
  'calves',
];

/**
 * 지금 이 순간의 단백이 몸 상태. 저장하지 않고 필요할 때 계산한다
 * (영속화하는 것은 `BodyCompositionState`의 입력값과 캐시뿐이다).
 */
export interface DanbaekBodyState {
  /** GrowthEngine의 부위별 stage 그대로 (0~5). 이 레이어는 SP를 바꾸지 않는다. */
  muscleStages: Record<MuscleGroupDetail, number>;
  /** 렌더링 묶음별 stage. 세부 stage의 파생값이며 원본을 대체하지 않는다. */
  groupedMuscleStages: Record<VisualMuscleGroup, number>;
  /** 전신 근육량 점수 0~1. 부위 크기 가중 평균이라 팔만 키워도 1이 되지 않는다. */
  muscleMassScore: number;

  /** 0~5. 낮을수록 마르고 높을수록 두툼한 표현. 의학적 판정이 아니다. */
  fatStage: number;
  fatStageSource: FatStageSource;
  /** 0~5. 근육량과 낮은 지방이 함께 있을 때만 높아진다. */
  definitionStage: number;

  /** 이번 세션의 일시적 펌핑. 영구 상태가 아니며 저장되지 않는다. */
  pumpByMuscle: MuscleSpDistribution;

  nutritionState: NutritionState;
  recoveryState: RecoveryState;
  weightTrend: WeightTrend;

  /** 현재 상태를 한 단어로 설명하는 label (제한 클래스가 아니다). */
  shapeProfile: BodyShapeProfile;
  updatedAt: string;
}

/**
 * Renderer가 읽는 최종 수치. 전부 0~1로 정규화돼 있어, 그림 쪽은 SP도 stage도
 * 체지방률도 알 필요가 없다 — 이 값만 보고 그린다.
 *
 * 0이 "없음"이 아니라 **기본 체형**이다. 1은 과장된 최종 단계다.
 */
export interface DanbaekBodyParameters {
  chestScale: number;
  shoulderScale: number;
  armScale: number;
  backWidth: number;
  backThickness: number;
  /** 허리 두께. 지방이 주도하고 근육량이 아주 조금 더한다. */
  waistScale: number;
  /** 복부 선명도. 복근 stage와 전체 definition의 조합. */
  abdomenDefinition: number;
  gluteScale: number;
  thighScale: number;
  calfScale: number;

  /** 전체 덩치. 근육량이 주도하고 지방이 일부 더한다. */
  overallMass: number;
  /** 실루엣이 얼마나 부드러운가 (지방). */
  fatSoftness: number;
  /** 근육 윤곽이 얼마나 드러나는가. */
  definition: number;
}
