import { BattleConfig } from '@/config/battle-config';
import type { BattleInput, BattlePowerBreakdown } from '@/types/battle';
import { clampFatigue, safeNumber } from '@/utils/battle-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE POWER — 수행량을 전투력으로 바꾸는 순수 레이어
 *
 * **실제 신체 수치는 여기 들어오지 않는다.** 체중도, 체지방도, 골격근량도 전투력이 되지
 * 않는다 — Battle이 보는 것은 이미 검증된 "오늘 얼마나 했는가"뿐이다.
 *
 * 새 운동 판정식을 만들지 않는다. 유효 세트인지 아닌지는 운동 쪽 규칙(isEffectiveSet)이
 * 이미 끝냈고, 여기 도착한 세트 수와 볼륨은 그 결과다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 피로도를 적용하기 전의 전투력.
 *
 *   base = 유효 세트 × 2 + floor(sqrt(볼륨 / 100))
 *
 * 두 항을 함께 쓰는 이유가 각각 있다.
 *  - **세트 항**: 맨몸/0kg 운동도 정상적인 전투력이 나와야 한다. 볼륨이 0이어도 실제로
 *    운동했으므로 전투력이 0이 되면 안 된다.
 *  - **볼륨 항의 제곱근**: 중량만 높은 사용자가 선형으로 앞서 나가지 않게 한다. 볼륨이
 *    4배가 되어야 이 항이 2배가 되므로 무겁게 드는 쪽이 유리하되 압도하지 않는다.
 *
 * NaN/Infinity/음수/문자열이 들어와도 0으로 떨어진다.
 */
export function calculateBattlePower(input: BattleInput): number {
  const sets = Math.max(0, Math.floor(safeNumber(input?.completedSetCount, 0)));
  const volume = Math.max(0, safeNumber(input?.totalVolumeKg, 0));

  const setPower = sets * BattleConfig.power.perEffectiveSet;
  const volumePower = Math.floor(Math.sqrt(volume / BattleConfig.power.volumeUnitKg));
  return setPower + volumePower;
}

/**
 * 피로도 구간 배수(0~1). 높을수록 효율이 떨어지지만 **막지는 않는다** — 최대 감소는 30%다.
 * 구간은 config에 threshold 내림차순으로 있고 위에서부터 처음 걸리는 것을 쓴다.
 */
export function fatiguePowerMultiplier(fatigue: number): number {
  const safe = clampFatigue(fatigue);
  const tier = BattleConfig.fatiguePenalty.find((row) => safe >= row.fatigueAtLeast);
  return tier ? tier.multiplier : 1;
}

/**
 * 이번 전투에서 실제로 적에게 들어가는 피해.
 *
 * **실제로 운동했다면 피해는 최소 1이다.** 피로도가 아무리 높아도 "운동했는데 전투력 0"이
 * 되지 않게 하는 바닥이다. 애초에 수행량이 0인 운동(유효 세트 없음)은 그대로 0이다.
 */
export function resolveBattlePower(input: BattleInput, fatigue: number): BattlePowerBreakdown {
  const base = calculateBattlePower(input);
  const fatigueMultiplier = fatiguePowerMultiplier(fatigue);
  const reduced = Math.floor(base * fatigueMultiplier);
  const applied = base > 0 ? Math.max(BattleConfig.power.minimumWhenTrained, reduced) : 0;

  return { base, fatigueMultiplier, applied };
}

/**
 * 쉬는 동안 회복되는 피로도.
 *
 * **시계를 읽지 않는다** — 얼마가 흘렀는지는 호출부가 넘긴다. 그래야 resolver 전체가
 * 결정적으로 남고 테스트가 가능하다. 앱 lifecycle 연결은 다음 slice의 몫이다.
 */
export function recoverBattleFatigue(fatigue: number, elapsedHours: number): number {
  const hours = Math.max(0, safeNumber(elapsedHours, 0));
  const recovered = hours * BattleConfig.recovery.fatiguePerHour;
  return clampFatigue(clampFatigue(fatigue) - recovered);
}
