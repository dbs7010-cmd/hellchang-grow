import { BodyStateConfig } from '@/config/body-state-config';
import {
  MuscleDetailToVisualGroup,
  type DanbaekBodyParameters,
  type DanbaekBodyState,
} from '@/types/body-state';
import type { MuscleGroupDetail, MuscleSpDistribution } from '@/types/exercise';
import { muscleStageToVisualScale } from '@/utils/body-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BODY PARAMETERS — BodyState → Renderer가 읽는 0~1 수치
 *
 * 경계: Growth SP → BodyState → BodyParameters → Renderer.
 * 이 변환 뒤로는 SP도 stage도 체지방률도 나타나지 않는다. 그림 쪽은 "가슴이 얼마나 큰가"
 * 같은 것만 알면 된다.
 *
 * 순수 함수이며 숫자는 전부 `config/body-state-config.ts`에서 온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 여러 세부 근육의 시각적 크기를 가중 평균한다 (어깨 = 전/측/후면 …). */
function weightedScale(
  stages: Record<MuscleGroupDetail, number>,
  weights: Partial<Record<MuscleGroupDetail, number>>
): number {
  let weighted = 0;
  let total = 0;
  for (const [muscle, weight] of Object.entries(weights) as [MuscleGroupDetail, number][]) {
    weighted += muscleStageToVisualScale(stages[muscle] ?? 0) * weight;
    total += weight;
  }
  return total > 0 ? weighted / total : 0;
}

/**
 * 부위별 차이를 보존한 최종 파라미터. 가슴만 키운 사람과 하체만 키운 사람은
 * 전혀 다른 값이 나와야 한다 — 그래서 전신 점수 하나로 뭉개지 않는다.
 */
export function toDanbaekBodyParameters(state: DanbaekBodyState): DanbaekBodyParameters {
  const { parameters, fat, definition } = BodyStateConfig;
  const stages = state.muscleStages;

  const fatRatio = clamp01(state.fatStage / fat.maxStage);
  const definitionRatio = clamp01(state.definitionStage / definition.maxStage);

  const chestScale = muscleStageToVisualScale(stages.chest ?? 0);
  const shoulderScale = weightedScale(stages, parameters.shoulderWeights);
  const armScale = weightedScale(stages, parameters.armWeights);
  const backWidth = weightedScale(stages, parameters.backWidthWeights);
  const backThickness = weightedScale(stages, parameters.backThicknessWeights);
  const gluteScale = muscleStageToVisualScale(stages.glutes ?? 0);
  const thighScale = weightedScale(stages, parameters.thighWeights);
  const calfScale = muscleStageToVisualScale(stages.calves ?? 0);
  const absScale = muscleStageToVisualScale(stages.abs ?? 0);

  return {
    chestScale: round2(chestScale),
    shoulderScale: round2(shoulderScale),
    armScale: round2(armScale),
    backWidth: round2(backWidth),
    backThickness: round2(backThickness),
    // 허리는 지방이 주도한다 — 근육이 늘어도 조금만 두꺼워진다.
    waistScale: round2(
      clamp01(
        parameters.waist.base +
          parameters.waist.fat * fatRatio +
          parameters.waist.muscle * state.muscleMassScore
      )
    ),
    // 복부는 "복근이 있는가"와 "그게 보이는가"가 둘 다 필요하다. definition이 0이면
    // 복근 stage가 5여도 드러나지 않는다.
    abdomenDefinition: round2(
      clamp01(definitionRatio * (parameters.abdomen.base + parameters.abdomen.absMuscle * absScale))
    ),
    gluteScale: round2(gluteScale),
    thighScale: round2(thighScale),
    calfScale: round2(calfScale),
    // 근돼도 "크다"가 되도록 지방이 덩치에 일부 기여한다.
    overallMass: round2(
      clamp01(
        parameters.overallMass.muscle * state.muscleMassScore + parameters.overallMass.fat * fatRatio
      )
    ),
    fatSoftness: round2(fatRatio),
    definition: round2(definitionRatio),
  };
}

/**
 * 운동 직후의 일시적 펌핑을 파라미터 위에 얹는다.
 *
 * **저장하지 않는다.** 원본 파라미터/BodyState/GrowthState 중 어느 것도 바뀌지 않고
 * 새 객체만 나간다 — 앱을 다시 켜면 펌핑은 남아 있지 않다. 결과 화면처럼 "방금 운동한
 * 직후" 화면에서만 이 함수를 통과시킨다.
 */
export function applyPumpToBodyParameters(
  parameters: DanbaekBodyParameters,
  pumpByMuscle: MuscleSpDistribution
): DanbaekBodyParameters {
  const { referenceSp, maxBoost } = BodyStateConfig.pump;
  const entries = Object.entries(pumpByMuscle) as [MuscleGroupDetail, number][];
  if (entries.length === 0) return parameters;

  /** 렌더링 묶음별로 가장 강하게 펌핑된 값을 쓴다 (같은 묶음 안에서 합산하지 않는다). */
  const boostByGroup: Partial<Record<string, number>> = {};
  for (const [muscle, pump] of entries) {
    if (!(pump > 0)) continue;
    const group = MuscleDetailToVisualGroup[muscle];
    const boost = Math.min(1, pump / referenceSp) * maxBoost;
    boostByGroup[group] = Math.max(boostByGroup[group] ?? 0, boost);
  }

  const boosted = (value: number, group: string) =>
    round2(clamp01(value + (boostByGroup[group] ?? 0)));

  return {
    ...parameters,
    chestScale: boosted(parameters.chestScale, 'chest'),
    shoulderScale: boosted(parameters.shoulderScale, 'shoulders'),
    armScale: boosted(parameters.armScale, 'arms'),
    backWidth: boosted(parameters.backWidth, 'back'),
    backThickness: boosted(parameters.backThickness, 'back'),
    gluteScale: boosted(parameters.gluteScale, 'glutes'),
    thighScale: boosted(parameters.thighScale, 'thighs'),
    calfScale: boosted(parameters.calfScale, 'calves'),
    // 펌핑은 부위 볼륨을 잠깐 키울 뿐, 지방/전체 덩치/복부 선명도를 바꾸지 않는다.
  };
}
