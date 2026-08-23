import { BattleConfig } from '@/config/battle-config';
import { BattleStages, getBattleStage, isFinalBattleStage, MaxBattleStage } from '@/config/battle-stages';
import { DefaultCosmeticIds } from '@/config/cosmetics';
import {
  INITIAL_BATTLE_STATE,
  type BattleInput,
  type BattleProgressionState,
  type BattleState,
} from '@/types/battle';
import type { SessionCompletionResultSnapshot } from '@/types/session-completion';
import type { WorkoutRecord } from '@/types/workout';
import { battleEnemyRemainingHp, isBattleWorkoutAlreadyResolved, resolveBattle } from '@/utils/battle';
import { battleInputFromCompletion, battleInputFromWorkoutRecord } from '@/utils/battle-input';
import { describeBattleFatigue, recoverBattleProgression } from '@/utils/battle-recovery';
import {
  calculateBattlePower,
  fatiguePowerMultiplier,
  recoverBattleFatigue,
  resolveBattlePower,
} from '@/utils/battle-power';
import {
  applyBattleResolution,
  createInitialBattleProgression,
  createInitialBattleState,
  hasUnlockToken,
  migrateBattleProgression,
  migrateBattleState,
  sanitizeUnlockTokens,
} from '@/utils/battle-state';
import {
  loadRecoveredBattleProgression,
  syncCompletedWorkoutToBattle,
  type BattleSyncOperations,
} from '@/utils/battle-sync';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}
function check(name: string, actual: unknown, expected: unknown) {
  expect(name, JSON.stringify(actual) === JSON.stringify(expected));
}

const stage1 = getBattleStage(1);
const input = (over: Partial<BattleInput> = {}): BattleInput =>
  ({ workoutId: 'session-1', completedSetCount: 6, totalVolumeKg: 4000, ...over });
const state = (over: Partial<BattleState> = {}): BattleState =>
  ({ ...createInitialBattleState(), ...over });
/** 6세트 × 2 + floor(sqrt(4000/100)) = 12 + 6 = 18 */
const BASE_POWER = 18;
/** 테스트 기준 시각. 도메인은 시계를 읽지 않으므로 언제나 바깥에서 넣어 준다. */
const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const sync = (
  battleInput: Parameters<typeof syncCompletedWorkoutToBattle>[0],
  operations: BattleSyncOperations,
  nowMs: number = T0
) => syncCompletedWorkoutToBattle(battleInput, operations, nowMs);
const applyBattleResolutionAt = (
  progression: Parameters<typeof applyBattleResolution>[0],
  resolution: Parameters<typeof applyBattleResolution>[1],
  nowMs: number = T0
) => applyBattleResolution(progression, resolution, nowMs);

// ── 1. 결정성 ────────────────────────────────────────────────────────────────
{
  const a = resolveBattle(input(), state(), stage1);
  const b = resolveBattle(input(), state(), stage1);
  check('1: 같은 입력과 상태는 언제나 같은 결과를 낸다', a, b);
  expect('1: 전투력은 세트 항 + 볼륨 항이다 (6세트=12, 4000kg=6 → 18)',
    calculateBattlePower(input()) === BASE_POWER);
  expect('1: resolver는 Math.random/Date.now를 쓰지 않는다 (같은 입력 100회 동일)',
    Array.from({ length: 100 }, () => JSON.stringify(resolveBattle(input(), state(), stage1)))
      .every((row) => row === JSON.stringify(a)));
}

// ── 2/3. 같은 운동 두 번 → 피해·피로도·보상 0 ────────────────────────────────
{
  const first = resolveBattle(input({ workoutId: 'session-dup' }), state(), stage1);
  const second = resolveBattle(input({ workoutId: 'session-dup' }), first.nextState, stage1);
  expect('2: 같은 workoutId 두 번째는 duplicate다', second.outcome === 'duplicate');
  expect('2: 두 번째는 적에게 피해를 주지 않는다', second.progressGained === 0);
  expect('3: 두 번째 피로도 증가는 0이다', second.fatigueDelta === 0);
  check('2/3: 두 번째는 보상을 주지 않는다', second.reward, { coins: 0, unlockToken: null });
  check('2/3: 두 번째는 상태를 전혀 바꾸지 않는다', second.nextState, first.nextState);
  expect('2: 이미 반영한 운동인지 미리 물어볼 수 있다',
    isBattleWorkoutAlreadyResolved(first.nextState, 'session-dup') &&
    !isBattleWorkoutAlreadyResolved(first.nextState, 'session-other'));
  expect('2: workoutId가 비어 있으면 반영하지 않는다',
    resolveBattle(input({ workoutId: '' }), state(), stage1).outcome === 'duplicate');
  expect('2: duplicate여도 적 정보는 읽을 수 있다 (화면이 깨지지 않는다)',
    second.enemy.id === stage1.enemyId && second.enemy.maxHp === stage1.progressRequired);
}

// ── 4. Stage clear / 초과 피해 carry / 한 운동 최대 1단계 ────────────────────
{
  // stage 1 적 HP 10. 18 피해 → 잡고 8 이월.
  const win = resolveBattle(input(), state(), stage1);
  expect('4: 적 HP를 모두 깎으면 stage가 오른다', win.outcome === 'win' && win.stageCleared);
  expect('4: currentStage가 1 올라간다', win.nextState.currentStage === 2);
  expect('4: 초과 피해는 버리지 않고 다음 적에게 이월한다 (18 - 10 = 8)',
    win.nextState.stageProgress === 8 && win.progressAfter === 8);
  expect('4: 잡은 적의 남은 HP는 0으로 보인다', win.enemy.remainingHpAfter === 0);
  check('4: stage before/after가 화면에 그대로 온다', [win.stageBefore, win.stageAfter], [1, 2]);

  const exact = resolveBattle(input({ workoutId: 'w-exact', completedSetCount: 5, totalVolumeKg: 0 }), state(), stage1);
  expect('4: 정확히 HP만큼 때리면 이월 없이 잡는다 (10 - 10 = 0)',
    exact.stageCleared && exact.nextState.stageProgress === 0);

  const huge = resolveBattle(input({ workoutId: 'w-huge', completedSetCount: 50, totalVolumeKg: 0 }), state(), stage1);
  expect('4: 한 운동에서 두 단계를 뛰지 않는다', huge.nextState.currentStage === 2);
  expect('4: 남은 피해는 전부 이월된다 (100 - 10 = 90)', huge.nextState.stageProgress === 90);

  const carried = resolveBattle(input({ workoutId: 'w-next', completedSetCount: 3, totalVolumeKg: 0 }),
    win.nextState, getBattleStage(2));
  expect('4: 이월분은 다음 적에게 그대로 쓰인다 (8 + 6 >= 14)', carried.stageCleared);
}

// ── 5. Stage 미달 → 피해 누적 / 적 남은 HP ───────────────────────────────────
{
  const loss = resolveBattle(input({ workoutId: 'w-small', completedSetCount: 2, totalVolumeKg: 0 }), state(), stage1);
  expect('5: 한 번에 못 잡으면 stage가 오르지 않는다', loss.outcome === 'loss' && !loss.stageCleared);
  expect('5: 준 피해는 그대로 누적된다 (2세트 = 4)', loss.nextState.stageProgress === 4);
  expect('5: currentStage는 그대로다', loss.nextState.currentStage === 1);
  expect('5: 패배해도 누적 피해가 사라지지 않는다', loss.nextState.stageProgress > state().stageProgress);
  check('5: 적 남은 HP가 화면에 그대로 온다 (10 → 6)',
    [loss.enemy.remainingHpBefore, loss.enemy.remainingHpAfter], [10, 6]);
  expect('5: 저장 상태에서도 남은 HP를 구할 수 있다',
    battleEnemyRemainingHp(loss.nextState, stage1) === 6);

  const second = resolveBattle(input({ workoutId: 'w-small-2', completedSetCount: 2, totalVolumeKg: 0 }), loss.nextState, stage1);
  expect('5: 다음 운동에서 이어서 때린다 (4 + 4 = 8)', second.nextState.stageProgress === 8);
  expect('5: 아직 못 잡았으므로 stage는 그대로다', !second.stageCleared);

  const zero = resolveBattle(input({ workoutId: 'w-zero', completedSetCount: 0, totalVolumeKg: 0 }), state({ stageProgress: 50 }), stage1);
  expect('5: 수행량이 0이면 피해도 0이고 stage도 넘기지 않는다',
    zero.progressGained === 0 && !zero.stageCleared);
}

// ── 6/7. 피로도 clamp ────────────────────────────────────────────────────────
{
  const high = resolveBattle(input({ workoutId: 'w-f1' }), state({ fatigue: 97 }), stage1);
  expect('6: 피로도는 100을 넘지 않는다', high.nextState.fatigue === 100);
  expect('6: 넘친 만큼은 delta에도 반영되지 않는다 (97 -> 100 = +3)', high.fatigueDelta === 3);

  const negative = resolveBattle(input({ workoutId: 'w-f2' }), state({ fatigue: -50 }), stage1);
  expect('7: 음수 피로도는 0에서 시작한다', negative.nextState.fatigue === stage1.fatigueCost);
  expect('7: 피로도는 절대 음수가 되지 않는다', negative.nextState.fatigue >= 0);

  const already = resolveBattle(input({ workoutId: 'w-f3' }), state({ fatigue: 100 }), stage1);
  expect('6: 이미 100이면 더 오르지 않는다', already.nextState.fatigue === 100 && already.fatigueDelta === 0);
  check('6/7: 화면이 쓸 fatigue before/after가 함께 온다',
    [already.fatigueBefore, already.fatigueAfter], [100, 100]);
}

// ── 8. 이상 입력이 상태를 오염시키지 않는다 ──────────────────────────────────
{
  const bad: BattleInput[] = [
    { workoutId: 'nan', completedSetCount: NaN, totalVolumeKg: NaN },
    { workoutId: 'inf', completedSetCount: Infinity, totalVolumeKg: Infinity },
    { workoutId: 'neg', completedSetCount: -10, totalVolumeKg: -9999 },
    { workoutId: 'str', completedSetCount: '5' as unknown as number, totalVolumeKg: '5' as unknown as number },
  ];
  bad.forEach((row) => {
    const result = resolveBattle(row, state(), stage1);
    const s = result.nextState;
    expect(`8: ${row.workoutId} 입력이 누적 피해를 오염시키지 않는다`,
      Number.isFinite(s.stageProgress) && s.stageProgress >= 0);
    expect(`8: ${row.workoutId} 입력이 피로도를 오염시키지 않는다`,
      Number.isFinite(s.fatigue) && s.fatigue >= 0 && s.fatigue <= 100);
    expect(`8: ${row.workoutId} 입력이 stage를 오염시키지 않는다`,
      Number.isInteger(s.currentStage) && s.currentStage >= 1);
    expect(`8: ${row.workoutId} 입력이 보상을 오염시키지 않는다`,
      Number.isFinite(result.reward.coins) && result.reward.coins >= 0);
  });

  const corrupted = migrateBattleState({
    currentStage: NaN, stageProgress: -5, fatigue: Infinity, lastResolvedWorkoutId: 42 as unknown as string,
  } as Partial<BattleState>);
  // Infinity는 "믿을 수 없는 값"이므로 최대치가 아니라 0으로 떨어진다 — 손상된 저장값이
  // 사용자를 최대 피로 상태로 만들어 버리지 않게 하는 쪽이 안전하다.
  check('8: 손상된 저장값은 안전한 상태로 되돌아온다', corrupted,
    { version: 1, currentStage: 1, stageProgress: 0, fatigue: 0, lastResolvedWorkoutId: null });
  const badStateResult = resolveBattle(input({ workoutId: 'w-bad-state' }), { stageProgress: NaN } as unknown as BattleState, stage1);
  expect('8: 손상된 state로 판정해도 결과가 NaN이 되지 않는다',
    Number.isFinite(badStateResult.nextState.stageProgress));
  const badStage = resolveBattle(input({ workoutId: 'w-bad-stage' }), state(),
    { progressRequired: NaN, fatigueCost: NaN } as never);
  expect('8: 손상된 stage 정의로도 결과가 안전하다',
    Number.isFinite(badStage.nextState.stageProgress) && Number.isFinite(badStage.nextState.fatigue));
}

// ── 9/10. 원본 mutation 없음 ─────────────────────────────────────────────────
{
  const original = input({ workoutId: 'w-immutable' });
  const originalState = state({ stageProgress: 3, fatigue: 20 });
  const inputSnapshot = JSON.stringify(original);
  const stateSnapshot = JSON.stringify(originalState);
  const stageSnapshot = JSON.stringify(stage1);

  const result = resolveBattle(original, originalState, stage1);
  check('9: BattleInput 원본이 바뀌지 않는다', JSON.stringify(original), inputSnapshot);
  check('10: BattleState 원본이 바뀌지 않는다', JSON.stringify(originalState), stateSnapshot);
  check('10: Stage 정의 원본이 바뀌지 않는다', JSON.stringify(stage1), stageSnapshot);
  expect('10: 새 상태는 원본과 다른 객체다', result.nextState !== originalState);
  check('10: 초기 상태 상수도 바뀌지 않는다', INITIAL_BATTLE_STATE,
    { version: 1, currentStage: 1, stageProgress: 0, fatigue: 0, lastResolvedWorkoutId: null });
}

// ── 11. Battle이 운동 데이터/기존 보상을 건드리지 않는다 ─────────────────────
{
  const record: WorkoutRecord = {
    id: 'record-1', sessionId: 'session-record-1', date: '2026-08-23', category: 'strength',
    title: '가슴 세션', completed: true, createdAt: '2026-08-23T00:00:00.000Z',
    exercises: [{
      id: 'ex-1', name: '벤치프레스', exerciseId: 'bench-press',
      setDetails: [
        { id: 's1', weightKg: 60, reps: 10, completed: true },
        { id: 's2', weightKg: 60, reps: 10, completed: true },
        { id: 's3', weightKg: 60, reps: 0, completed: true },
      ],
    }],
  };
  const recordSnapshot = JSON.stringify(record);

  const battleInput = battleInputFromWorkoutRecord(record);
  const fought = resolveBattle(battleInput!, state(), stage1);
  check('11: 전투 뒤에도 WorkoutRecord 원본이 그대로다', JSON.stringify(record), recordSnapshot);
  expect('11: 무효 세트(0회)는 기존 통계 규칙대로 빠진다 (2세트 + 1200kg)',
    battleInput?.completedSetCount === 2 && battleInput?.totalVolumeKg === 1200);
  expect('11: sessionId 없는 기록은 Battle에 들어가지 않는다',
    battleInputFromWorkoutRecord({ ...record, sessionId: undefined }) === null);
  expect('11: 전투 결과에는 XP/SP/streak 같은 기존 보상이 없다',
    !/xp|streak|muscleSp|passLevel/i.test(JSON.stringify(fought)));
  check('11: Battle 보상은 게임 재화 두 값뿐이다',
    Object.keys(fought.reward).sort(), ['coins', 'unlockToken']);
  check('11: 저장되는 상태에도 XP/SP가 섞이지 않는다',
    Object.keys(fought.nextState).sort(),
    ['currentStage', 'fatigue', 'lastResolvedWorkoutId', 'stageProgress', 'version']);

  const snapshot = {
    sessionResult: { sessionId: 'session-completion-1' },
    completedSets: 9, totalVolumeKg: 2500,
  } as unknown as SessionCompletionResultSnapshot;
  const completionSnapshot = JSON.stringify(snapshot);
  const fromCompletion = battleInputFromCompletion(snapshot);
  check('11: completion 스냅샷의 확정값을 그대로 쓴다', fromCompletion,
    { workoutId: 'session-completion-1', completedSetCount: 9, totalVolumeKg: 2500 });
  check('11: adapter가 completion 스냅샷을 바꾸지 않는다', JSON.stringify(snapshot), completionSnapshot);
  expect('11: sessionId 없는 완료 결과는 null이다',
    battleInputFromCompletion({ sessionResult: {} } as unknown as SessionCompletionResultSnapshot) === null);
}

// ── 12/13. 트랜잭션: 진행 + 보상이 정확히 한 번 ──────────────────────────────
// 피해/피로도/stage/재화/토큰이 **한 문서에 함께** 저장되므로, 저장소가 주는 원자성
// (키 하나 쓰기)이 그대로 exactly-once가 된다. "state는 저장됐는데 보상만 날아간" 창이
// 열리지 않는다는 것을 아래에서 직접 확인한다.
{
  const makeStore = () => {
    const store = { raw: null as string | null, writes: 0, failNext: 0, failLoad: false };
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

  await (async () => {
    const { store, ops } = makeStore();

    // 1/2. 보상이 실제로 저장된다. stage 1 적 HP 10, 18 피해 → clear (+20) → 38 coin.
    const first = await sync(input({ workoutId: 'w-t1' }), ops());
    expect('12: 처음 반영은 applied다', first.status === 'applied');
    expect('12-1: 전투 재화가 저장 문서에 반영된다',
      first.progression?.coins === BASE_POWER + stage1.reward.clearCoins);
    expect('12: 전투 진행도 같은 문서에 반영된다', first.progression?.battle.currentStage === 2);
    check('12: 저장했다 읽어도 같은 문서다 (roundtrip)', await ops().loadProgression(), first.progression);
    expect('12: 한 번의 반영은 한 번의 쓰기다 (부분 저장 창이 없다)', store.writes === 1);

    // 3. 못 잡은 전투는 피해만큼만 받고 토큰은 없다.
    const noClear = await sync(
      input({ workoutId: 'w-t2', completedSetCount: 1, totalVolumeKg: 0 }), ops());
    expect('12-3: 못 잡은 전투에서는 토큰이 나오지 않는다',
      noClear.progression?.unlockTokens.length === 0);
    expect('12-3: 못 잡아도 피해만큼 재화는 쌓인다',
      (noClear.progression?.coins ?? 0) > (first.progression?.coins ?? 0));
  })();

  // 2. stage 3을 잡으면 토큰이 저장된다.
  await (async () => {
    const stage3 = getBattleStage(3);
    const { store, ops } = makeStore();
    store.raw = JSON.stringify({
      version: 1, battle: { ...createInitialBattleState(), currentStage: 3 }, coins: 0, unlockTokens: [],
    });
    const tokenRun = await sync(
      input({ workoutId: 'w-token', completedSetCount: 20, totalVolumeKg: 0 }), ops());
    check('12-2: 해금 토큰이 저장된다', tokenRun.progression?.unlockTokens, [stage3.reward.unlockToken]);
    expect('12-2: 저장된 토큰을 조회할 수 있다',
      hasUnlockToken(tokenRun.progression!, stage3.reward.unlockToken!));
    check('12-2: 토큰은 저장 후 다시 읽어도 남아 있다',
      (await ops().loadProgression()).unlockTokens, [stage3.reward.unlockToken]);
  })();

  // 4/5/6. 같은 운동 재처리 — 재화도 토큰도 늘지 않는다 (앱 재시작 포함).
  await (async () => {
    const stage3 = getBattleStage(3);
    const { store, ops } = makeStore();
    store.raw = JSON.stringify({
      version: 1, battle: { ...createInitialBattleState(), currentStage: 3 }, coins: 0, unlockTokens: [],
    });
    const applied = await sync(
      input({ workoutId: 'w-once', completedSetCount: 20, totalVolumeKg: 0 }), ops());
    const writesAfterFirst = store.writes;

    // 앱 재시작을 흉내낸다 — 메모리를 버리고 저장된 문서에서만 다시 판단한다.
    const again = await sync(
      input({ workoutId: 'w-once', completedSetCount: 20, totalVolumeKg: 0 }), ops());
    expect('13-6: 재시작 후 같은 운동은 duplicate다', again.status === 'duplicate');
    expect('13-4: 재처리로 재화가 늘지 않는다', again.progression?.coins === applied.progression?.coins);
    check('13-5: 재처리로 토큰이 늘지 않는다',
      again.progression?.unlockTokens, [stage3.reward.unlockToken]);
    expect('13: 재처리로 피해가 늘지 않는다', again.resolution?.progressGained === 0);
    expect('13: 재처리로 피로도가 늘지 않는다', again.resolution?.fatigueDelta === 0);
    expect('13: 재처리로 stage가 중복 상승하지 않는다',
      again.progression?.battle.currentStage === applied.progression?.battle.currentStage);
    expect('13-8: 재처리는 저장조차 하지 않는다', store.writes === writesAfterFirst);
    check('13: 재처리 후 문서가 완전히 동일하다', again.progression, applied.progression);
  })();

  // 7/8. 저장 실패 → 재시도 → 정확히 한 번. 부분 반영이 없다.
  await (async () => {
    const { store, ops } = makeStore();
    const before = await ops().loadProgression();

    store.failNext = 1;
    const failed = await sync(input({ workoutId: 'w-retry' }), ops());
    expect('13-7: 저장 실패는 예외를 던지지 않고 failed로 알린다', failed.status === 'failed');
    check('13-7: 실패 후 문서는 통째로 이전 상태다 (진행도도 재화도 그대로)',
      await ops().loadProgression(), before);
    expect('13-7: 실패했으므로 재화도 저장되지 않았다',
      (await ops().loadProgression()).coins === 0);

    const retry = await sync(input({ workoutId: 'w-retry' }), ops());
    expect('13-7: 실패한 운동은 그대로 재시도된다', retry.status === 'applied');
    expect('13-7: 재시도로 보상이 정확히 한 번 들어간다',
      retry.progression?.coins === BASE_POWER + stage1.reward.clearCoins);

    const afterRetry = await ops().loadProgression();
    const third = await sync(input({ workoutId: 'w-retry' }), ops());
    expect('13-8: 성공 후 또 재시도해도 중복 보상이 없다', third.status === 'duplicate');
    check('13-8: 문서가 그대로다', await ops().loadProgression(), afterRetry);
  })();

  // 9/10. 저장/읽기 실패가 운동 데이터에 손대지 않는다.
  await (async () => {
    const { store, ops } = makeStore();
    const workoutRecord = {
      id: 'r', sessionId: 'w-guard', date: '2026-08-23', category: 'strength', title: 't',
      completed: true, createdAt: '2026-08-23T00:00:00.000Z',
      exercises: [{ id: 'e', name: 'n', setDetails: [{ id: 's', weightKg: 60, reps: 10, completed: true }] }],
    } as WorkoutRecord;
    const recordSnapshot = JSON.stringify(workoutRecord);

    store.failNext = 1;
    const stateFail = await sync(battleInputFromWorkoutRecord(workoutRecord), ops());
    expect('13-9: 저장 실패해도 예외가 운동 쪽으로 새지 않는다', stateFail.status === 'failed');
    check('13-9/10: 저장 실패가 WorkoutRecord를 건드리지 않는다',
      JSON.stringify(workoutRecord), recordSnapshot);

    store.failLoad = true;
    const unreadable = await sync(input({ workoutId: 'w-x' }), ops());
    expect('13-10: 문서를 읽지 못하면 아무것도 하지 않는다',
      unreadable.status === 'failed' && unreadable.progression === null);
    expect('13-10: 읽기 실패로 쓰기가 일어나지 않는다', store.writes === 0);
    store.failLoad = false;

    // 입력이 없으면 전투는 없다. 다만 회복 기준 시각이 아직 없으면 그것만 한 번 세운다.
    const skipped = await sync(null, ops());
    expect('13: 반영할 입력이 없으면 전투가 일어나지 않는다',
      skipped.status === 'skipped' && skipped.resolution === null);
    expect('13: skipped는 전투 진행/재화를 건드리지 않는다',
      skipped.progression?.battle.stageProgress === 0 && skipped.progression?.coins === 0);
  })();

  // 16. 재시도가 결정적이다 — 같은 문서에서 같은 운동은 언제나 같은 결과.
  await (async () => {
    const runOnce = async () => {
      const { ops } = makeStore();
      const result = await sync(input({ workoutId: 'w-det' }), ops());
      return JSON.stringify(result.progression);
    };
    const runs = [await runOnce(), await runOnce(), await runOnce()];
    expect('13-16: 트랜잭션 재시도가 결정적이다', new Set(runs).size === 1);
  })();

  // 20. 같은 운동 = damage/fatigue/stage/coins/token 전부 정확히 한 번.
  await (async () => {
    const { ops } = makeStore();
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      results.push(await sync(input({ workoutId: 'w-exactly-once' }), ops()));
    }
    const final = await ops().loadProgression();
    expect('13-20: 다섯 번 불러도 applied는 한 번뿐이다',
      results.filter((r) => r.status === 'applied').length === 1);
    expect('13-20: 피해가 정확히 한 번 반영됐다',
      final.battle.stageProgress === BASE_POWER - stage1.progressRequired);
    expect('13-20: 피로도가 정확히 한 번 반영됐다', final.battle.fatigue === stage1.fatigueCost);
    expect('13-20: stage가 정확히 한 번 올랐다', final.battle.currentStage === 2);
    expect('13-20: 재화가 정확히 한 번 들어왔다',
      final.coins === BASE_POWER + stage1.reward.clearCoins);
    check('13-20: 토큰도 한 번뿐이다 (stage 1은 토큰 없음)', final.unlockTokens, []);
  })();

  // 11~15. 손상된 저장값 방어와 마이그레이션.
  {
    const badCoins: unknown[] = [NaN, Infinity, -Infinity, -500, '900', null, undefined, {}];
    badCoins.forEach((value) => {
      const migrated = migrateBattleProgression({ coins: value } as never);
      expect(`13-11/12/13: 재화 ${String(value)} 는 안전한 정수로 떨어진다`,
        Number.isInteger(migrated.coins) && migrated.coins >= 0);
    });
    expect('13-12: 재화는 상한을 넘지 않는다',
      migrateBattleProgression({ coins: Number.MAX_SAFE_INTEGER } as never).coins ===
      BattleConfig.economy.maxCoins);
    expect('13-12: 누적으로도 상한을 넘지 않는다',
      applyBattleResolutionAt(
        { ...createInitialBattleProgression(), coins: BattleConfig.economy.maxCoins },
        resolveBattle(input({ workoutId: 'w-cap' }), createInitialBattleState(), stage1)
      ).coins === BattleConfig.economy.maxCoins);

    const badTokens: unknown[] = ['not-an-array', 42, null, undefined, {}];
    badTokens.forEach((value) => {
      expect(`13-14: 토큰 ${String(value)} 는 빈 목록으로 떨어진다`,
        migrateBattleProgression({ unlockTokens: value } as never).unlockTokens.length === 0);
    });
    check('13-14: 토큰 목록에서 문자열이 아닌 값과 중복이 걸러진다',
      sanitizeUnlockTokens(['a', 'a', '', 3, null, 'b']), ['a', 'b']);
    check('13-14: 같은 토큰을 두 번 얻어도 하나만 남는다',
      applyBattleResolutionAt(
        { ...createInitialBattleProgression(), unlockTokens: ['title.persistent'] },
        resolveBattle(input({ workoutId: 'w-dup-token', completedSetCount: 20, totalVolumeKg: 0 }),
          { ...createInitialBattleState(), currentStage: 3 }, getBattleStage(3))
      ).unlockTokens, ['title.persistent']);

    check('13-15: 저장값이 없으면 초기 문서다', migrateBattleProgression(null), {
      version: 1,
      battle: { version: 1, currentStage: 1, stageProgress: 0, fatigue: 0, lastResolvedWorkoutId: null },
      coins: 0, unlockTokens: [], ownedCosmeticIds: DefaultCosmeticIds, fatigueUpdatedAt: null,
    });
    // 경제가 생기기 전 스키마(BattleState가 그대로 저장돼 있던 형태)도 진행도를 잃지 않는다.
    const legacy = migrateBattleProgression({
      version: 1, currentStage: 3, stageProgress: 7, fatigue: 40, lastResolvedWorkoutId: 'old-workout',
    } as never);
    expect('13-15: 옛 스키마에서도 진행도가 보존된다',
      legacy.battle.currentStage === 3 && legacy.battle.stageProgress === 7 &&
      legacy.battle.lastResolvedWorkoutId === 'old-workout');
    expect('13-15: 옛 스키마에는 경제가 없으므로 0에서 시작한다',
      legacy.coins === 0 && legacy.unlockTokens.length === 0);
    expect('13-15: 옛 스키마에서 올라온 문서도 중복을 막는다',
      resolveBattle(input({ workoutId: 'old-workout' }), legacy.battle, stage1).outcome === 'duplicate');
    check('13-15: 부분 객체도 안전하게 채워진다',
      migrateBattleProgression({ coins: 12 } as never).battle, createInitialBattleState());
  }

  // 17/18/19. mutation 없음 + 기존 보상 경계.
  {
    const progression = { ...createInitialBattleProgression(), coins: 50, unlockTokens: ['keep'] };
    const progressionSnapshot = JSON.stringify(progression);
    const battleInput = input({ workoutId: 'w-no-mutate' });
    const inputSnapshot = JSON.stringify(battleInput);
    const resolution = resolveBattle(battleInput, progression.battle, stage1);
    const stateSnapshot = JSON.stringify(progression.battle);

    const next = applyBattleResolutionAt(progression, resolution);
    check('13-17: BattleInput 원본이 바뀌지 않는다', JSON.stringify(battleInput), inputSnapshot);
    check('13-18: BattleState 원본이 바뀌지 않는다', JSON.stringify(progression.battle), stateSnapshot);
    check('13-18: 진행 문서 원본이 바뀌지 않는다', JSON.stringify(progression), progressionSnapshot);
    expect('13-18: 새 문서는 원본과 다른 객체다', next !== progression && next.battle !== progression.battle);
    check('13-18: 기존 토큰은 그대로 유지된다', next.unlockTokens, ['keep']);
    expect('13-19: 진행 문서에는 XP/SP/streak이 없다',
      !/xp|streak|muscleSp|passLevel|hellPass/i.test(JSON.stringify(Object.keys(next))));
    check('13-19: 저장 문서 키는 정해진 여섯 개뿐이다',
      Object.keys(next).sort(),
      ['battle', 'coins', 'fatigueUpdatedAt', 'ownedCosmeticIds', 'unlockTokens', 'version']);
    expect('13-19: 재화는 Battle 문서에만 있고 다른 보상 계약을 건드리지 않는다',
      typeof next.coins === 'number' && !('xp' in next) && !('sp' in next));
  }
}

// ── 14. 초기 상태 / Stage 데이터 / 마지막 stage ──────────────────────────────
{
  check('14: 저장된 값이 없으면 초기 상태다', migrateBattleState(null), {
    version: 1, currentStage: 1, stageProgress: 0, fatigue: 0, lastResolvedWorkoutId: null,
  });
  check('14: 초기 상태 생성은 매번 같은 값이다', createInitialBattleState(), createInitialBattleState());
  expect('14: 초기 상태는 매번 새 객체다 (공유 참조를 넘기지 않는다)',
    createInitialBattleState() !== createInitialBattleState());
  expect('14: 알 수 없는 stage 번호도 유효한 정의로 떨어진다',
    getBattleStage(NaN).stage === 1 && getBattleStage(999).stage === MaxBattleStage);
  expect('14: 모든 stage에 적 정의와 보상이 있다',
    BattleStages.every((s) => s.progressRequired > 0 && s.fatigueCost >= 0 && Number.isInteger(s.stage) &&
      s.enemyId.length > 0 && s.enemyName.length > 0 && s.reward.clearCoins >= 0));
  expect('14: enemyId는 stage마다 고유하다',
    new Set(BattleStages.map((s) => s.enemyId)).size === BattleStages.length);
  expect('14: 적 HP는 stage가 오를수록 커진다',
    BattleStages.every((s, i) => i === 0 || s.progressRequired > BattleStages[i - 1].progressRequired));
  expect('14: 보스 확장 지점이 있다 (마지막 stage가 boss)',
    BattleStages.some((s) => s.enemyType === 'boss') &&
    getBattleStage(MaxBattleStage).enemyType === 'boss');
  expect('14: v1 콘텐츠는 5 stage로 유지한다', BattleStages.length === 5);

  const finalStage = getBattleStage(MaxBattleStage);
  const atFinal = resolveBattle(input({ workoutId: 'w-last', completedSetCount: 999, totalVolumeKg: 0 }),
    state({ currentStage: MaxBattleStage }), finalStage, { isFinalStage: isFinalBattleStage(MaxBattleStage) });
  expect('14: 마지막 stage에서는 더 오르지 않는다', atFinal.nextState.currentStage === MaxBattleStage);
  expect('14: 마지막 stage에서도 피해는 계속 쌓인다', atFinal.nextState.stageProgress > 0);
  expect('14: 마지막 stage에서는 clear 보너스가 나오지 않는다',
    !atFinal.stageCleared && atFinal.reward.coins === atFinal.progressGained);
}

// ── 15. Battle Power: 맨몸 / 볼륨 체감 / 피로도 패널티 ───────────────────────
{
  expect('15: 맨몸(0kg) 운동도 전투력이 나온다 (3세트 = 6)',
    calculateBattlePower(input({ completedSetCount: 3, totalVolumeKg: 0 })) === 6);
  expect('15: 0kg 운동으로도 적에게 실제 피해가 들어간다',
    resolveBattle(input({ workoutId: 'w-bw', completedSetCount: 3, totalVolumeKg: 0 }), state(), stage1)
      .progressGained === 6);
  expect('15: 세트가 늘면 전투력이 늘어난다',
    calculateBattlePower(input({ completedSetCount: 4, totalVolumeKg: 0 })) >
    calculateBattlePower(input({ completedSetCount: 3, totalVolumeKg: 0 })));
  expect('15: 볼륨이 늘면 전투력이 늘어난다',
    calculateBattlePower(input({ completedSetCount: 3, totalVolumeKg: 4000 })) >
    calculateBattlePower(input({ completedSetCount: 3, totalVolumeKg: 1000 })));

  // 체감 효과: 볼륨을 4배로 올려야 볼륨 항이 2배가 된다 — 선형으로 앞서 나가지 않는다.
  const volumeOnly = (kg: number) => calculateBattlePower({ workoutId: 'v', completedSetCount: 0, totalVolumeKg: kg });
  expect('15: 볼륨 4배가 볼륨 항을 2배까지만 올린다 (1000 -> 4000)',
    volumeOnly(4000) - volumeOnly(1000) <= volumeOnly(1000));
  expect('15: 볼륨 4배가 볼륨 항을 2배까지만 올린다 (10000 -> 40000)',
    volumeOnly(40000) - volumeOnly(10000) <= volumeOnly(10000));
  expect('15: 비정상적으로 큰 볼륨도 선형으로 폭증하지 않는다 (1,000,000kg)',
    volumeOnly(1_000_000) === 100 &&
    volumeOnly(1_000_000) < 1_000_000 / BattleConfig.power.volumeUnitKg / 10);
  expect('15: 중량이 높아도 맨몸을 압도하지 않는다 (5세트 5000kg vs 5세트 맨몸 < 2배)',
    calculateBattlePower({ workoutId: 'h', completedSetCount: 5, totalVolumeKg: 5000 }) <
    calculateBattlePower({ workoutId: 'b', completedSetCount: 5, totalVolumeKg: 0 }) * 2);

  // 피로도 패널티 — 막지 않고 완만하게 깎는다.
  check('15: 피로도 구간 배수 (0/39/40/69/70/89/90/100)',
    [0, 39, 40, 69, 70, 89, 90, 100].map(fatiguePowerMultiplier),
    [1, 1, 0.9, 0.9, 0.8, 0.8, 0.7, 0.7]);
  expect('15: 피로도 0에서는 패널티가 없다',
    resolveBattlePower(input(), 0).applied === BASE_POWER);
  expect('15: 피로도가 오르면 전투력이 줄어든다',
    resolveBattlePower(input(), 100).applied < resolveBattlePower(input(), 0).applied);
  expect('15: 피로도 구간이 단조 감소한다', (() => {
    const values = [0, 40, 70, 90].map((f) => resolveBattlePower(input(), f).applied);
    return values.every((v, i) => i === 0 || v <= values[i - 1]);
  })());
  expect('15: 피로도 100에서도 최대 30%만 깎인다',
    resolveBattlePower(input(), 100).applied >= Math.floor(BASE_POWER * 0.7));
  expect('15: 피로도가 아무리 높아도 실제로 운동했으면 피해 > 0이다',
    [90, 95, 100].every((f) =>
      resolveBattle(input({ workoutId: `w-tired-${f}`, completedSetCount: 1, totalVolumeKg: 0 }),
        state({ fatigue: f }), stage1).progressGained > 0));
  expect('15: 수행량이 0이면 피로도와 무관하게 피해도 0이다',
    resolveBattlePower({ workoutId: 'z', completedSetCount: 0, totalVolumeKg: 0 }, 0).applied === 0);
  expect('15: 패널티는 전투 전 피로도로 계산한다 (이번 운동의 피로가 소급되지 않는다)', (() => {
    const before39 = resolveBattle(input({ workoutId: 'w-pre' }), state({ fatigue: 39 }), stage1);
    return before39.power.fatigueMultiplier === 1 && before39.fatigueAfter > 39;
  })());
  check('15: 전투력 내역이 화면에 그대로 온다',
    resolveBattle(input({ workoutId: 'w-breakdown' }), state({ fatigue: 70 }), stage1).power,
    { base: BASE_POWER, fatigueMultiplier: 0.8, applied: Math.floor(BASE_POWER * 0.8) });
}

// ── 16. 보상 ─────────────────────────────────────────────────────────────────
{
  const noClear = resolveBattle(input({ workoutId: 'w-r1', completedSetCount: 2, totalVolumeKg: 0 }), state(), stage1);
  check('16: 못 잡아도 준 피해만큼 재화를 받는다', noClear.reward, { coins: 4, unlockToken: null });

  const cleared = resolveBattle(input({ workoutId: 'w-r2' }), state(), stage1);
  check('16: 잡으면 피해 + clear 보너스를 받는다', cleared.reward,
    { coins: BASE_POWER + stage1.reward.clearCoins, unlockToken: null });

  const stage3 = getBattleStage(3);
  const token = resolveBattle(input({ workoutId: 'w-r3', completedSetCount: 20, totalVolumeKg: 0 }),
    state({ currentStage: 3 }), stage3);
  expect('16: 해금 토큰은 그 stage를 잡았을 때만 나온다',
    token.stageCleared && token.reward.unlockToken === stage3.reward.unlockToken);
  expect('16: 못 잡으면 해금 토큰이 나오지 않는다',
    resolveBattle(input({ workoutId: 'w-r4', completedSetCount: 1, totalVolumeKg: 0 }),
      state({ currentStage: 3 }), stage3).reward.unlockToken === null);
  expect('16: 보상은 저장 상태에 섞이지 않는다 (인벤토리는 다음 slice)',
    !('coins' in cleared.nextState) && !('reward' in cleared.nextState));
}

// ── 17. 피로도 회복 (정책/순수 함수만, lifecycle 연결은 다음 slice) ──────────
{
  expect('17: 시간이 흐르면 피로도가 회복된다 (시간당 2)',
    recoverBattleFatigue(50, 10) === 30);
  expect('17: 0 아래로 내려가지 않는다', recoverBattleFatigue(5, 100) === 0);
  expect('17: 흐른 시간이 없으면 그대로다', recoverBattleFatigue(50, 0) === 50);
  expect('17: 음수/NaN 시간은 회복으로 치지 않는다',
    recoverBattleFatigue(50, -5) === 50 && recoverBattleFatigue(50, NaN) === 50);
  expect('17: 회복 함수도 시계를 읽지 않는다 (같은 인자 = 같은 결과)',
    recoverBattleFatigue(77, 3.5) === recoverBattleFatigue(77, 3.5));
}

// ── 18. 경계: resolver는 Workout/Growth를 모른다 ─────────────────────────────
// 소스 텍스트를 읽는 대신 **행동으로** 증명한다 (Expo tsconfig는 node builtin을 해석하지
// 않아 fs를 쓸 수 없다). Proxy로 읽은 속성을 전부 기록하면, resolver가 실제로 무엇을
// 들여다보는지가 그대로 드러난다 — grep보다 강한 증거다.
{
  const readKeys = <T extends object>(target: T, log: string[]): T =>
    new Proxy(target, {
      get(object, key) {
        if (typeof key === 'string') log.push(key);
        return Reflect.get(object, key);
      },
    });

  const inputReads: string[] = [];
  const stateReads: string[] = [];
  resolveBattle(
    readKeys(input({ workoutId: 'w-probe' }), inputReads),
    readKeys(state({ stageProgress: 4, fatigue: 30 }), stateReads),
    stage1
  );

  const allowedInputKeys = ['workoutId', 'completedSetCount', 'totalVolumeKg'];
  const allowedStateKeys = ['version', 'currentStage', 'stageProgress', 'fatigue', 'lastResolvedWorkoutId'];
  check('18: resolver가 BattleInput에서 읽는 것은 세 값뿐이다',
    [...new Set(inputReads)].sort(), [...allowedInputKeys].sort());
  expect('18: resolver가 BattleState에서 운동/성장 필드를 읽지 않는다',
    [...new Set(stateReads)].every((key) => allowedStateKeys.includes(key)));
  expect('18: resolver는 운동 기록/성장 상태를 요구하지 않는다',
    !inputReads.some((key) => /exercise|record|growth|muscle|body|weight|session(?!Id)/i.test(key)));

  // 결정성을 행동으로 확인한다 — 비결정적 소스를 못 쓰게 막고도 같은 결과가 나와야 한다.
  const realRandom = Math.random;
  const realNow = Date.now;
  const realFetch = (globalThis as { fetch?: unknown }).fetch;
  const boom = () => { throw new Error('resolver must stay deterministic'); };
  Math.random = boom as unknown as typeof Math.random;
  Date.now = boom as unknown as typeof Date.now;
  (globalThis as { fetch?: unknown }).fetch = boom;
  let deterministic = false;
  let sameResult = false;
  try {
    const guarded = resolveBattle(input({ workoutId: 'w-deterministic' }), state(), stage1);
    recoverBattleFatigue(40, 2);
    deterministic = true;
    Math.random = realRandom;
    Date.now = realNow;
    sameResult = JSON.stringify(guarded) ===
      JSON.stringify(resolveBattle(input({ workoutId: 'w-deterministic' }), state(), stage1));
  } catch {
    deterministic = false;
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
    (globalThis as { fetch?: unknown }).fetch = realFetch;
  }
  expect('18: Math.random / Date.now / fetch를 막아도 resolver와 회복 함수가 동작한다', deterministic);
  expect('18: 막았을 때와 풀었을 때의 결과가 같다', sameResult);

  // 운동을 아는 곳은 adapter 하나뿐이다 — adapter를 거치지 않으면 운동 타입이 들어올 수 없다.
  const battleInput = battleInputFromWorkoutRecord({
    id: 'r', sessionId: 'w-shape', date: '2026-08-23', category: 'strength', title: 't',
    completed: true, createdAt: '2026-08-23T00:00:00.000Z',
    exercises: [{ id: 'e', name: 'n', setDetails: [{ id: 's', weightKg: 10, reps: 5, completed: true }] }],
  });
  check('18: adapter가 내보내는 것은 BattleInput 세 값뿐이다',
    Object.keys(battleInput ?? {}).sort(), [...allowedInputKeys].sort());
  check('18: 저장되는 BattleState도 정해진 다섯 값뿐이다',
    Object.keys(resolveBattle(input({ workoutId: 'w-keys' }), state(), stage1).nextState).sort(),
    [...allowedStateKeys].sort());
  expect('18: BattleInput은 얼려서 넘어간다 (경계를 넘은 뒤 수정 불가)',
    Object.isFrozen(battleInput));
  expect('18: Battle 상태에는 실제 신체 수치가 없다',
    !/weightKg|bodyFat|skeletalMuscle|bodyParameters/i.test(
      JSON.stringify(Object.keys(createInitialBattleState()))));
}

// ── 19. 시간 경과 피로도 회복 ────────────────────────────────────────────────
// 도메인은 시계를 읽지 않는다 — 현재 시각은 전부 인자로 들어온다. 그래서 오프라인 10시간도
// 테스트로 그대로 재현된다.
{
  const rested = (fatigue: number, anchor: number | null): BattleProgressionState => ({
    ...createInitialBattleProgression(),
    battle: { ...createInitialBattleState(), fatigue },
    fatigueUpdatedAt: anchor,
  });

  // 0시간 / 30분 / 1시간 / 10시간
  expect('19: 0시간이면 회복이 없다',
    recoverBattleProgression(rested(60, T0), T0).recovered === 0);
  expect('19: 0시간이면 저장할 것도 없다',
    !recoverBattleProgression(rested(60, T0), T0).changed);
  expect('19: 0.5시간이면 정책대로 1 회복한다 (시간당 2)',
    recoverBattleProgression(rested(60, T0), T0 + HOUR / 2).progression.battle.fatigue === 59);
  expect('19: 1시간이면 2 회복한다',
    recoverBattleProgression(rested(60, T0), T0 + HOUR).progression.battle.fatigue === 58);
  expect('19: 오프라인 10시간이면 20 회복한다 (60 → 40)',
    recoverBattleProgression(rested(60, T0), T0 + 10 * HOUR).progression.battle.fatigue === 40);
  expect('19: 회복량이 결과에 그대로 보고된다',
    recoverBattleProgression(rested(60, T0), T0 + 10 * HOUR).recovered === 20);

  // 0 아래로 내려가지 않는다.
  expect('19: 아무리 오래 쉬어도 0 아래로 내려가지 않는다',
    recoverBattleProgression(rested(10, T0), T0 + 1000 * HOUR).progression.battle.fatigue === 0);
  expect('19: 이미 0이면 회복량도 0이다',
    recoverBattleProgression(rested(0, T0), T0 + 100 * HOUR).recovered === 0);
  expect('19: 회복으로 피로도가 늘어나는 일은 없다',
    [0, 1, 30, 99, 100].every((f) =>
      recoverBattleProgression(rested(f, T0), T0 + 3 * HOUR).progression.battle.fatigue <= f));

  // 자투리 시간이 사라지지 않는다 — 앱을 자주 열었다 닫아도 손실이 없다.
  {
    // 29분씩 세 번 조회 = 87분. 정책상 2 회복(60분에 2)이 나와야 한다.
    let doc = rested(60, T0);
    let at = T0;
    for (let i = 0; i < 3; i += 1) {
      at += 29 * 60 * 1000;
      doc = recoverBattleProgression(doc, at).progression;
    }
    expect('19: 29분씩 세 번 열어도 회복이 손실되지 않는다 (87분 → 2 회복)',
      doc.battle.fatigue === 58);
    const once = recoverBattleProgression(rested(60, T0), T0 + 87 * 60 * 1000).progression;
    expect('19: 자주 열든 한 번에 열든 결과가 같다', doc.battle.fatigue === once.battle.fatigue);
  }
  expect('19: 30분이 안 되면 저장하지 않는다 (조회마다 쓰지 않는다)',
    !recoverBattleProgression(rested(60, T0), T0 + 10 * 60 * 1000).changed);

  // 같은 시각에 다시 조회해도 중복 회복이 없다.
  {
    const first = recoverBattleProgression(rested(60, T0), T0 + 5 * HOUR);
    const second = recoverBattleProgression(first.progression, T0 + 5 * HOUR);
    expect('19: 같은 시각 재조회는 추가 회복이 없다', second.recovered === 0 && !second.changed);
    check('19: 같은 시각 재조회는 문서를 바꾸지 않는다', second.progression, first.progression);
    const later = recoverBattleProgression(first.progression, T0 + 6 * HOUR);
    expect('19: 시간이 더 흐르면 이어서 회복한다 (50 → 48)',
      later.progression.battle.fatigue === 48);
  }

  // 시계 이상.
  expect('19: 기준 시각이 미래면 회복이 0이다 (기기 시간이 뒤로 감)',
    recoverBattleProgression(rested(60, T0 + 10 * HOUR), T0).recovered === 0);
  expect('19: 미래 기준은 지금으로 당겨 회복이 영영 멈추지 않게 한다',
    recoverBattleProgression(rested(60, T0 + 10 * HOUR), T0).progression.fatigueUpdatedAt === T0);
  expect('19: 기준을 당긴 뒤에는 정상적으로 회복된다', (() => {
    const fixed = recoverBattleProgression(rested(60, T0 + 10 * HOUR), T0).progression;
    return recoverBattleProgression(fixed, T0 + HOUR).progression.battle.fatigue === 58;
  })());
  expect('19: 기준 시각이 없으면 회복 없이 지금을 기준으로 삼는다', (() => {
    const anchored = recoverBattleProgression(rested(60, null), T0);
    return anchored.recovered === 0 && anchored.progression.fatigueUpdatedAt === T0 &&
      anchored.progression.battle.fatigue === 60;
  })());

  // 손상된 시각 방어.
  const badNow: unknown[] = [NaN, Infinity, -Infinity, -1, 0, '1700000000000', null, undefined, {}];
  badNow.forEach((value) => {
    const result = recoverBattleProgression(rested(60, T0), value as number);
    expect(`19: now=${String(value)} 는 상태를 오염시키지 않는다`,
      Number.isFinite(result.progression.battle.fatigue) &&
      result.progression.battle.fatigue >= 0 && result.progression.battle.fatigue <= 100);
    expect(`19: now=${String(value)} 로는 회복을 주지 않는다`, result.recovered === 0);
  });
  const badAnchor: unknown[] = [NaN, Infinity, -1, 0, 'x', null, undefined, {}];
  badAnchor.forEach((value) => {
    const doc = migrateBattleProgression({ fatigueUpdatedAt: value } as never);
    expect(`19: 손상된 기준 시각(${String(value)})은 null로 떨어진다`, doc.fatigueUpdatedAt === null);
  });
  expect('19: 손상된 기준 시각으로 공짜 회복이 생기지 않는다', (() => {
    const doc = { ...rested(60, null), fatigueUpdatedAt: NaN as unknown as number };
    return recoverBattleProgression(doc, T0).progression.battle.fatigue === 60;
  })());
  expect('19: 회복은 결정적이다 (같은 인자 = 같은 결과)',
    JSON.stringify(recoverBattleProgression(rested(77, T0), T0 + 3.5 * HOUR)) ===
    JSON.stringify(recoverBattleProgression(rested(77, T0), T0 + 3.5 * HOUR)));
  expect('19: 회복이 원본 문서를 바꾸지 않는다', (() => {
    const doc = rested(60, T0);
    const snapshot = JSON.stringify(doc);
    recoverBattleProgression(doc, T0 + 10 * HOUR);
    return JSON.stringify(doc) === snapshot;
  })());

  // 화면이 물어보는 값.
  {
    const view = describeBattleFatigue(rested(60, T0), T0 + 90 * 60 * 1000);
    expect('19: 화면은 저장값과 회복 후 값을 함께 받는다',
      view.storedFatigue === 60 && view.currentFatigue === 57 && view.recovered === 3);
    expect('19: 다음 1 회복까지 남은 시간을 알 수 있다', view.msUntilNextRecovery === 30 * 60 * 1000);
    expect('19: 완전 회복까지 남은 시간을 알 수 있다 (57 × 30분)',
      view.msUntilFullRecovery === 57 * 30 * 60 * 1000);
    const done = describeBattleFatigue(rested(0, T0), T0 + HOUR);
    expect('19: 피로도가 0이면 다음 회복 시각이 없다',
      done.msUntilNextRecovery === null && done.msUntilFullRecovery === 0);
  }
}

// ── 20. 회복 + 전투 트랜잭션 통합 ────────────────────────────────────────────
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
  const tired = (fatigue: number, anchor: number | null) => ({
    version: 1,
    battle: { ...createInitialBattleState(), fatigue },
    coins: 0, unlockTokens: [], fatigueUpdatedAt: anchor,
  });

  await (async () => {
    // 전투가 피로도를 올리면 회복 기준도 그때로 옮겨진다.
    const { ops } = makeStore();
    const applied = await sync(input({ workoutId: 'w-clock' }), ops(), T0);
    expect('20: 전투가 반영되면 회복 기준 시각이 그때로 갱신된다',
      applied.progression?.fatigueUpdatedAt === T0);
    expect('20: 전투로 피로도가 올랐다', applied.progression?.battle.fatigue === stage1.fatigueCost);

    // 같은 운동 재시도는 기준을 리셋하지 않는다.
    const duplicate = await sync(input({ workoutId: 'w-clock' }), ops(), T0 + 20 * 60 * 1000);
    expect('20: 중복 전투는 duplicate다', duplicate.status === 'duplicate');
    expect('20: 중복 전투가 회복 기준을 리셋하지 않는다',
      duplicate.progression?.fatigueUpdatedAt === T0);
    expect('20: 중복 전투는 피로도를 다시 올리지 않는다',
      duplicate.progression?.battle.fatigue === stage1.fatigueCost);
  })();

  await (async () => {
    // 오프라인 회복 → 다음 전투가 회복된 피로도로 판정된다.
    const { store, ops } = makeStore(tired(90, T0));
    const before = await loadRecoveredBattleProgression(ops(), T0 + 10 * HOUR);
    expect('20: 앱 재시작 시 조회만으로 회복이 반영된다',
      before.progression?.battle.fatigue === 70 && before.fatigueRecovered === 20);
    check('20: 회복이 저장되어 다시 읽어도 남아 있다',
      (await ops().loadProgression()).battle.fatigue, 70);
    const writesAfterRecovery = store.writes;

    const again = await loadRecoveredBattleProgression(ops(), T0 + 10 * HOUR);
    expect('20: 같은 시각 재조회는 중복 회복도 추가 저장도 없다',
      again.fatigueRecovered === 0 && store.writes === writesAfterRecovery);

    const later = await loadRecoveredBattleProgression(ops(), T0 + 15 * HOUR);
    expect('20: 시간이 더 흐르면 이어서 회복한다 (70 → 60)',
      later.progression?.battle.fatigue === 60);
  })();

  await (async () => {
    // 쉬고 오면 더 세게 때린다 — 회복이 전투 판정 앞에 적용된다.
    const rest = makeStore(tired(90, T0));
    const tiredRun = makeStore(tired(90, T0));
    const recoveredRun = await sync(input({ workoutId: 'w-rested' }), rest.ops(), T0 + 40 * HOUR);
    const tiredRunResult = await sync(input({ workoutId: 'w-tired' }), tiredRun.ops(), T0);
    expect('20: 회복은 전투 판정 전에 적용된다 (쉬고 오면 패널티가 줄어든다)',
      (recoveredRun.resolution?.power.fatigueMultiplier ?? 0) >
      (tiredRunResult.resolution?.power.fatigueMultiplier ?? 0));
    expect('20: 그래서 같은 운동이라도 쉬고 오면 피해가 더 크다',
      (recoveredRun.resolution?.progressGained ?? 0) >
      (tiredRunResult.resolution?.progressGained ?? 0));
  })();

  await (async () => {
    // 회복 저장 실패 — 잃어버리지 않고 다음 조회에서 다시 계산된다.
    const { store, ops } = makeStore(tired(60, T0));
    store.failNext = 1;
    const failed = await loadRecoveredBattleProgression(ops(), T0 + 10 * HOUR);
    expect('20: 회복 저장에 실패해도 예외를 던지지 않는다', failed.status === 'skipped');
    expect('20: 실패했으므로 회복분을 보고하지 않는다', failed.fatigueRecovered === 0);
    check('20: 저장된 문서는 손상되지 않고 그대로다', (await ops().loadProgression()).battle.fatigue, 60);

    const retry = await loadRecoveredBattleProgression(ops(), T0 + 10 * HOUR);
    expect('20: 다음 조회에서 같은 회복이 그대로 다시 계산된다',
      retry.progression?.battle.fatigue === 40 && retry.fatigueRecovered === 20);
  })();

  await (async () => {
    // 회복 계산이 운동/성장 데이터를 건드리지 않는다.
    const record = {
      id: 'r', sessionId: 'w-recovery-guard', date: '2026-08-23', category: 'strength', title: 't',
      completed: true, createdAt: '2026-08-23T00:00:00.000Z',
      exercises: [{ id: 'e', name: 'n', setDetails: [{ id: 's', weightKg: 60, reps: 10, completed: true }] }],
    } as WorkoutRecord;
    const snapshot = JSON.stringify(record);
    const { ops } = makeStore(tired(80, T0));
    await sync(battleInputFromWorkoutRecord(record), ops(), T0 + 20 * HOUR);
    check('20: 회복/전투가 WorkoutRecord를 건드리지 않는다', JSON.stringify(record), snapshot);
    expect('20: 진행 문서에는 실제 몸 회복 데이터가 없다',
      !/recoveryState|nutrition|bodyFat|skeletalMuscle|muscleSp/i.test(
        JSON.stringify(await ops().loadProgression())));
  })();

  await (async () => {
    // 읽기 실패 시 회복도 시도하지 않는다.
    const { store, ops } = makeStore(tired(60, T0));
    store.failLoad = true;
    const unreadable = await loadRecoveredBattleProgression(ops(), T0 + 10 * HOUR);
    expect('20: 문서를 읽지 못하면 회복도 하지 않는다',
      unreadable.status === 'failed' && unreadable.progression === null &&
      unreadable.fatigueRecovered === 0);
    expect('20: 읽기 실패로 쓰기가 일어나지 않는다', store.writes === 0);
  })();
}

console.log(failures === 0 ? '\nAll BATTLE CORE checks passed.' : `\n${failures} BATTLE CORE check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
