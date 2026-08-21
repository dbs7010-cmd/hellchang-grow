import type {
  Equipment,
  MotionFamily,
  MuscleGroup,
  MuscleGroupDetail,
  MuscleSpDistribution,
  SpDistribution,
} from '@/types/exercise';
import { GrowthConfig } from '@/config/growth-config';

/**
 * 부위 묶음(MuscleGroup) 단위의 분배를 **세부 부위**(MuscleGroupDetail) 분배로 펼친다.
 *
 * 전부 순수 함수다. Exercise DB에 `muscleSpDistribution`이 명시돼 있으면 그 값이 항상
 * 우선이고, 여기 있는 유도는 명시되지 않은 운동에만 쓰인다 — 44개 항목을 모두 손으로
 * 쓰지 않으면서도 "레그익스텐션은 대퇴사두, 레그컬은 햄스트링"처럼 구분이 필요한 운동만
 * DB에서 override 하도록 하기 위한 구조다.
 *
 * 유도의 핵심은 **동작 패턴(animationFamily)**이다. 같은 "팔"이라도 컬은 이두, 익스텐션은
 * 삼두이고, 같은 "어깨"라도 레이즈는 측면, 프레스는 전면이다. 이 정보는 이미 Exercise가
 * 들고 있으므로 새 필드를 만들지 않고 그대로 활용한다.
 *
 * 여기 숫자는 전부 **게임 밸런스 초기값**이다. 의학적/생체역학적 측정값이 아니다.
 */

type DetailSplit = MuscleSpDistribution;

const EVEN_SHOULDERS: DetailSplit = { frontDelts: 0.4, sideDelts: 0.4, rearDelts: 0.2 };
const EVEN_ARMS: DetailSplit = { biceps: 0.5, triceps: 0.5 };
const EVEN_BACK: DetailSplit = { lats: 0.6, upperBack: 0.4 };
const EVEN_LEGS: DetailSplit = { quads: 0.5, glutes: 0.25, hamstrings: 0.25 };

/** 미는 동작 = 삼두/전면, 당기는 동작 = 이두/후면. 이 판단만 있으면 대부분 맞는다. */
const PUSH_FAMILIES: MotionFamily[] = ['horizontal_press', 'vertical_press', 'fly', 'extension'];
const PULL_FAMILIES: MotionFamily[] = ['horizontal_pull', 'vertical_pull', 'curl'];

function splitForGroup(group: MuscleGroup, family: MotionFamily): DetailSplit {
  switch (group) {
    case 'chest':
      return { chest: 1 };
    case 'core':
      return { abs: 1 };

    case 'shoulders':
      if (family === 'raise') return { sideDelts: 1 };
      if (family === 'fly' || family === 'horizontal_pull' || family === 'vertical_pull') {
        return { rearDelts: 1 };
      }
      if (family === 'horizontal_press' || family === 'vertical_press') return { frontDelts: 1 };
      return EVEN_SHOULDERS;

    case 'arms':
      if (family === 'curl') return { biceps: 1 };
      if (family === 'extension') return { triceps: 1 };
      if (PUSH_FAMILIES.includes(family)) return { triceps: 1 };
      if (PULL_FAMILIES.includes(family)) return { biceps: 1 };
      return EVEN_ARMS;

    case 'back':
      if (family === 'vertical_pull') return { lats: 0.7, upperBack: 0.3 };
      if (family === 'horizontal_pull') return { lats: 0.45, upperBack: 0.55 };
      if (family === 'hip_hinge') return { upperBack: 0.6, lats: 0.4 };
      return EVEN_BACK;

    case 'legs':
      if (family === 'calf') return { calves: 1 };
      if (family === 'hip_hinge') return { hamstrings: 0.5, glutes: 0.5 };
      if (family === 'squat' || family === 'leg_press') {
        return { quads: 0.55, glutes: 0.3, hamstrings: 0.15 };
      }
      return EVEN_LEGS;

    case 'fullBody':
    default:
      // 버피처럼 부위를 특정할 수 없는 운동. 큰 근육에 얇게 퍼뜨린다.
      return { quads: 0.25, glutes: 0.2, abs: 0.2, chest: 0.15, upperBack: 0.1, triceps: 0.1 };
  }
}

/** 합이 1.0이 되도록 맞춘다. 비율이 새거나 부풀면 부위 간 형평이 깨진다. */
export function normalizeMuscleSpDistribution(
  distribution: MuscleSpDistribution
): MuscleSpDistribution {
  const entries = Object.entries(distribution) as [MuscleGroupDetail, number][];
  const total = entries.reduce((sum, [, share]) => sum + share, 0);
  if (total <= 0) return {};

  const normalized: MuscleSpDistribution = {};
  for (const [muscle, share] of entries) {
    const value = Math.round((share / total) * 1000) / 1000;
    if (value > 0) normalized[muscle] = value;
  }
  return normalized;
}

/**
 * 묶음 단위 분배(spDistribution) × 동작 패턴 → 세부 부위 분배.
 * 예: 벤치프레스의 {chest 0.7, arms 0.15, shoulders 0.15}는 미는 동작이므로
 * {chest 0.7, triceps 0.15, frontDelts 0.15}가 된다.
 */
export function deriveMuscleSpDistribution(input: {
  spDistribution: SpDistribution;
  animationFamily: MotionFamily;
}): MuscleSpDistribution {
  const result: MuscleSpDistribution = {};

  for (const [group, groupShare] of Object.entries(input.spDistribution) as [
    MuscleGroup,
    number,
  ][]) {
    const split = splitForGroup(group, input.animationFamily);
    for (const [muscle, share] of Object.entries(split) as [MuscleGroupDetail, number][]) {
      result[muscle] = (result[muscle] ?? 0) + groupShare * share;
    }
  }

  return normalizeMuscleSpDistribution(result);
}

/**
 * 맨몸 운동에서 체중의 몇 배가 부하로 걸리는지. 푸쉬업은 체중 전체가 아니고, 풀업은
 * 거의 전체다. DB에 값이 없는 운동은 동작 패턴에서 유도한다 — V1에서 모든 종목에
 * 정밀한 값을 손으로 쓰지 않는다는 뜻이다.
 */
export function deriveBodyWeightLoadFactor(input: {
  equipment: Equipment;
  animationFamily: MotionFamily;
}): number {
  const factors = GrowthConfig.bodyWeightLoadFactors;
  if (input.equipment !== 'bodyweight') return factors.default;

  switch (input.animationFamily) {
    case 'vertical_pull':
      return factors.verticalPull;
    case 'vertical_press':
      return factors.verticalPress;
    case 'horizontal_press':
      return factors.horizontalPress;
    case 'squat':
    case 'leg_press':
    case 'hip_hinge':
      return factors.lowerBody;
    case 'core':
      return factors.core;
    case 'cardio':
      return factors.cardio;
    default:
      return factors.default;
  }
}
