import { BattleConfig } from '@/config/battle-config';
import type { BattleProgressionState } from '@/types/battle';
import { recoverBattleFatigue } from '@/utils/battle-power';
import { migrateBattleProgression, safeTimestamp } from '@/utils/battle-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE FATIGUE RECOVERY — 흐른 시간을 저장된 피로도에 반영하는 순수 레이어
 *
 * **시계를 읽지 않는다.** 현재 시각은 언제나 인자로 들어온다. 그래야 도메인이 결정적으로
 * 남고, 오프라인 10시간을 테스트로 재현할 수 있다.
 *
 * **타이머를 돌리지 않는다.** 백그라운드 작업도, interval도 없다. 읽거나 전투할 때
 * "그동안 얼마나 지났는지"를 계산해 그 자리에서 반영하는 lazy materialization이다.
 * 앱이 꺼져 있어도 시간은 흐르므로 회복은 자동으로 따라온다.
 *
 * **게임 쪽 피로도다.** DanbaekBodyState의 recoveryState / nutritionState / 실제 운동
 * 피로 / Muscle SP / Growth Stage와 아무 관계가 없고, 그쪽을 읽지도 쓰지도 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const HourMs = 60 * 60 * 1000;

export interface BattleRecoveryResult {
  /** 회복이 반영된 문서. 회복할 것이 없으면 입력과 같은 값이다. */
  progression: BattleProgressionState;
  /** 이번에 실제로 깎인 피로도(정수 ≥ 0). */
  recovered: number;
  /** 저장할 필요가 있는가 — 아무것도 바뀌지 않았으면 쓰지 않는다. */
  changed: boolean;
}

/**
 * 흐른 시간만큼 피로도를 회복한 문서를 만든다.
 *
 * ### 왜 정수 단위로 쌓는가
 * 피로도 1이 쌓일 만큼(정책상 30분) 시간이 지나야 실제로 깎이고, **남은 자투리 시간은
 * 기준 시각에 그대로 남는다**. 그래서 앱을 자주 열었다 닫아도 회복량이 사라지지 않고,
 * 1분마다 조회해도 값이 흔들리거나 매번 저장이 일어나지 않는다.
 *
 * ### 시계가 이상할 때
 *  - 기준 시각이 없으면(첫 실행/손상) 회복을 주지 않고 **지금을 기준으로 삼는다**.
 *  - 기준 시각이 미래면(기기 시간이 뒤로 감) 회복은 0이고 기준을 지금으로 당긴다 —
 *    그대로 두면 실제 시간이 따라잡을 때까지 회복이 영영 멈춘다.
 *  - 흐른 시간은 절대 음수가 되지 않으므로 피로도가 회복으로 **늘어나는 일은 없다**.
 *
 * 회복 공식은 새로 만들지 않는다. 깎이는 양은 기존 `recoverBattleFatigue`가 정한다.
 */
export function recoverBattleProgression(
  progression: BattleProgressionState,
  nowMs: number
): BattleRecoveryResult {
  const safe = migrateBattleProgression(progression);
  const now = safeTimestamp(nowMs);

  // 지금이 언제인지 모르면 아무것도 하지 않는다 (NaN/Infinity/음수 방어).
  if (now === null) return { progression: safe, recovered: 0, changed: false };

  const anchor = safe.fatigueUpdatedAt;
  // 기준이 없거나 미래다 → 회복 없이 기준만 지금으로 세운다.
  if (anchor === null || anchor > now) {
    return {
      progression: { ...safe, fatigueUpdatedAt: now },
      recovered: 0,
      changed: safe.fatigueUpdatedAt !== now,
    };
  }

  const currentFatigue = safe.battle.fatigue;
  if (currentFatigue <= 0) {
    // 더 깎일 것이 없다. 기준만 지금으로 당겨 두면 다음 계산이 짧아진다.
    return {
      progression: { ...safe, fatigueUpdatedAt: now },
      recovered: 0,
      changed: safe.fatigueUpdatedAt !== now,
    };
  }

  const elapsedHours = (now - anchor) / HourMs;
  const perHour = BattleConfig.recovery.fatiguePerHour;
  // 실제로 깎이는 만큼만 시간을 소비한다 — 남은 자투리는 기준 시각에 남겨 손실을 막는다.
  const recovered = Math.min(currentFatigue, Math.floor(elapsedHours * perHour));

  if (recovered <= 0) return { progression: safe, recovered: 0, changed: false };

  const consumedMs = Math.round((recovered / perHour) * HourMs);
  return {
    progression: {
      ...safe,
      battle: { ...safe.battle, fatigue: recoverBattleFatigue(currentFatigue, recovered / perHour) },
      fatigueUpdatedAt: anchor + consumedMs,
    },
    recovered,
    changed: true,
  };
}

/**
 * 화면이 물어보는 값들. 저장하지 않는 표시용 파생값이라 상태와 중복 관리할 것이 없다.
 */
export interface BattleFatigueView {
  /** 저장된 값 그대로 (회복 반영 전). */
  storedFatigue: number;
  /** 지금 기준으로 회복을 반영한 값. */
  currentFatigue: number;
  recovered: number;
  /** 피로도 1이 더 깎이기까지 남은 시간(ms). 이미 0이면 null. */
  msUntilNextRecovery: number | null;
  /** 전부 회복되기까지 남은 시간(ms). 이미 0이면 0. */
  msUntilFullRecovery: number;
}

export function describeBattleFatigue(
  progression: BattleProgressionState,
  nowMs: number
): BattleFatigueView {
  const safe = migrateBattleProgression(progression);
  const { progression: recoveredProgression, recovered } = recoverBattleProgression(safe, nowMs);
  const currentFatigue = recoveredProgression.battle.fatigue;
  const perHour = BattleConfig.recovery.fatiguePerHour;
  const now = safeTimestamp(nowMs);
  const anchor = recoveredProgression.fatigueUpdatedAt;

  const msPerPoint = HourMs / perHour;
  const carriedMs = now !== null && anchor !== null && now > anchor ? now - anchor : 0;

  return {
    storedFatigue: safe.battle.fatigue,
    currentFatigue,
    recovered,
    msUntilNextRecovery: currentFatigue > 0 ? Math.max(0, msPerPoint - carriedMs) : null,
    msUntilFullRecovery: Math.max(0, Math.round(currentFatigue * msPerPoint - carriedMs)),
  };
}
