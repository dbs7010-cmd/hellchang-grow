import { BattleConfig } from '@/config/battle-config';
 import {
  BattleProgressionVersion,
  BattleStateVersion,
  INITIAL_BATTLE_PROGRESSION,
  INITIAL_BATTLE_STATE,
  type BattleProgressionState,
  type BattleResolution,
  type BattleState,
} from '@/types/battle';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE STATE — 저장된 값을 현재 스키마로 맞추는 순수 레이어
 *
 * 읽기/쓰기는 `data/battle-repository.ts`가, 승패 판정은 `utils/battle.ts`가 맡는다.
 * 여기는 그 사이에서 "믿을 수 없는 값을 안전한 범위로 되돌리는" 일만 한다 —
 * growth-state.ts의 migrateGrowthState와 같은 자리다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const MinBattleFatigue = 0;
export const MaxBattleFatigue = 100;

/**
 * 숫자로 믿을 수 있는 값만 통과시킨다. NaN/Infinity/문자열은 fallback으로 떨어진다 —
 * 손상된 저장값 하나가 게임 상태 전체를 NaN으로 물들이지 않게 하는 최소 방어다.
 */
export function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clampFatigue(value: unknown): number {
  return Math.min(MaxBattleFatigue, Math.max(MinBattleFatigue, safeNumber(value, MinBattleFatigue)));
}

export function createInitialBattleState(): BattleState {
  return { ...INITIAL_BATTLE_STATE };
}

/**
 * 저장된 값 → 항상 완전하고 안전한 BattleState.
 *
 * 알고 있는 값은 그대로 두고 빠진/이상한 필드만 되돌린다. 진행도와 stage는 음수가 될 수
 * 없고, 피로도는 언제나 0~100이며, workoutId는 문자열이 아니면 없는 것으로 본다.
 */
export function migrateBattleState(stored: Partial<BattleState> | null | undefined): BattleState {
  if (!stored || typeof stored !== 'object') return createInitialBattleState();

  const lastResolvedWorkoutId =
    typeof stored.lastResolvedWorkoutId === 'string' && stored.lastResolvedWorkoutId.length > 0
      ? stored.lastResolvedWorkoutId
      : null;

  return {
    version: BattleStateVersion,
    currentStage: Math.max(1, Math.floor(safeNumber(stored.currentStage, INITIAL_BATTLE_STATE.currentStage))),
    stageProgress: Math.max(0, Math.floor(safeNumber(stored.stageProgress, 0))),
    fatigue: clampFatigue(stored.fatigue),
    lastResolvedWorkoutId,
  };
}

// ── 저장 문서(진행 + 경제) ───────────────────────────────────────────────────

/**
 * 재화는 정수이고 0 이상이며 상한을 넘지 않는다. NaN/Infinity/음수/문자열은 0으로 떨어진다 —
 * 손상된 저장값 하나가 경제를 무한대로 밀어 올리지 못하게 하는 안전장치다.
 */
export function clampCoins(value: unknown): number {
  const safe = Math.floor(safeNumber(value, 0));
  return Math.min(BattleConfig.economy.maxCoins, Math.max(0, safe));
}

/**
 * 토큰 목록을 믿을 수 있는 모양으로 되돌린다 — 문자열만, 빈 값 제외, 중복 제거, 개수 상한.
 * 배열이 아니면 빈 목록이다.
 */
export function sanitizeUnlockTokens(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry === 'string' && entry.length > 0) unique.add(entry);
    if (unique.size >= BattleConfig.economy.maxUnlockTokens) break;
  }
  return [...unique];
}

/**
 * 저장된 timestamp를 믿을 수 있는 값으로 되돌린다.
 *
 * 유한한 양수만 통과한다. NaN / Infinity / 음수 / 0 / 문자열은 **null**(기준 없음)이다 —
 * 손상된 값을 epoch(0)로 읽으면 "수십 년이 흘렀다"가 되어 공짜 회복을 주게 된다.
 */
export function safeTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

export function createInitialBattleProgression(): BattleProgressionState {
  return {
    ...INITIAL_BATTLE_PROGRESSION,
    battle: createInitialBattleState(),
    unlockTokens: [],
    fatigueUpdatedAt: null,
  };
}

/**
 * 저장된 값 → 항상 완전하고 안전한 진행 문서.
 *
 * 두 가지 모양을 모두 받는다.
 *  - 지금 스키마: `{ version, battle, coins, unlockTokens }`
 *  - 이전 스키마: BattleState가 그대로 저장돼 있던 형태 (경제가 없던 시절)
 *
 * 어느 쪽이든 진행도는 보존하고 빠진 경제 필드만 0에서 시작한다 — 스키마가 늘었다고
 * 사용자가 이미 깬 stage를 잃지 않게 하는 최소한의 backward-compatible 보정이다.
 */
export function migrateBattleProgression(
  stored: Partial<BattleProgressionState> | Partial<BattleState> | null | undefined
): BattleProgressionState {
  if (!stored || typeof stored !== 'object') return createInitialBattleProgression();

  const wrapped = stored as Partial<BattleProgressionState>;
  // `battle`이 없으면 경제가 생기기 전의 저장값이다 — 문서 전체를 전투 상태로 읽는다.
  const battleSource =
    wrapped.battle && typeof wrapped.battle === 'object'
      ? wrapped.battle
      : (stored as Partial<BattleState>);

  return {
    version: BattleProgressionVersion,
    battle: migrateBattleState(battleSource),
    coins: clampCoins(wrapped.coins),
    unlockTokens: sanitizeUnlockTokens(wrapped.unlockTokens),
    fatigueUpdatedAt: safeTimestamp(wrapped.fatigueUpdatedAt),
  };
}

/**
 * 전투 결과 하나를 진행 문서에 반영한 **새 문서**를 만든다. 순수 함수이고 원본을 건드리지 않는다.
 *
 * 전투 진행과 재화를 **함께** 갱신하는 것이 요점이다 — 이 결과를 한 번 저장하면 피해도,
 * 피로도도, stage도, 재화도, 토큰도 모두 반영되거나 모두 반영되지 않는다.
 *
 * `nowMs`는 전투가 일어난 시각이다. 피로도가 이때 올랐으므로 회복 기준점도 여기로 옮긴다 —
 * **시계는 바깥에서 주입한다**(도메인이 직접 읽지 않는다). 중복 전투는 아무것도 바꾸지
 * 않으므로 회복 기준점도 그대로 남는다.
 */
export function applyBattleResolution(
  progression: BattleProgressionState,
  resolution: BattleResolution,
  nowMs: number
): BattleProgressionState {
  const safe = migrateBattleProgression(progression);
  if (resolution.outcome === 'duplicate') return safe;

  const tokens = resolution.reward.unlockToken
    ? sanitizeUnlockTokens([...safe.unlockTokens, resolution.reward.unlockToken])
    : safe.unlockTokens;

  return {
    ...safe,
    battle: resolution.nextState,
    coins: clampCoins(safe.coins + clampCoins(resolution.reward.coins)),
    unlockTokens: tokens,
    // 시각을 믿을 수 없으면 기준을 세우지 않는다 — 다음 조회가 그때를 기준으로 다시 잡는다.
    fatigueUpdatedAt: safeTimestamp(nowMs) ?? safe.fatigueUpdatedAt,
  };
}

/** 이 토큰을 이미 가지고 있는가. 화면이 해금 여부를 물어볼 때 쓴다. */
export function hasUnlockToken(progression: BattleProgressionState, token: string): boolean {
  return migrateBattleProgression(progression).unlockTokens.includes(token);
}
