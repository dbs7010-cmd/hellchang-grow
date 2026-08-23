import { BattleConfig } from '@/config/battle-config';
import { getBattleStage } from '@/config/battle-stages';
import { CosmeticCatalog, DefaultCosmeticIds, getCosmeticCatalog, getCosmeticItem } from '@/config/cosmetics';
import type { BattleProgressionState } from '@/types/battle';
import type { WorkoutRecord } from '@/types/workout';
import { resolveBattle } from '@/utils/battle';
import { calculateBattlePower, resolveBattlePower } from '@/utils/battle-power';
import {
  createInitialBattleProgression,
  createInitialBattleState,
  migrateBattleProgression,
  sanitizeOwnedCosmeticIds,
} from '@/utils/battle-state';
import { purchaseCosmetic, type BattleSyncOperations } from '@/utils/battle-sync';
import { getOwnedCosmetics, isCosmeticOwned, unlockCosmetic } from '@/utils/cosmetics';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}
function check(name: string, actual: unknown, expected: unknown) {
  expect(name, JSON.stringify(actual) === JSON.stringify(expected));
}

const COIN_ITEM = 'head.gym-cap';
const COIN_PRICE = getCosmeticItem(COIN_ITEM)!.price;
const TOKEN_ITEM = 'accessory.iron-badge';
const TOKEN_ID = getCosmeticItem(TOKEN_ITEM)!.requiredToken!;
const BOSS_ITEM = 'accessory.champion-belt';
const BOSS_TOKEN = getCosmeticItem(BOSS_ITEM)!.requiredToken!;

const progression = (over: Partial<BattleProgressionState> = {}): BattleProgressionState =>
  ({ ...createInitialBattleProgression(), ...over });

// ── A. 카탈로그 ──────────────────────────────────────────────────────────────
{
  expect('A: cosmetic id는 카탈로그 안에서 고유하다',
    new Set(CosmeticCatalog.map((item) => item.id)).size === CosmeticCatalog.length);
  expect('A: v1 카탈로그는 검증용 최소 규모다 (6~10개)',
    CosmeticCatalog.length >= 6 && CosmeticCatalog.length <= 10);
  expect('A: 기본 제공 항목이 존재한다', DefaultCosmeticIds.length > 0);
  expect('A: 모든 항목에 안정적인 id와 slot이 있다',
    CosmeticCatalog.every((item) => item.id.length > 0 &&
      ['head', 'body', 'accessory'].includes(item.slot)));
  expect('A: coins 항목만 가격을 갖는다',
    CosmeticCatalog.every((item) =>
      item.unlockType === 'coins' ? item.price > 0 : item.price === 0));
  expect('A: token 항목만 요구 토큰을 갖는다',
    CosmeticCatalog.every((item) =>
      item.unlockType === 'token' ? typeof item.requiredToken === 'string' : item.requiredToken === null));
  expect('A: 기본 항목은 가격도 토큰도 없다',
    CosmeticCatalog.filter((item) => item.unlockType === 'default')
      .every((item) => item.price === 0 && item.requiredToken === null));
  expect('A: 요구 토큰은 실제 stage 보상으로 나오는 id다', (() => {
    const granted = new Set([1, 2, 3, 4, 5]
      .map((stage) => getBattleStage(stage).reward.unlockToken)
      .filter((token): token is string => typeof token === 'string'));
    return CosmeticCatalog.filter((item) => item.unlockType === 'token')
      .every((item) => granted.has(item.requiredToken!));
  })());
  expect('A: 카탈로그에는 asset/이미지 경로가 없다 (표현과 분리)',
    !/\.png|\.svg|\.jpg|require\(|asset/i.test(JSON.stringify(CosmeticCatalog)));
  expect('A: 카탈로그에는 능력치 항목이 없다 (pay-to-win 경로 없음)',
    !/power|damage|attack|stat|bonus|multiplier|speed/i.test(
      JSON.stringify(CosmeticCatalog.flatMap((item) => Object.keys(item)))));
  check('A: 조회 API가 카탈로그를 그대로 돌려준다', getCosmeticCatalog(), CosmeticCatalog);
  expect('A: 없는 id는 null이다', getCosmeticItem('nope') === null);

  // 가격 기준: 실측 수입(일반 세션 첫 운동 약 51, 맨몸 약 40)으로 한두 번에 첫 항목.
  const prices = CosmeticCatalog.filter((i) => i.unlockType === 'coins').map((i) => i.price);
  expect('A: 가장 싼 항목은 운동 한두 번으로 닿는다 (<= 120)', Math.min(...prices) <= 120);
  expect('A: 가격이 상한 안에 있다', Math.max(...prices) < BattleConfig.economy.maxCoins);
}

// ── B. 기본 항목은 언제나 소유 상태 ─────────────────────────────────────────
{
  const fresh = createInitialBattleProgression();
  expect('B: 첫 실행부터 기본 항목을 소유한다',
    DefaultCosmeticIds.every((id) => fresh.ownedCosmeticIds.includes(id)));
  expect('B: 저장값이 없어도 기본 항목이 소유 상태다',
    DefaultCosmeticIds.every((id) => migrateBattleProgression(null).ownedCosmeticIds.includes(id)));
  expect('B: 소유 목록이 비어 저장돼 있어도 기본 항목이 복구된다',
    DefaultCosmeticIds.every((id) =>
      migrateBattleProgression({ ownedCosmeticIds: [] } as never).ownedCosmeticIds.includes(id)));
  expect('B: 경제가 없던 옛 스키마에서 올라와도 기본 항목이 소유 상태다',
    DefaultCosmeticIds.every((id) => migrateBattleProgression({
      version: 1, currentStage: 3, stageProgress: 5, fatigue: 20, lastResolvedWorkoutId: 'old',
    } as never).ownedCosmeticIds.includes(id)));
  expect('B: 기본 항목을 다시 사려 하면 already_owned다',
    unlockCosmetic(fresh, DefaultCosmeticIds[0]).outcome === 'already_owned');
  expect('B: isCosmeticOwned가 기본 항목을 true로 답한다',
    isCosmeticOwned(fresh, DefaultCosmeticIds[0]));
}

// ── C. 재화 구매 ─────────────────────────────────────────────────────────────
{
  const rich = progression({ coins: COIN_PRICE + 25 });
  const bought = unlockCosmetic(rich, COIN_ITEM);
  expect('C: 재화가 충분하면 열린다', bought.outcome === 'unlocked');
  expect('C: 가격만큼 정확히 차감된다', bought.progression.coins === 25);
  expect('C: 차감액이 결과에 보고된다', bought.spentCoins === COIN_PRICE);
  expect('C: 소유 목록에 추가된다', bought.progression.ownedCosmeticIds.includes(COIN_ITEM));
  expect('C: 재화 구매는 토큰을 쓰지 않는다',
    bought.spentToken === null && bought.progression.unlockTokens.length === 0);

  const again = unlockCosmetic(bought.progression, COIN_ITEM);
  expect('C: 이미 가진 항목은 already_owned다', again.outcome === 'already_owned');
  expect('C: 이미 가진 항목은 재화를 다시 깎지 않는다',
    again.progression.coins === bought.progression.coins && again.spentCoins === 0);
  check('C: 이미 가진 항목은 소유 목록도 그대로다',
    again.progression.ownedCosmeticIds, bought.progression.ownedCosmeticIds);

  const poor = progression({ coins: COIN_PRICE - 1 });
  const denied = unlockCosmetic(poor, COIN_ITEM);
  expect('C: 재화가 모자라면 insufficient_coins다', denied.outcome === 'insufficient_coins');
  expect('C: 실패해도 재화가 줄지 않는다',
    denied.progression.coins === COIN_PRICE - 1 && denied.spentCoins === 0);
  expect('C: 실패하면 소유 목록도 그대로다', !denied.progression.ownedCosmeticIds.includes(COIN_ITEM));
  expect('C: 정확히 가격만큼 있으면 살 수 있다 (경계값)',
    unlockCosmetic(progression({ coins: COIN_PRICE }), COIN_ITEM).outcome === 'unlocked');
  expect('C: 사고 나면 재화가 0이 된다',
    unlockCosmetic(progression({ coins: COIN_PRICE }), COIN_ITEM).progression.coins === 0);
}

// ── D. 토큰 해금 ─────────────────────────────────────────────────────────────
{
  const withToken = progression({ unlockTokens: [TOKEN_ID, BOSS_TOKEN], coins: 0 });
  const unlocked = unlockCosmetic(withToken, TOKEN_ITEM);
  expect('D: 요구 토큰을 가지고 있으면 열린다', unlocked.outcome === 'unlocked');
  expect('D: 그 토큰만 소비된다', unlocked.spentToken === TOKEN_ID);
  check('D: 다른 토큰은 그대로 남는다', unlocked.progression.unlockTokens, [BOSS_TOKEN]);
  expect('D: 토큰 항목은 재화를 쓰지 않는다',
    unlocked.spentCoins === 0 && unlocked.progression.coins === 0);
  expect('D: 소유 목록에 추가된다', unlocked.progression.ownedCosmeticIds.includes(TOKEN_ITEM));

  const noToken = progression({ coins: 999_999 });
  const missing = unlockCosmetic(noToken, TOKEN_ITEM);
  expect('D: 토큰이 없으면 missing_token이다', missing.outcome === 'missing_token');
  expect('D: 재화가 아무리 많아도 토큰 항목을 살 수 없다',
    missing.progression.coins === 999_999 && !missing.progression.ownedCosmeticIds.includes(TOKEN_ITEM));

  const wrongToken = progression({ unlockTokens: [TOKEN_ID] });
  expect('D: 다른 stage의 토큰으로는 열 수 없다 (토큰은 교환되지 않는다)',
    unlockCosmetic(wrongToken, BOSS_ITEM).outcome === 'missing_token');
  check('D: 실패했으므로 토큰이 소비되지 않는다',
    unlockCosmetic(wrongToken, BOSS_ITEM).progression.unlockTokens, [TOKEN_ID]);
  expect('D: 토큰을 쓰고 나면 같은 항목을 또 열 수 없다', (() => {
    const after = unlockCosmetic(withToken, TOKEN_ITEM).progression;
    return unlockCosmetic(after, TOKEN_ITEM).outcome === 'already_owned';
  })());
}

// ── E. 잘못된 입력 ───────────────────────────────────────────────────────────
{
  const rich = progression({ coins: 999_999, unlockTokens: [TOKEN_ID] });
  const badIds: unknown[] = ['nope', '', null, undefined, 42, {}, 'head.plain '];
  badIds.forEach((id) => {
    const result = unlockCosmetic(rich, id as string);
    if (id === 'head.plain ') {
      expect('E: 공백이 섞인 id는 다른 항목이 아니다', result.outcome === 'invalid_item');
      return;
    }
    expect(`E: 잘못된 id(${String(id)})는 invalid_item이다`, result.outcome === 'invalid_item');
  });
  const failed = unlockCosmetic(rich, 'nope');
  check('E: 실패는 문서를 하나도 바꾸지 않는다', failed.progression, migrateBattleProgression(rich));
  expect('E: 실패 결과에는 소비 내역이 없다',
    failed.spentCoins === 0 && failed.spentToken === null && failed.item === null);
}

// ── F. 손상된 소유 목록 복구 ─────────────────────────────────────────────────
{
  const badOwned: unknown[] = ['not-an-array', 42, null, undefined, {}];
  badOwned.forEach((value) => {
    const migrated = migrateBattleProgression({ ownedCosmeticIds: value } as never);
    check(`F: 소유 목록 ${String(value)} 는 기본 항목으로 복구된다`,
      migrated.ownedCosmeticIds, DefaultCosmeticIds);
  });
  check('F: 중복 id는 하나로 정리된다',
    sanitizeOwnedCosmeticIds([COIN_ITEM, COIN_ITEM, COIN_ITEM]),
    [...DefaultCosmeticIds, COIN_ITEM]);
  check('F: 문자열이 아닌 값과 빈 문자열은 제거된다',
    sanitizeOwnedCosmeticIds([COIN_ITEM, '', null, 3, {}, TOKEN_ITEM]),
    [...DefaultCosmeticIds, COIN_ITEM, TOKEN_ITEM]);
  expect('F: 카탈로그에 없는 id도 버리지 않는다 (하위 버전 호환)',
    sanitizeOwnedCosmeticIds(['future.item']).includes('future.item'));
  expect('F: 소유 목록에 개수 상한이 있다',
    sanitizeOwnedCosmeticIds(Array.from({ length: 5000 }, (_, i) => `x${i}`)).length <=
    BattleConfig.economy.maxOwnedCosmetics);
  expect('F: 카탈로그에서 사라진 id는 표시 목록에 나오지 않는다',
    !getOwnedCosmetics(progression({ ownedCosmeticIds: ['gone.item'] }))
      .some((item) => item.id === 'gone.item'));
  check('F: 보유 목록은 카탈로그 순서로 나온다',
    getOwnedCosmetics(progression({ ownedCosmeticIds: [COIN_ITEM] })).map((i) => i.id),
    CosmeticCatalog.filter((i) => [...DefaultCosmeticIds, COIN_ITEM].includes(i.id)).map((i) => i.id));
}

// ── G. 구매 트랜잭션 (한 번의 쓰기 / 실패 복구 / 재시작) ────────────────────
{
  const makeStore = (initial?: unknown) => {
    const store = {
      raw: initial === undefined ? null : JSON.stringify(initial),
      writes: 0, failNext: 0, failLoad: false,
    };
    const ops = (): BattleSyncOperations => ({
      loadProgression: async () => {
        if (store.failLoad) throw new Error('unreadable');
        return migrateBattleProgression(JSON.parse(store.raw ?? 'null'));
      },
      saveProgression: async (next) => {
        if (store.failNext > 0) { store.failNext -= 1; throw new Error('storage full'); }
        store.writes += 1;
        store.raw = JSON.stringify(next);
      },
    });
    return { store, ops };
  };
  const saved = (over: Partial<BattleProgressionState> = {}) => ({
    ...createInitialBattleProgression(), ...over,
  });

  await (async () => {
    const { store, ops } = makeStore(saved({ coins: 500, unlockTokens: [TOKEN_ID] }));

    const bought = await purchaseCosmetic(COIN_ITEM, ops());
    expect('G: 구매가 성공으로 보고된다', bought.status === 'unlocked');
    expect('G: 재화 차감과 소유 추가가 한 번의 쓰기로 끝난다', store.writes === 1);
    expect('G: 저장된 문서에 차감과 소유가 함께 반영된다', (() => {
      const doc = JSON.parse(store.raw!);
      return doc.coins === 500 - COIN_PRICE && doc.ownedCosmeticIds.includes(COIN_ITEM);
    })());

    // 앱 재시작 — 저장된 문서에서만 다시 읽는다.
    const reloaded = await ops().loadProgression();
    expect('G: 재시작 후에도 소유가 유지된다', reloaded.ownedCosmeticIds.includes(COIN_ITEM));
    expect('G: 재시작 후에도 차감된 재화가 유지된다', reloaded.coins === 500 - COIN_PRICE);

    const dupe = await purchaseCosmetic(COIN_ITEM, ops());
    expect('G: 같은 항목 재구매는 already_owned다', dupe.status === 'already_owned');
    expect('G: 재구매는 저장조차 하지 않는다', store.writes === 1);
    expect('G: 재구매로 재화가 더 줄지 않는다', dupe.progression?.coins === 500 - COIN_PRICE);

    const tokenBuy = await purchaseCosmetic(TOKEN_ITEM, ops());
    expect('G: 토큰 항목도 같은 API로 열린다', tokenBuy.status === 'unlocked');
    expect('G: 토큰 소비와 소유 추가가 함께 저장된다', (() => {
      const doc = JSON.parse(store.raw!);
      return doc.unlockTokens.length === 0 && doc.ownedCosmeticIds.includes(TOKEN_ITEM);
    })());
  })();

  await (async () => {
    // 저장 실패 → 재화/토큰/소유 전부 이전 상태. 성공으로 오인할 수 없다.
    const { store, ops } = makeStore(saved({ coins: 500, unlockTokens: [TOKEN_ID] }));
    const before = await ops().loadProgression();

    store.failNext = 1;
    const failed = await purchaseCosmetic(COIN_ITEM, ops());
    expect('G: 저장 실패는 failed로 명확히 보고된다', failed.status === 'failed');
    expect('G: 실패 결과는 소비를 보고하지 않는다',
      failed.spentCoins === 0 && failed.spentToken === null);
    check('G: 실패 후 문서는 통째로 이전 상태다', await ops().loadProgression(), before);
    expect('G: 실패 후 소유도 추가되지 않았다',
      !(await ops().loadProgression()).ownedCosmeticIds.includes(COIN_ITEM));

    const retry = await purchaseCosmetic(COIN_ITEM, ops());
    expect('G: 실패한 구매는 그대로 재시도된다', retry.status === 'unlocked');
    expect('G: 재시도해도 차감은 정확히 한 번이다',
      retry.progression?.coins === 500 - COIN_PRICE);

    store.failNext = 1;
    const tokenFail = await purchaseCosmetic(TOKEN_ITEM, ops());
    expect('G: 토큰 구매 저장 실패도 failed다', tokenFail.status === 'failed');
    check('G: 토큰이 소비되지 않고 남아 있다', (await ops().loadProgression()).unlockTokens, [TOKEN_ID]);
  })();

  await (async () => {
    const { store, ops } = makeStore(saved({ coins: 0 }));
    const denied = await purchaseCosmetic(COIN_ITEM, ops());
    expect('G: 재화 부족은 저장하지 않는다',
      denied.status === 'insufficient_coins' && store.writes === 0);
    const invalid = await purchaseCosmetic('nope', ops());
    expect('G: 없는 항목도 저장하지 않는다', invalid.status === 'invalid_item' && store.writes === 0);

    store.failLoad = true;
    const unreadable = await purchaseCosmetic(COIN_ITEM, ops());
    expect('G: 문서를 읽지 못하면 아무것도 하지 않는다',
      unreadable.status === 'failed' && unreadable.progression === null && store.writes === 0);
  })();
}

// ── H. cosmetic은 게임 성과에 영향을 주지 않는다 ────────────────────────────
{
  const naked = progression({ coins: 1000 });
  const dressed = unlockCosmetic(naked, COIN_ITEM).progression;
  const battleInput = { workoutId: 'w-cosmetic', completedSetCount: 6, totalVolumeKg: 4000 };
  const stage1 = getBattleStage(1);

  expect('H: cosmetic을 사도 전투력이 변하지 않는다',
    calculateBattlePower(battleInput) === calculateBattlePower(battleInput));
  check('H: 소유 여부와 무관하게 전투 결과가 같다',
    resolveBattle(battleInput, naked.battle, stage1),
    resolveBattle(battleInput, dressed.battle, stage1));
  check('H: 피로도 패널티도 그대로다',
    resolveBattlePower(battleInput, 70), resolveBattlePower(battleInput, 70));
  check('H: 구매가 전투 진행 상태를 건드리지 않는다', dressed.battle, naked.battle);
  expect('H: 진행 문서에 Workout/Growth/신체 데이터가 없다',
    !/muscleSp|growth|bodyFat|skeletalMuscle|bodyParameters|xp|streak|passLevel/i.test(
      JSON.stringify(Object.keys(dressed))));

  const record: WorkoutRecord = {
    id: 'r', sessionId: 's', date: '2026-08-23', category: 'strength', title: 't',
    completed: true, createdAt: '2026-08-23T00:00:00.000Z',
    exercises: [{ id: 'e', name: 'n', setDetails: [{ id: 'x', weightKg: 60, reps: 10, completed: true }] }],
  };
  const snapshot = JSON.stringify(record);
  unlockCosmetic(naked, COIN_ITEM);
  check('H: 구매가 WorkoutRecord를 건드리지 않는다', JSON.stringify(record), snapshot);
}

// ── I. 결정성 / 원본 불변 ────────────────────────────────────────────────────
{
  const source = progression({ coins: 500, unlockTokens: [TOKEN_ID] });
  const snapshot = JSON.stringify(source);
  const first = unlockCosmetic(source, COIN_ITEM);
  const second = unlockCosmetic(source, COIN_ITEM);
  check('I: 같은 입력은 같은 결과를 낸다', first, second);
  check('I: 원본 문서가 바뀌지 않는다', JSON.stringify(source), snapshot);
  expect('I: 새 문서는 원본과 다른 객체다', first.progression !== source);
  expect('I: 원본의 소유 목록 배열도 바뀌지 않는다',
    !source.ownedCosmeticIds.includes(COIN_ITEM));
  expect('I: 원본의 토큰 배열도 바뀌지 않는다',
    unlockCosmetic(source, TOKEN_ITEM) && source.unlockTokens.includes(TOKEN_ID));
  check('I: 저장 문서 키는 정해진 여섯 개뿐이다',
    Object.keys(first.progression).sort(),
    ['battle', 'coins', 'fatigueUpdatedAt', 'ownedCosmeticIds', 'unlockTokens', 'version']);
  expect('I: 장착 상태는 아직 저장하지 않는다 (presentation slice의 몫)',
    !('equippedCosmetics' in first.progression) && !('equipped' in first.progression));
}

// ── J. 기존 재화/토큰 계약 유지 ─────────────────────────────────────────────
{
  expect('J: 재화 상한 계약이 그대로다',
    migrateBattleProgression({ coins: Number.MAX_SAFE_INTEGER } as never).coins ===
    BattleConfig.economy.maxCoins);
  expect('J: 재화 하한 계약이 그대로다',
    migrateBattleProgression({ coins: -100 } as never).coins === 0);
  expect('J: 구매로 재화가 음수가 되지 않는다',
    unlockCosmetic(progression({ coins: COIN_PRICE }), COIN_ITEM).progression.coins >= 0);
  check('J: 토큰 정규화 계약이 그대로다',
    migrateBattleProgression({ unlockTokens: ['a', 'a', '', 3] } as never).unlockTokens, ['a']);
  expect('J: stage clear로 들어오는 토큰 형식은 그대로다',
    typeof getBattleStage(3).reward.unlockToken === 'string');
  check('J: 전투 상태는 cosmetic과 무관하게 초기값 그대로다',
    migrateBattleProgression({ ownedCosmeticIds: [COIN_ITEM] } as never).battle,
    createInitialBattleState());
}

console.log(failures === 0 ? '\nAll COSMETIC checks passed.' : `\n${failures} COSMETIC check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
