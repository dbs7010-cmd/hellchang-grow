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
