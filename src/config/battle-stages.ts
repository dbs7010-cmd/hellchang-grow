import type { BattleStageDefinition } from '@/types/battle';

/**
 * Stage 정의. **바뀔 가능성이 높은 숫자는 화면이 아니라 여기 한 곳에만 둔다** —
 * app-config와 growth-config가 이미 쓰는 방식 그대로다.
 *
 * v1은 밸런싱 시스템이 아니라 "안전하게 도는 progression loop"가 목표라, 요구 진행도만
 * 완만하게 늘리고 피로도 비용은 stage와 무관하게 일정하게 둔다. 실제 밸런싱은 루프가
 * 검증된 뒤에 한다.
 */
export const BattleStages: readonly BattleStageDefinition[] = Object.freeze([
  Object.freeze({ stage: 1, progressRequired: 10, fatigueCost: 8 }),
  Object.freeze({ stage: 2, progressRequired: 14, fatigueCost: 8 }),
  Object.freeze({ stage: 3, progressRequired: 18, fatigueCost: 10 }),
  Object.freeze({ stage: 4, progressRequired: 24, fatigueCost: 10 }),
  Object.freeze({ stage: 5, progressRequired: 32, fatigueCost: 12 }),
]);

export const FirstBattleStage = BattleStages[0].stage;
export const MaxBattleStage = BattleStages[BattleStages.length - 1].stage;

/**
 * 지금 상태가 상대하는 stage 정의. 정의가 없는 stage 번호(저장값 손상, 마지막 stage 초과)는
 * 가장 가까운 유효 stage로 떨어진다 — 조회 때문에 게임이 멈추지 않게 한다.
 */
export function getBattleStage(stage: number): BattleStageDefinition {
  if (!Number.isFinite(stage)) return BattleStages[0];
  const clamped = Math.min(MaxBattleStage, Math.max(FirstBattleStage, Math.floor(stage)));
  return BattleStages.find((definition) => definition.stage === clamped) ?? BattleStages[0];
}

/** 마지막 stage인가 — 더 오를 곳이 없으면 진행도만 쌓인다. */
export function isFinalBattleStage(stage: number): boolean {
  return Math.floor(stage) >= MaxBattleStage;
}
