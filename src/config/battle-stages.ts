import type { BattleStageDefinition } from '@/types/battle';

/**
 * Stage 정의 = 적 정의. **바뀔 가능성이 높은 숫자는 화면이 아니라 여기 한 곳에만 둔다** —
 * app-config와 growth-config가 이미 쓰는 방식 그대로다.
 *
 * v1은 밸런싱 시스템이 아니라 "안전하게 도는 progression loop"가 목표라 5마리만 둔다.
 * `progressRequired`가 곧 적의 HP이고, 누적 피해(stageProgress)가 거기 닿으면 잡는다.
 *
 * `enemyId`는 표현과 분리된 안정적인 ID다 — 나중에 이미지/이름/연출이 붙거나 바뀌어도
 * 저장된 진행도가 어긋나지 않는다. 아래 이름은 임시 콘텐츠이며 ID만 계약이다.
 */
export const BattleStages: readonly BattleStageDefinition[] = Object.freeze([
  Object.freeze({
    stage: 1,
    enemyId: 'rusty-dumbbell',
    enemyName: '녹슨 덤벨',
    enemyType: 'normal',
    progressRequired: 10,
    fatigueCost: 8,
    reward: Object.freeze({ clearCoins: 20, unlockToken: null }),
  }),
  Object.freeze({
    stage: 2,
    enemyId: 'creaking-bench',
    enemyName: '삐걱대는 벤치',
    enemyType: 'normal',
    progressRequired: 14,
    fatigueCost: 8,
    reward: Object.freeze({ clearCoins: 30, unlockToken: null }),
  }),
  Object.freeze({
    stage: 3,
    enemyId: 'treadmill-hound',
    enemyName: '러닝머신 하운드',
    enemyType: 'normal',
    progressRequired: 18,
    fatigueCost: 10,
    reward: Object.freeze({ clearCoins: 45, unlockToken: 'title.persistent' }),
  }),
  Object.freeze({
    stage: 4,
    enemyId: 'squat-rack-golem',
    enemyName: '스쿼트랙 골렘',
    enemyType: 'normal',
    progressRequired: 24,
    fatigueCost: 10,
    reward: Object.freeze({ clearCoins: 60, unlockToken: null }),
  }),
  Object.freeze({
    stage: 5,
    enemyId: 'iron-gym-master',
    enemyName: '무쇠 관장',
    enemyType: 'boss',
    progressRequired: 32,
    fatigueCost: 12,
    reward: Object.freeze({ clearCoins: 120, unlockToken: 'title.gym-breaker' }),
  }),
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
