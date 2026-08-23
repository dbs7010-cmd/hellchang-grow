
import { BattleStages, getBattleStage, isFinalBattleStage, MaxBattleStage } from '@/config/battle-stages';
import { INITIAL_BATTLE_STATE, type BattleInput, type BattleState } from '@/types/battle';
import type { SessionCompletionResultSnapshot } from '@/types/session-completion';
import type { WorkoutRecord } from '@/types/workout';
import { calculateBattleProgress, isBattleWorkoutAlreadyResolved, resolveBattle } from '@/utils/battle';
import { battleInputFromCompletion, battleInputFromWorkoutRecord } from '@/utils/battle-input';
import { createInitialBattleState, migrateBattleState } from '@/utils/battle-state';
import { syncCompletedWorkoutToBattle, type BattleSyncOperations } from '@/utils/battle-sync';

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

// ── 1. 결정성 ────────────────────────────────────────────────────────────────
{
  const a = resolveBattle(input(), state(), stage1);
  const b = resolveBattle(input(), state(), stage1);
  check('1: 같은 입력과 상태는 언제나 같은 결과를 낸다', a, b);
  expect('1: 진행도는 완료 세트 + 볼륨 환산이다 (6세트 + 4000kg = 10)',
    calculateBattleProgress(input()) === 10);
  expect('1: resolver는 Math.random/Date.now를 쓰지 않는다 (같은 입력 100회 동일)',
    Array.from({ length: 100 }, () => JSON.stringify(resolveBattle(input(), state(), stage1)))
      .every((row) => row === JSON.stringify(a)));
}

// ── 2/3. 같은 운동 두 번 → 진행도·피로도 0 ───────────────────────────────────
{
  const first = resolveBattle(input({ workoutId: 'session-dup' }), state(), stage1);
  const second = resolveBattle(input({ workoutId: 'session-dup' }), first.nextState, stage1);
  expect('2: 같은 workoutId 두 번째는 duplicate다', second.outcome === 'duplicate');
  expect('2: 두 번째 진행도는 0이다', second.progressGained === 0);
  expect('3: 두 번째 피로도 증가는 0이다', second.fatigueDelta === 0);
  check('2/3: 두 번째는 상태를 전혀 바꾸지 않는다', second.nextState, first.nextState);
  expect('2: 이미 반영한 운동인지 미리 물어볼 수 있다',
    isBattleWorkoutAlreadyResolved(first.nextState, 'session-dup') &&
    !isBattleWorkoutAlreadyResolved(first.nextState, 'session-other'));
  expect('2: workoutId가 비어 있으면 반영하지 않는다',
    resolveBattle(input({ workoutId: '' }), state(), stage1).outcome === 'duplicate');
}

// ── 4. Stage clear ───────────────────────────────────────────────────────────
{
  // stage 1 요구치 10. 6세트 + 4000kg = 10 → 정확히 달성.
  const win = resolveBattle(input(), state(), stage1);
  expect('4: 요구 진행도를 채우면 stage가 오른다', win.outcome === 'win' && win.stageCleared);
  expect('4: currentStage가 1 올라간다', win.nextState.currentStage === 2);
  check('4: 남은 진행도는 초과분만큼 이월된다 (10 - 10 = 0)', win.nextState.stageProgress, 0);

  const overflow = resolveBattle(input({ workoutId: 'w-over', completedSetCount: 14, totalVolumeKg: 3000 }), state(), stage1);
  expect('4: 초과 진행도는 버리지 않고 이월한다 (17 - 10 = 7)',
    overflow.stageCleared && overflow.nextState.stageProgress === 7);
  expect('4: 한 번에 두 단계를 뛰지 않는다', overflow.nextState.currentStage === 2);

  const carried = resolveBattle(input({ workoutId: 'w-next' }), overflow.nextState, getBattleStage(2));
  expect('4: 이월분은 다음 운동에서 그대로 쓰인다 (7 + 10 >= 14)', carried.stageCleared);
}

// ── 5. Stage 미달 ────────────────────────────────────────────────────────────
{
  const loss = resolveBattle(input({ workoutId: 'w-small', completedSetCount: 2, totalVolumeKg: 0 }), state(), stage1);
  expect('5: 요구 진행도에 못 미치면 stage가 오르지 않는다', loss.outcome === 'loss' && !loss.stageCleared);
  expect('5: 진행도는 그대로 쌓인다', loss.nextState.stageProgress === 2);
  expect('5: currentStage는 그대로다', loss.nextState.currentStage === 1);
  expect('5: 패배해도 진행도가 사라지지 않는다', loss.nextState.stageProgress > state().stageProgress);

  const zero = resolveBattle(input({ workoutId: 'w-zero', completedSetCount: 0, totalVolumeKg: 0 }), state({ stageProgress: 50 }), stage1);
  expect('5: 진행도 0인 운동으로는 stage를 넘기지 않는다', !zero.stageCleared);
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
    expect(`8: ${row.workoutId} 입력이 진행도를 오염시키지 않는다`,
      Number.isFinite(s.stageProgress) && s.stageProgress >= 0);
    expect(`8: ${row.workoutId} 입력이 피로도를 오염시키지 않는다`,
      Number.isFinite(s.fatigue) && s.fatigue >= 0 && s.fatigue <= 100);
    expect(`8: ${row.workoutId} 입력이 stage를 오염시키지 않는다`,
      Number.isInteger(s.currentStage) && s.currentStage >= 1);
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
}

// ── 9/10. 원본 mutation 없음 ─────────────────────────────────────────────────
{
  const original = input({ workoutId: 'w-immutable' });
  const originalState = state({ stageProgress: 3, fatigue: 20 });
  const inputSnapshot = JSON.stringify(original);
  const stateSnapshot = JSON.stringify(originalState);

  const result = resolveBattle(original, originalState, stage1);
  check('9: BattleInput 원본이 바뀌지 않는다', JSON.stringify(original), inputSnapshot);
  check('10: BattleState 원본이 바뀌지 않는다', JSON.stringify(originalState), stateSnapshot);
  expect('10: 새 상태는 원본과 다른 객체다', result.nextState !== originalState);
  check('10: 초기 상태 상수도 바뀌지 않는다', INITIAL_BATTLE_STATE,
    { version: 1, currentStage: 1, stageProgress: 0, fatigue: 0, lastResolvedWorkoutId: null });
}

// ── 11. Battle 패배가 운동 데이터를 바꾸지 않는다 ────────────────────────────
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
  const lost = resolveBattle(battleInput!, state(), stage1);
  expect('11: 이 운동으로는 stage를 넘기지 못한다 (패배 시나리오)', !lost.stageCleared);
  check('11: 패배해도 WorkoutRecord 원본이 그대로다', JSON.stringify(record), recordSnapshot);
  expect('11: 무효 세트(0회)는 기존 통계 규칙대로 빠진다 (2세트 + 1200kg = 3)',
    battleInput?.completedSetCount === 2 && battleInput?.totalVolumeKg === 1200);
  expect('11: sessionId 없는 기록은 Battle에 들어가지 않는다',
    battleInputFromWorkoutRecord({ ...record, sessionId: undefined }) === null);

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

// ── 12/13. persistence roundtrip + 재시작 후 중복 방지 ───────────────────────
{
  const store = new Map<string, string>();
  const ops = (): BattleSyncOperations => ({
    loadState: async () => migrateBattleState(JSON.parse(store.get('battle') ?? 'null')),
    saveState: async (next) => { store.set('battle', JSON.stringify(next)); },
  });

  await (async () => {
    const first = await syncCompletedWorkoutToBattle(input({ workoutId: 'w-persist' }), ops());
    expect('12: 처음 반영은 applied다', first.status === 'applied');
    const reloaded = await ops().loadState();
    check('12: 저장했다 읽어도 같은 상태다 (roundtrip)', reloaded, first.state);

    // 앱 재시작을 흉내낸다 — 메모리 상태를 버리고 저장된 값에서만 다시 판단한다.
    const again = await syncCompletedWorkoutToBattle(input({ workoutId: 'w-persist' }), ops());
    expect('13: 재시작 후 같은 운동은 duplicate다', again.status === 'duplicate');
    check('13: 재시작 후 재처리해도 상태가 그대로다', again.state, first.state);
    expect('13: 재처리로 진행도가 늘지 않는다', again.resolution?.progressGained === 0);
    expect('13: 재처리로 피로도가 늘지 않는다', again.resolution?.fatigueDelta === 0);
    expect('13: 재처리로 stage가 중복 상승하지 않는다',
      again.state?.currentStage === first.state?.currentStage);

    const next = await syncCompletedWorkoutToBattle(input({ workoutId: 'w-persist-2' }), ops());
    expect('13: 다른 운동은 정상적으로 반영된다', next.status === 'applied');

    // 저장 실패는 Battle만의 문제다 — 상태를 되돌리지 않고 재시도 가능해야 한다.
    const beforeFailure = await ops().loadState();
    const failing = await syncCompletedWorkoutToBattle(input({ workoutId: 'w-fail' }), {
      loadState: ops().loadState,
      saveState: async () => { throw new Error('storage full'); },
    });
    expect('10/13: 저장 실패는 예외를 던지지 않고 failed로 알린다', failing.status === 'failed');
    check('10/13: 저장 실패 후에도 게임 상태는 이전 그대로다', await ops().loadState(), beforeFailure);
    const retry = await syncCompletedWorkoutToBattle(input({ workoutId: 'w-fail' }), ops());
    expect('10/13: 실패한 운동은 그대로 재시도할 수 있다', retry.status === 'applied');

    const unreadable = await syncCompletedWorkoutToBattle(input({ workoutId: 'w-x' }), {
      loadState: async () => { throw new Error('unreadable'); },
      saveState: async () => {},
    });
    expect('10: 상태를 읽지 못하면 아무것도 하지 않는다',
      unreadable.status === 'failed' && unreadable.state === null);

    const skipped = await syncCompletedWorkoutToBattle(null, ops());
    expect('10: 반영할 입력이 없으면 skipped다 (저장하지 않는다)', skipped.status === 'skipped');
  })();
}

// ── 14. 초기 상태 ────────────────────────────────────────────────────────────
{
  check('14: 저장된 값이 없으면 초기 상태다', migrateBattleState(null), {
    version: 1, currentStage: 1, stageProgress: 0, fatigue: 0, lastResolvedWorkoutId: null,
  });
  check('14: 초기 상태 생성은 매번 같은 값이다', createInitialBattleState(), createInitialBattleState());
  expect('14: 초기 상태는 매번 새 객체다 (공유 참조를 넘기지 않는다)',
    createInitialBattleState() !== createInitialBattleState());
  expect('14: 첫 stage 정의가 존재한다', getBattleStage(1).stage === 1 && getBattleStage(1).progressRequired > 0);
  expect('14: 알 수 없는 stage 번호도 유효한 정의로 떨어진다',
    getBattleStage(NaN).stage === 1 && getBattleStage(999).stage === MaxBattleStage);
  expect('14: 마지막 stage에서는 더 오르지 않고 진행도만 쌓인다', (() => {
    const last = state({ currentStage: MaxBattleStage });
    const result = resolveBattle(input({ workoutId: 'w-last', completedSetCount: 999, totalVolumeKg: 0 }),
      last, getBattleStage(MaxBattleStage), { isFinalStage: isFinalBattleStage(MaxBattleStage) });
    return result.nextState.currentStage === MaxBattleStage && result.nextState.stageProgress > 0;
  })());
  expect('14: 모든 stage 정의가 유효하다',
    BattleStages.every((s) => s.progressRequired > 0 && s.fatigueCost >= 0 && Number.isInteger(s.stage)));
}

// ── 15. 경계: resolver는 Workout/Growth를 모른다 ─────────────────────────────
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
  check('15: resolver가 BattleInput에서 읽는 것은 세 값뿐이다',
    [...new Set(inputReads)].sort(), [...allowedInputKeys].sort());
  expect('15: resolver가 BattleState에서 운동/성장 필드를 읽지 않는다',
    [...new Set(stateReads)].every((key) => allowedStateKeys.includes(key)));
  expect('15: resolver는 운동 기록/성장 상태를 요구하지 않는다',
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
  expect('15: Math.random / Date.now / fetch를 막아도 resolver가 동작한다', deterministic);
  expect('15: 막았을 때와 풀었을 때의 결과가 같다', sameResult);

  // 운동을 아는 곳은 adapter 하나뿐이다 — adapter를 거치지 않으면 운동 타입이 들어올 수 없다.
  const battleInput = battleInputFromWorkoutRecord({
    id: 'r', sessionId: 'w-shape', date: '2026-08-23', category: 'strength', title: 't',
    completed: true, createdAt: '2026-08-23T00:00:00.000Z',
    exercises: [{ id: 'e', name: 'n', setDetails: [{ id: 's', weightKg: 10, reps: 5, completed: true }] }],
  });
  check('15: adapter가 내보내는 것은 BattleInput 세 값뿐이다',
    Object.keys(battleInput ?? {}).sort(), [...allowedInputKeys].sort());
  check('15: 저장되는 BattleState도 정해진 다섯 값뿐이다',
    Object.keys(resolveBattle(input({ workoutId: 'w-keys' }), state(), stage1).nextState).sort(),
    [...allowedStateKeys].sort());
  expect('15: BattleInput은 얼려서 넘어간다 (경계를 넘은 뒤 수정 불가)',
    Object.isFrozen(battleInput));
}

console.log(failures === 0 ? '\nAll BATTLE CORE checks passed.' : `\n${failures} BATTLE CORE check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
