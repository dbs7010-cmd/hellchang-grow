import { AppConfig } from '@/config/app-config';

/**
 * PASS는 운동 행동(세션 완료/PR/루틴 완료)으로 쌓이는 게임 진행도다. 사용자의 실제 몸/근육
 * 수치를 올리지 않는다(제품 기획 21장) — 레벨은 저장하지 않고 xp에서 매번 계산한다.
 */
export function addXp(currentXp: number, amount: number): number {
  return Math.max(0, currentXp + amount);
}

export interface PassLevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  progress: number;
}

export function computePassLevelProgress(xp: number): PassLevelProgress {
  const xpForLevel = AppConfig.passXpPerLevel;
  const level = Math.floor(xp / xpForLevel) + 1;
  const xpIntoLevel = xp % xpForLevel;
  return { level, xpIntoLevel, xpForLevel, progress: xpIntoLevel / xpForLevel };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PR 보상 정책 (제품 결정)
 *
 * PR은 두 종류다(`utils/exercise-history`의 taxonomy — 여기서 바꾸지 않는다):
 *   weight : 그 운동의 **최고 중량**을 갱신했다 → 공식 PR, HELL PASS PR XP 대상
 *   reps   : 같은 중량에서 **최고 횟수**를 갱신했다(맨몸 포함) → 실제 PR로 남지만
 *            PR XP를 추가로 주지는 않는다
 *
 * 왜 나누는가: rep PR은 같은 중량에서 매 세션 쉽게 반복될 수 있어, XP를 주면 진행도가
 * 중량 성장이 아니라 반복 횟수로 흘러간다. 그렇다고 기록에서 지우면 사용자가 실제로
 * 달성한 것을 앱이 부정하게 된다. 그래서 **기록/표시에는 남기고 보상만 분리**한다.
 *
 * 이 정책은 화면이 아니라 여기 한 곳에 있다 — 예전에는 완료 파이프라인이 `prs.length`를
 * 그대로 곱해서, 종류를 구분하지 않고 rep PR에도 XP가 나갔다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** PR XP를 받을 수 있는 PR인가. 지금 정책은 최고 중량 갱신만 인정한다. */
export function isRewardEligiblePr(pr: { kind: 'weight' | 'reps' }): boolean {
  return pr.kind === 'weight';
}

/** 이번 세션의 PR 중 XP 대상 개수. rep PR은 세지 않는다(기록에서 지우지는 않는다). */
export function countRewardEligiblePrs(prs: { kind: 'weight' | 'reps' }[]): number {
  return prs.filter(isRewardEligiblePr).length;
}

export interface SessionXpAward {
  xpAwarded: number;
  /** XP를 발생시킨 PR 수. prs.length와 다를 수 있다(rep PR 제외). */
  rewardEligiblePrCount: number;
}

/**
 * 세션 완료로 주는 PASS XP. 값과 계산 의미는 기존과 같다
 * (세션 + PR×PR당 XP + 루틴 완료 보너스) — 달라진 것은 **어떤 PR을 세는가** 하나뿐이다.
 */
export function computeSessionXpAward(input: {
  prs: { kind: 'weight' | 'reps' }[];
  routineCompleted: boolean;
}): SessionXpAward {
  const rewardEligiblePrCount = countRewardEligiblePrs(input.prs);
  return {
    rewardEligiblePrCount,
    xpAwarded:
      AppConfig.passXpPerSession +
      rewardEligiblePrCount * AppConfig.passXpPerPr +
      (input.routineCompleted ? AppConfig.passXpPerRoutineCompletion : 0),
  };
}
