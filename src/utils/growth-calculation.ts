import { GrowthConfig } from '@/config/growth-config';
import type { MuscleGroupDetail, MuscleSpDistribution } from '@/types/exercise';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SP 계산 — 실제 운동 기록 → 부위별 자극
 *
 * 전부 순수 함수다 (IO 없음, Exercise DB/저장소를 모른다). 단계마다 함수를 하나씩 두고,
 * 마지막에 `calculateSessionMuscleSp()`가 그것들을 순서대로 엮는다 — 거대한 함수 하나를
 * 만들지 않는다. 숫자는 전부 `config/growth-config.ts`에서 온다.
 *
 * 설계 원칙:
 *  - **절대 중량이 아니라 상대 강도**가 기준이다. 60kg가 누군가에겐 최대치고 누군가에겐
 *    워밍업이다. 같은 노력에 같은 성장을 준다.
 *  - **어떤 입력도 SP를 폭증시키지 못한다.** 반복수는 포화하고, 강도는 상한이 있으며,
 *    같은 부위를 계속 때리면 효율이 떨어진다. 게임 때문에 위험한 운동을 하게 만들지 않는다.
 *  - **기록이 부족해도 0이 되지 않는다.** 1RM을 모르면 중립 배수로, 맨몸이면 체중으로 센다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 계산에 필요한 운동 정보. Exercise DB의 `ResolvedExercise`에서 그대로 뽑아 넣는다. */
export interface SpExerciseInput {
  exerciseId: string;
  usesWeight: boolean;
  usesBodyWeight: boolean;
  bodyWeightLoadFactor: number;
  muscleSpDistribution: MuscleSpDistribution;
  /** 추정 1RM(kg). 없으면 중립 강도로 계산한다. */
  estimatedOneRepMaxKg?: number;
  /** 완료된 세트만. 순서가 곧 수행 순서다 (피로도 누적에 쓰인다). */
  sets: { weightKg?: number; reps?: number }[];
}

export interface SetStimulusBreakdown {
  exerciseId: string;
  effectiveLoadKg: number;
  intensityMultiplier: number;
  repStimulus: number;
  fatigueMultiplier: number;
  /** 피로도까지 적용한 이 세트의 자극 */
  stimulus: number;
  /** 피로도 적용 전 (pump 연출용) */
  rawStimulus: number;
}

export interface SessionSpCalculation {
  /** 하루 상한 적용 **전**의 부위별 SP. 상한은 저장 상태를 아는 쪽(growth-state)에서 건다. */
  spByMuscle: MuscleSpDistribution;
  /** 피로도를 적용하지 않은 부위별 자극 — 일시적 pump 연출에 쓴다. */
  pumpByMuscle: MuscleSpDistribution;
  /** 개발용 검증 데이터. UI에는 노출하지 않는다. */
  sets: SetStimulusBreakdown[];
}

/**
 * Epley 추정. 정밀도를 추구하지 않는다 — 상대 강도 구간을 나눌 수 있으면 충분하다.
 * 중량이 없거나(맨몸/시간 종목) 반복수가 신뢰 구간을 벗어나면 추정하지 않는다:
 * 20회 든 무게로 역산한 1RM이 강도 보정에 들어가면 밸런스가 무너진다.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | undefined {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return undefined;
  if (weightKg <= 0 || reps <= 0) return undefined;
  if (reps > GrowthConfig.oneRepMax.maxReliableReps) return undefined;
  const load = Math.min(weightKg, GrowthConfig.load.maxPlausibleWeightKg);
  return round(load * (1 + reps / GrowthConfig.oneRepMax.epleyDivisor), 1);
}

/**
 * 이 세트에서 실제로 몸에 걸린 부하(kg).
 *  - 맨몸 운동은 0kg가 아니다. 체중 × 부하 계수 + (추가 중량).
 *  - 체중을 모르면 config의 가정값을 쓴다 — 계산 입력일 뿐, 신체 기록에 저장되지 않는다.
 *  - 말도 안 되는 중량은 잘라낸다.
 */
export function calculateEffectiveLoad(input: {
  weightKg?: number;
  usesWeight: boolean;
  usesBodyWeight: boolean;
  bodyWeightKg?: number;
  bodyWeightLoadFactor: number;
}): number {
  const added = Math.max(0, Math.min(input.weightKg ?? 0, GrowthConfig.load.maxPlausibleWeightKg));

  if (input.usesBodyWeight) {
    const bodyWeight =
      input.bodyWeightKg && input.bodyWeightKg > 0
        ? input.bodyWeightKg
        : GrowthConfig.load.assumedBodyWeightKg;
    return round(bodyWeight * input.bodyWeightLoadFactor + added, 2);
  }

  return added;
}

/**
 * 상대 강도 배수. 1RM을 모르면 중립값을 돌려준다 — "기록이 없으니 0점"이 되지 않게 한다.
 * 비율은 상한에서 잘리고, 최고 구간에서도 배수를 더 키우지 않는다.
 */
export function calculateIntensityMultiplier(
  effectiveLoadKg: number,
  oneRepMaxKg?: number
): number {
  if (!oneRepMaxKg || oneRepMaxKg <= 0 || effectiveLoadKg <= 0) {
    return GrowthConfig.intensity.unknownOneRepMax;
  }
  const ratio = Math.min(effectiveLoadKg / oneRepMaxKg, GrowthConfig.intensity.maxRatio);
  const band = GrowthConfig.intensityBands.find((candidate) => ratio >= candidate.minRatio);
  return band?.multiplier ?? GrowthConfig.intensityBands[GrowthConfig.intensityBands.length - 1].multiplier;
}

/**
 * 반복수 → 유효 반복. 선형이 아니라 포화한다:
 *   effective = max × (1 − e^(−reps / scale))
 * 10회는 8~9회분, 30회는 12회분, 1000회도 12회분이다. 가벼운 무게를 무한 반복해서
 * SP를 버는 플레이가 성립하지 않게 하는 첫 번째 장치다.
 */
export function calculateRepStimulus(reps: number): number {
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  const { maxEffectiveReps, saturationScale } = GrowthConfig.reps;
  return round(maxEffectiveReps * (1 - Math.exp(-reps / saturationScale)), 3);
}

/**
 * 같은 부위에 이미 몇 세트를 했는지에 따른 효율. 세트 수는 정수가 아니라 **가중치 합**이다
 * (벤치 한 세트는 가슴 0.6세트 + 삼두 0.25세트로 센다) — 그래서 운동을 바꿔가며 같은
 * 부위를 때려도 누적된다. 하한이 있어 정상적인 고볼륨을 과하게 처벌하지는 않는다.
 */
export function calculateFatigueMultiplier(previousEffectiveSets: number): number {
  const { decayPerSet, minMultiplier } = GrowthConfig.fatigue;
  const raw = 1 / (1 + decayPerSet * Math.max(0, previousEffectiveSets));
  return round(Math.max(minMultiplier, raw), 3);
}

/** 한 세트의 자극 = 유효 반복 × 강도 배수 × 피로도 × SP 환산 계수 */
export function calculateSetStimulus(input: {
  repStimulus: number;
  intensityMultiplier: number;
  fatigueMultiplier: number;
}): number {
  return round(
    input.repStimulus *
      input.intensityMultiplier *
      input.fatigueMultiplier *
      GrowthConfig.sp.perEffectiveRep,
    GrowthConfig.sp.decimals
  );
}

/** 자극 하나를 부위별로 나눈다. 분배 비율의 합이 1.0이므로 총량은 보존된다. */
export function distributeStimulusToMuscles(
  stimulus: number,
  distribution: MuscleSpDistribution
): MuscleSpDistribution {
  const result: MuscleSpDistribution = {};
  for (const [muscle, share] of Object.entries(distribution) as [MuscleGroupDetail, number][]) {
    const value = stimulus * share;
    if (value > 0) result[muscle] = value;
  }
  return result;
}

/**
 * 세션 하나 전체를 부위별 SP로 환산한다. 세트를 **수행 순서대로** 훑으면서 부위별 피로도를
 * 누적하므로, 같은 부위를 계속 하면 뒤로 갈수록 효율이 떨어진다.
 *
 * 하루 상한은 여기서 적용하지 않는다 — "오늘 이미 얼마나 벌었는지"는 저장된 상태를 아는
 * `growth-state.ts`의 몫이다. 이 함수는 저장소를 모른다.
 */
export function calculateSessionMuscleSp(input: {
  exercises: SpExerciseInput[];
  bodyWeightKg?: number;
}): SessionSpCalculation {
  const spByMuscle: MuscleSpDistribution = {};
  const pumpByMuscle: MuscleSpDistribution = {};
  const breakdown: SetStimulusBreakdown[] = [];
  /** 부위별 누적 유효 세트 수 (가중치 합) */
  const effectiveSets: MuscleSpDistribution = {};

  for (const exercise of input.exercises) {
    const distribution = exercise.muscleSpDistribution;
    // DB에 없는 [직접 추가] 운동은 어느 부위를 키우는지 알 수 없다 — SP를 지어내지 않는다.
    // (기록/XP/streak에는 그대로 반영되므로 운동 자체가 사라지는 것은 아니다.)
    if (Object.keys(distribution).length === 0) continue;

    for (const set of exercise.sets) {
      const reps = set.reps ?? 0;
      if (reps <= 0) continue;

      const effectiveLoadKg = calculateEffectiveLoad({
        weightKg: set.weightKg,
        usesWeight: exercise.usesWeight,
        usesBodyWeight: exercise.usesBodyWeight,
        bodyWeightKg: input.bodyWeightKg,
        bodyWeightLoadFactor: exercise.bodyWeightLoadFactor,
      });

      // 중량 종목인데 중량이 0이면(입력 안 함) 강도를 판단할 수 없다 — 중립 배수로 간다.
      const intensityMultiplier = calculateIntensityMultiplier(
        effectiveLoadKg,
        exercise.estimatedOneRepMaxKg
      );
      const repStimulus = calculateRepStimulus(reps);

      // 이 세트가 때리는 부위들의 피로도를 분배 비율로 가중 평균해 하나의 배수로 만든다.
      const fatigueMultiplier = weightedFatigue(distribution, effectiveSets);

      const stimulus = calculateSetStimulus({ repStimulus, intensityMultiplier, fatigueMultiplier });
      const rawStimulus = calculateSetStimulus({
        repStimulus,
        intensityMultiplier,
        fatigueMultiplier: 1,
      });

      addAll(spByMuscle, distributeStimulusToMuscles(stimulus, distribution));
      addAll(pumpByMuscle, distributeStimulusToMuscles(rawStimulus, distribution));
      addAll(effectiveSets, distribution);

      breakdown.push({
        exerciseId: exercise.exerciseId,
        effectiveLoadKg,
        intensityMultiplier,
        repStimulus,
        fatigueMultiplier,
        stimulus,
        rawStimulus,
      });
    }
  }

  return {
    spByMuscle: roundDistribution(spByMuscle),
    pumpByMuscle: roundDistribution(capPump(pumpByMuscle)),
    sets: breakdown,
  };
}

function weightedFatigue(
  distribution: MuscleSpDistribution,
  effectiveSets: MuscleSpDistribution
): number {
  let weighted = 0;
  let totalShare = 0;
  for (const [muscle, share] of Object.entries(distribution) as [MuscleGroupDetail, number][]) {
    weighted += calculateFatigueMultiplier(effectiveSets[muscle] ?? 0) * share;
    totalShare += share;
  }
  return totalShare > 0 ? round(weighted / totalShare, 3) : 1;
}

function capPump(pump: MuscleSpDistribution): MuscleSpDistribution {
  const capped: MuscleSpDistribution = {};
  for (const [muscle, value] of Object.entries(pump) as [MuscleGroupDetail, number][]) {
    capped[muscle] = Math.min(value * GrowthConfig.pump.multiplier, GrowthConfig.pump.maxPerMuscle);
  }
  return capped;
}

function addAll(target: MuscleSpDistribution, source: MuscleSpDistribution) {
  for (const [muscle, value] of Object.entries(source) as [MuscleGroupDetail, number][]) {
    target[muscle] = (target[muscle] ?? 0) + value;
  }
}

function roundDistribution(distribution: MuscleSpDistribution): MuscleSpDistribution {
  const rounded: MuscleSpDistribution = {};
  for (const [muscle, value] of Object.entries(distribution) as [MuscleGroupDetail, number][]) {
    rounded[muscle] = round(value, GrowthConfig.sp.decimals);
  }
  return rounded;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
