import type { CosmeticItem } from '@/types/cosmetic';

/**
 * Cosmetic 카탈로그. **콘텐츠 양산이 아니라 시스템 검증이 목적**이라 9개만 둔다.
 *
 * 가격은 여기(데이터)에만 있고 도메인 로직에는 없다 — 밸런스를 바꿀 때 고칠 곳이 한 곳이다.
 *
 * 가격 기준은 실측한 전투 재화 수입이다. 일반 웨이트 세션(12세트·5000kg) 기준으로
 * 첫 운동에 약 51, 두 번째까지 약 112, 세 번째까지 약 188이 쌓인다(맨몸은 40/90/155).
 * 그래서 가장 싼 항목을 60으로 두면 **실제 운동 한두 번에 첫 cosmetic 하나**를 연다.
 *
 * 이름은 임시 콘텐츠다. 계약은 `id`뿐이고, `cosmeticId → asset` 매핑은 CANON 병합 후
 * 별도 레이어에서 붙인다 — 여기에는 이미지도 경로도 없다.
 */
export const CosmeticCatalog: readonly CosmeticItem[] = Object.freeze([
  // 기본 제공 — 언제나 소유 상태다. 아무것도 없는 단백이를 만들지 않기 위한 바닥이다.
  Object.freeze({
    id: 'head.plain', slot: 'head', name: '민머리', unlockType: 'default', price: 0, requiredToken: null,
  }),
  Object.freeze({
    id: 'body.plain', slot: 'body', name: '기본 티셔츠', unlockType: 'default', price: 0, requiredToken: null,
  }),

  // 전투 재화로 여는 항목.
  Object.freeze({
    id: 'head.gym-cap', slot: 'head', name: '헬스장 모자', unlockType: 'coins', price: 60, requiredToken: null,
  }),
  Object.freeze({
    id: 'head.sweatband', slot: 'head', name: '땀 밴드', unlockType: 'coins', price: 120, requiredToken: null,
  }),
  Object.freeze({
    id: 'body.tank-top', slot: 'body', name: '나시', unlockType: 'coins', price: 180, requiredToken: null,
  }),
  Object.freeze({
    id: 'accessory.wrist-wraps', slot: 'accessory', name: '손목 랩', unlockType: 'coins', price: 260, requiredToken: null,
  }),
  Object.freeze({
    id: 'body.hoodie', slot: 'body', name: '후드', unlockType: 'coins', price: 400, requiredToken: null,
  }),

  // 특정 stage를 잡아야 나오는 토큰으로만 여는 항목. 재화로는 살 수 없다.
  Object.freeze({
    id: 'accessory.iron-badge', slot: 'accessory', name: '무쇠 뱃지',
    unlockType: 'token', price: 0, requiredToken: 'title.persistent',
  }),
  Object.freeze({
    id: 'accessory.champion-belt', slot: 'accessory', name: '챔피언 벨트',
    unlockType: 'token', price: 0, requiredToken: 'title.gym-breaker',
  }),
]);

/** 처음부터 소유하고 있는 항목. migration이 언제나 이 목록을 보장한다. */
export const DefaultCosmeticIds: readonly string[] = Object.freeze(
  CosmeticCatalog.filter((item) => item.unlockType === 'default').map((item) => item.id)
);

/** 카탈로그에 없는 id면 null. 화면/도메인 어디서도 없는 항목을 지어내지 않는다. */
export function getCosmeticItem(id: string): CosmeticItem | null {
  return CosmeticCatalog.find((item) => item.id === id) ?? null;
}

export function getCosmeticCatalog(): readonly CosmeticItem[] {
  return CosmeticCatalog;
}
