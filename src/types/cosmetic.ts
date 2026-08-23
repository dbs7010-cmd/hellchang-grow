/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COSMETIC — Battle 보상으로 여는 외형 수집 요소
 *
 * **외형뿐이다.** Workout 성과 / Growth / Muscle SP / Battle power / BodyParameters /
 * XP / streak / 실제 신체 데이터 어디에도 영향을 주지 않는다. pay-to-win이 될 수 있는
 * 능력치 항목을 아예 정의하지 않는 것이 이 타입의 계약이다.
 *
 * **표현과 분리돼 있다.** 여기에는 asset 경로도, 이미지도, SVG도 없다 — `id`만이 계약이고
 * `cosmeticId → asset` 매핑은 CANON이 병합된 뒤 별도 레이어에서 붙인다. 그래서 이 파일은
 * 캐릭터 렌더러가 어떻게 생겼는지 몰라도 되고, 반대로 렌더러가 바뀌어도 흔들리지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 장착 위치. CANON v3가 아직 병합되지 않아 캐릭터의 실제 부위 구조를 모르므로
 * **최소 범위만** 쓴다 — 나중에 늘리는 것이 잘못 고정한 것을 되돌리는 것보다 싸다.
 */
export type CosmeticSlot = 'head' | 'body' | 'accessory';

export type CosmeticUnlockType = 'default' | 'coins' | 'token';

export type CosmeticItem = Readonly<{
  /** 표현과 무관한 안정적 ID. 이름/이미지가 바뀌어도 이 값은 바뀌지 않는다. */
  id: string;
  slot: CosmeticSlot;
  /** 임시 콘텐츠 이름. 계약은 id뿐이다. */
  name: string;
  unlockType: CosmeticUnlockType;
  /** `unlockType === 'coins'`일 때의 가격. 그 외에는 0. */
  price: number;
  /**
   * `unlockType === 'token'`일 때 필요한 **특정** 해금 토큰 id. 그 외에는 null.
   * 토큰은 서로 교환되지 않는다 — stage 3 토큰으로 보스 보상을 열 수 없다.
   */
  requiredToken: string | null;
}>;

/** 해금 시도의 결과. 성공은 하나뿐이고 나머지는 전부 상태를 바꾸지 않는다. */
export type CosmeticUnlockOutcome =
  | 'unlocked'
  | 'already_owned'
  | 'insufficient_coins'
  | 'missing_token'
  | 'invalid_item';

export type CosmeticUnlockResult<TProgression> = Readonly<{
  outcome: CosmeticUnlockOutcome;
  /** 결과 문서. 성공이 아니면 **입력과 같은 값**이다 (실패는 아무것도 바꾸지 않는다). */
  progression: TProgression;
  item: CosmeticItem | null;
  spentCoins: number;
  spentToken: string | null;
}>;
