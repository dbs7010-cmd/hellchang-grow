import { CosmeticCatalog, getCosmeticItem } from '@/config/cosmetics';
import type { BattleProgressionState } from '@/types/battle';
import type { CosmeticItem, CosmeticUnlockResult } from '@/types/cosmetic';
import { migrateBattleProgression, sanitizeOwnedCosmeticIds } from '@/utils/battle-state';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COSMETIC UNLOCK — Battle 보상을 외형으로 바꾸는 순수 레이어
 *
 * **능력치를 만들지 않는다.** 여기서 나오는 결과는 "무엇을 가졌는가"뿐이고, Battle power /
 * Workout / Growth / Muscle SP / BodyParameters / XP / streak 어디에도 닿지 않는다.
 * cosmetic을 아무리 사도 더 세게 때리지 않는다 — pay-to-win이 될 경로 자체가 없다.
 *
 * **표현을 모른다.** asset도 이미지도 렌더러도 import하지 않는다. 여기서 다루는 것은
 * id와 소유 여부뿐이고, `cosmeticId → asset` 매핑은 CANON 병합 후 별도 레이어의 몫이다.
 *
 * 순수 함수다 — 실패하면 문서를 **하나도** 바꾸지 않고, 성공할 때만 재화/토큰/소유가
 * 같은 새 문서에서 함께 움직인다. 저장은 호출부(`battle-sync`)가 한 번에 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BattleCosmeticUnlockResult = CosmeticUnlockResult<BattleProgressionState>;

export function isCosmeticOwned(progression: BattleProgressionState, cosmeticId: string): boolean {
  return migrateBattleProgression(progression).ownedCosmeticIds.includes(cosmeticId);
}

/** 지금 보유한 항목을 카탈로그 순서로. 카탈로그에서 사라진 id는 표시할 것이 없으므로 뺀다. */
export function getOwnedCosmetics(progression: BattleProgressionState): readonly CosmeticItem[] {
  const owned = new Set(migrateBattleProgression(progression).ownedCosmeticIds);
  return CosmeticCatalog.filter((item) => owned.has(item.id));
}

/** 지금 이 항목을 열 수 있는가 — 화면이 버튼을 흐리게 할지 정할 때 쓴다(상태를 바꾸지 않는다). */
export function canUnlockCosmetic(
  progression: BattleProgressionState,
  cosmeticId: string
): BattleCosmeticUnlockResult['outcome'] {
  return unlockCosmetic(progression, cosmeticId).outcome;
}

/**
 * cosmetic 하나를 연다.
 *
 * 성공(`unlocked`)일 때만 재화가 줄고, 토큰이 소비되고, 소유 목록이 늘어난다.
 * 나머지 결과는 **입력 문서를 그대로 돌려준다** — 실패한 구매가 재화를 축내지 않는다.
 *
 * 토큰은 서로 교환되지 않는다: 항목이 요구하는 **그 id**를 갖고 있어야 하고, 열면 그
 * 토큰만 사라진다. stage 3 토큰으로 보스 보상을 열 수 없다.
 */
export function unlockCosmetic(
  progression: BattleProgressionState,
  cosmeticId: string
): BattleCosmeticUnlockResult {
  const safe = migrateBattleProgression(progression);
  const fail = (outcome: BattleCosmeticUnlockResult['outcome'], item: CosmeticItem | null = null) =>
    ({ outcome, progression: safe, item, spentCoins: 0, spentToken: null }) as const;

  const item = typeof cosmeticId === 'string' ? getCosmeticItem(cosmeticId) : null;
  if (!item) return fail('invalid_item');
  if (safe.ownedCosmeticIds.includes(item.id)) return fail('already_owned', item);

  if (item.unlockType === 'token') {
    const required = item.requiredToken;
    if (!required || !safe.unlockTokens.includes(required)) return fail('missing_token', item);
    return {
      outcome: 'unlocked',
      progression: {
        ...safe,
        // 요구한 그 토큰 하나만 뺀다. 다른 토큰은 그대로 남는다.
        unlockTokens: safe.unlockTokens.filter((token) => token !== required),
        ownedCosmeticIds: sanitizeOwnedCosmeticIds([...safe.ownedCosmeticIds, item.id]),
      },
      item,
      spentCoins: 0,
      spentToken: required,
    };
  }

  // 기본 항목은 migration이 이미 소유로 만들어 두므로 여기 도달하면 already_owned였다.
  const price = item.unlockType === 'coins' ? Math.max(0, Math.floor(item.price)) : 0;
  if (safe.coins < price) return fail('insufficient_coins', item);

  return {
    outcome: 'unlocked',
    progression: {
      ...safe,
      coins: safe.coins - price,
      ownedCosmeticIds: sanitizeOwnedCosmeticIds([...safe.ownedCosmeticIds, item.id]),
    },
    item,
    spentCoins: price,
    spentToken: null,
  };
}
