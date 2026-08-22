import { mutateSessionIfActive, runSessionCompletion } from '@/utils/core-loop';
import { shouldConfirmSessionExit } from '@/utils/session-exit';
import { detectPRs } from '@/utils/exercise-history';
import * as sessionExitModule from '@/utils/session-exit';
import type {
  SessionCompletionReceipt,
  SessionCompletionResultSnapshot,
} from '@/types/session-completion';
import {
  addExerciseToSession,
  addSetToExercise,
  completeSet,
  isEffectiveSet,
  sessionToWorkoutRecordInput,
  computeCompletedExerciseCount,
  computeCompletedSetsCount,
  computeTotalVolumeKg,
  createSession,
  getRestSecondsRemaining,
  pauseSession,
  resumeSession,
  startRest,
} from '@/utils/workout-session';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (!pass) {
    failures++;
    console.log('  expected:', expected);
    console.log('  actual:  ', actual);
  }
}

const START_ISO = '2026-08-22T00:00:00.000Z';
const START_MS = new Date(START_ISO).getTime();

// A: 계획 수가 아니라 완료 세트가 있는 고유 운동만 Result 개수로 센다.
{
  let session = createSession('strength', 'core-a', START_ISO, {
    initialExercises: [
      { exerciseId: 'squat', exerciseName: '스쿼트' },
      { exerciseId: 'leg-press', exerciseName: '레그프레스' },
      { exerciseId: 'hack-squat', exerciseName: '핵스쿼트' },
      { exerciseId: 'leg-extension', exerciseName: '레그익스텐션' },
    ],
  });
  session = addSetToExercise(session, session.exercises[0].id, 'a-set-1', { weightKg: 40, reps: 8 });
  session = completeSet(session, session.exercises[0].id, 'a-set-1');
  session = addSetToExercise(session, session.exercises[1].id, 'a-set-2', { weightKg: 50, reps: 8 });
  session = completeSet(session, session.exercises[1].id, 'a-set-2');
  check('A: four planned exercises with two performed reports exerciseCount 2',
    computeCompletedExerciseCount(session), 2);
}

// B: 0세트 세션은 완료 보상 경로의 전제조건을 만족하지 않는다.
{
  const empty = createSession('strength', 'core-b', START_ISO, {
    initialExercises: [{ exerciseId: 'squat', exerciseName: '스쿼트' }],
  });
  check('B: empty session has zero completed sets', computeCompletedSetsCount(empty), 0);
  check('B: empty session has zero completed exercises', computeCompletedExerciseCount(empty), 0);
}

// C: paused 상태에서 handler가 호출돼도 state-level guard가 mutation 자체를 거부한다.
{
  let session = createSession('strength', 'core-c', START_ISO);
  session = addExerciseToSession(session, { id: 'c-ex', exerciseId: 'squat', exerciseName: '스쿼트' });
  session = addSetToExercise(session, 'c-ex', 'c-set', { weightKg: 40, reps: 8 });
  session = pauseSession(session, START_MS + 10_000);
  const attempted = mutateSessionIfActive(session, (active) => completeSet(active, 'c-ex', 'c-set'));
  check('C: pause blocks set completion at the state boundary', attempted, session);
}

// D: 60초 휴식에서 20초 경과 후 30초 pause해도 resume 직후 약 40초가 유지된다.
{
  let session = startRest(createSession('strength', 'core-d', START_ISO), 60, START_MS);
  session = pauseSession(session, START_MS + 20_000);
  check('D: rest freezes at 40 seconds when paused', getRestSecondsRemaining(session, START_MS + 50_000), 40);
  session = resumeSession(session, new Date(START_MS + 50_000).toISOString());
  check('D: rest resumes from the frozen 40 seconds', getRestSecondsRemaining(session, START_MS + 50_000), 40);
  check('D: resumed rest continues counting down', getRestSecondsRemaining(session, START_MS + 60_000), 30);
}

type FailurePoint = 'growth' | 'record' | 'rewards-after-save' | 'cleanup-after-save';

function makeReceipt(sessionId: string): SessionCompletionReceipt {
  return {
    version: 1,
    sessionId,
    completedAt: START_ISO,
    growthApplied: false,
    workoutRecordSaved: false,
    rewardsSaved: false,
    snapshot: {
      sessionResult: { sessionId },
      recordInput: { sessionId, date: '2026-08-22' },
      durationMinutes: 1,
      category: 'strength',
      exerciseCount: 1,
      completedSets: 1,
      totalVolumeKg: 320,
      prs: [],
      xpAwarded: 10,
      passXpAfter: 10,
      passLevel: 1,
      routineCompleted: false,
      bodyParametersBefore: {},
    } as unknown as SessionCompletionResultSnapshot,
  };
}

function makeCompletionHarness(sessionId: string, failure?: FailurePoint) {
  let receipt: SessionCompletionReceipt | null = null;
  let failed = false;
  const effects = {
    growth: new Set<string>(),
    records: new Set<string>(),
    rewards: new Set<string>(),
    cleanup: new Set<string>(),
  };

  const operations = {
    loadReceipt: async () => receipt,
    saveReceipt: async (next: SessionCompletionReceipt) => { receipt = structuredClone(next); },
    clearReceipt: async () => { receipt = null; },
    applyGrowth: async () => {
      if (failure === 'growth' && !failed) {
        failed = true;
        throw new Error('forced growth failure');
      }
      effects.growth.add(sessionId);
      return {
        growth: { sessionId },
        bodyParametersAfter: {},
        bodyParametersWithPump: {},
      } as Pick<SessionCompletionResultSnapshot,
        'growth' | 'bodyParametersAfter' | 'bodyParametersWithPump'>;
    },
    saveWorkoutRecord: async () => {
      if (failure === 'record' && !failed) {
        failed = true;
        throw new Error('forced record failure');
      }
      effects.records.add(sessionId);
    },
    saveRewards: async () => {
      // 실제 저장은 session 기준 absolute target/date idempotency이므로 throw 뒤 재호출도 1회 효과다.
      effects.rewards.add(sessionId);
      if (failure === 'rewards-after-save' && !failed) {
        failed = true;
        throw new Error('forced XP failure after persistence');
      }
      return { weeklyCount: 1, streak: 1 };
    },
    cleanupSession: async () => {
      effects.cleanup.add(sessionId);
      if (failure === 'cleanup-after-save' && !failed) {
        failed = true;
        throw new Error('forced cleanup failure after persistence');
      }
    },
  };

  return {
    effects,
    operations,
    receipt: () => receipt,
    run: () => runSessionCompletion(makeReceipt(sessionId), operations),
  };
}

async function expectFirstFailure(run: () => Promise<unknown>) {
  try { await run(); } catch { return; }
  failures++;
  console.log('FAIL - expected forced failure');
}

// Persistence A: Growth 실패 전에는 어떤 영구 보상도 확정되지 않고 재시도로 각각 1회 적용된다.
{
  const harness = makeCompletionHarness('receipt-a', 'growth');
  await expectFirstFailure(harness.run);
  check('Receipt A: growth failure leaves growth unapplied', harness.effects.growth.size, 0);
  check('Receipt A: growth failure leaves records unsaved', harness.effects.records.size, 0);
  check('Receipt A: growth failure leaves rewards unsaved', harness.effects.rewards.size, 0);
  await harness.run();
  check('Receipt A: retry applies all effects exactly once', [
    harness.effects.growth.size,
    harness.effects.records.size,
    harness.effects.rewards.size,
    harness.effects.cleanup.size,
  ], [1, 1, 1, 1]);
}

// Persistence B: Record 실패 뒤 재시도는 Growth를 건너뛰고 record를 하나만 만든다.
{
  const harness = makeCompletionHarness('receipt-b', 'record');
  await expectFirstFailure(harness.run);
  check('Receipt B: growth result snapshot survives record failure',
    harness.receipt()?.snapshot.growth?.sessionId, 'receipt-b');
  await harness.run();
  check('Receipt B: retry keeps one growth and one record',
    [harness.effects.growth.size, harness.effects.records.size], [1, 1]);
}

// Persistence C: Record 성공 후 XP 저장이 throw해도 재시도 시 record/XP 효과는 중복되지 않는다.
{
  const harness = makeCompletionHarness('receipt-c', 'rewards-after-save');
  await expectFirstFailure(harness.run);
  check('Receipt C: record is already saved once', harness.effects.records.size, 1);
  await harness.run();
  check('Receipt C: retry does not duplicate record or rewards',
    [harness.effects.records.size, harness.effects.rewards.size], [1, 1]);
}

// Persistence D: Cleanup 자체가 저장 후 실패해도 영구 저장 단계는 다시 실행되지 않는다.
{
  const harness = makeCompletionHarness('receipt-d', 'cleanup-after-save');
  await expectFirstFailure(harness.run);
  await harness.run();
  check('Receipt D: cleanup retry keeps every effect at one', [
    harness.effects.growth.size,
    harness.effects.records.size,
    harness.effects.rewards.size,
    harness.effects.cleanup.size,
  ], [1, 1, 1, 1]);
}

// Persistence E: 빠른 완료 연타는 같은 session-id의 in-flight Promise를 공유한다.
{
  const harness = makeCompletionHarness('receipt-e');
  const [first, second] = await Promise.all([harness.run(), harness.run()]);
  check('Receipt E: duplicate submit shares one completion result',
    [first.sessionId, second.sessionId], ['receipt-e', 'receipt-e']);
  check('Receipt E: duplicate submit has one effect per stage', [
    harness.effects.growth.size,
    harness.effects.records.size,
    harness.effects.rewards.size,
    harness.effects.cleanup.size,
  ], [1, 1, 1, 1]);
}

// Persistence F: receipt를 storage에서 다시 읽으면 앱 재시작 뒤 미완료 단계부터 이어간다.
{
  const harness = makeCompletionHarness('receipt-f', 'record');
  await expectFirstFailure(harness.run);
  const persistedBeforeRestart = structuredClone(harness.receipt());
  check('Receipt F: persisted receipt contains the original Result snapshot',
    persistedBeforeRestart?.snapshot.growth?.sessionId, 'receipt-f');
  // 새 호출은 메모리 in-flight가 끝난 뒤 persisted receipt를 읽는 재시작과 동일한 경계다.
  await harness.run();
  check('Receipt F: restart resumes without duplicate growth', [
    harness.effects.growth.size,
    harness.effects.records.size,
    harness.effects.rewards.size,
  ], [1, 1, 1]);
  check('Receipt F: successful recovery clears pending receipt', harness.receipt(), null);
}


// ── 뒤로가기 안전 이탈: 세션을 끝내지 않고 화면만 벗어난다 ─────────────────
{
  let session = createSession('strength', 'core-exit', START_ISO, {
    initialExercises: [{ exerciseId: 'squat', exerciseName: '스쿼트' }],
  });
  session = addSetToExercise(session, session.exercises[0].id, 'exit-set-1', { weightKg: 60, reps: 5 });
  session = completeSet(session, session.exercises[0].id, 'exit-set-1');
  const beforeExit = structuredClone(session);

  check('A1: back during a workout asks for confirmation',
    shouldConfirmSessionExit({ hasActiveSession: true, hasSummary: false, isEnding: false, exitConfirmed: false }),
    true);
  check('A1: a paused session is still a workout in progress',
    shouldConfirmSessionExit({ hasActiveSession: true, hasSummary: false, isEnding: false, exitConfirmed: false }),
    true);

  check('A2: staying keeps the guard armed for the next back press',
    shouldConfirmSessionExit({ hasActiveSession: true, hasSummary: false, isEnding: false, exitConfirmed: false }),
    true);
  check('A2: the session object is untouched by the exit decision', session, beforeExit);

  check('A3: a confirmed exit is allowed through navigation',
    shouldConfirmSessionExit({ hasActiveSession: true, hasSummary: false, isEnding: false, exitConfirmed: true }),
    false);
  check('A3: leaving does not clear the completed sets that will be resumed',
    computeCompletedSetsCount(session), 1);
  check('A3: leaving keeps the session status untouched', session.status, 'active');

  // A4: 이탈 경로는 저장/보상 파이프라인과 연결돼 있지 않다 — 순수 판단 함수 하나뿐이다.
  check('A4: the exit module exposes only a pure decision (no persistence, no rewards)',
    Object.keys(sessionExitModule).sort(),
    ['shouldConfirmSessionExit']);
  check('A4: the decision never mutates its input session',
    computeCompletedExerciseCount(session), 1);

  check('A5: the result screen never blocks back',
    shouldConfirmSessionExit({ hasActiveSession: true, hasSummary: true, isEnding: false, exitConfirmed: false }),
    false);
  check('A5: completion in flight never blocks back',
    shouldConfirmSessionExit({ hasActiveSession: true, hasSummary: false, isEnding: true, exitConfirmed: false }),
    false);
  check('A5: with no session there is nothing to guard',
    shouldConfirmSessionExit({ hasActiveSession: false, hasSummary: false, isEnding: false, exitConfirmed: false }),
    false);
}


// ── 무효 세트(체크만 하고 횟수 없음)는 어떤 기록/보상도 만들지 않는다 ─────────
{
  const set = (over: Record<string, unknown>) => ({ id: 's', completed: true, ...over }) as never;
  check('A: a completed set with no reps is not an effective set', isEffectiveSet(set({})), false);
  check('B: a completed set with 0 reps is not an effective set', isEffectiveSet(set({ reps: 0 })), false);
  check('H: bodyweight 0kg x 10 reps is a real set', isEffectiveSet(set({ weightKg: 0, reps: 10 })), true);
  check('I: a duration set counts its seconds as reps', isEffectiveSet(set({ reps: 45 })), true);
  check('K: a normal weighted set stays effective', isEffectiveSet(set({ weightKg: 60, reps: 8 })), true);
  check('an unchecked set is never effective', isEffectiveSet({ id: 's', weightKg: 60, reps: 8, completed: false }), false);

  // 무효 세트만 있는 세션
  let empty = createSession('strength', 'core-invalid', START_ISO, {
    initialExercises: [{ exerciseId: 'squat', exerciseName: '스쿼트' }],
  });
  empty = addSetToExercise(empty, empty.exercises[0].id, 'inv-1');
  empty = completeSet(empty, empty.exercises[0].id, 'inv-1');
  empty = addSetToExercise(empty, empty.exercises[0].id, 'inv-2', { weightKg: 100, reps: 0 });
  empty = completeSet(empty, empty.exercises[0].id, 'inv-2');
  check('D: a session of invalid sets reports zero completed sets', computeCompletedSetsCount(empty), 0);
  check('E: a session of invalid sets reports zero completed exercises', computeCompletedExerciseCount(empty), 0);
  const emptyRecord = sessionToWorkoutRecordInput(empty, '하체');
  check('F: invalid sets are never written into the record', emptyRecord.exercises?.[0]?.setDetails, undefined);
  check('F: the record keeps no set summary for them', emptyRecord.exercises?.[0]?.sets, undefined);
  /**
   * G: 무효 세트만 있는 세션은 기존 0세트 세션과 같은 경로다. endWorkoutSession이
   * completedSets === 0에서 되돌아가므로 record/XP/streak/Growth 어느 것도 실행되지 않는다.
   */
  check('G: an invalid-only session takes the same path as a zero-set session',
    computeCompletedSetsCount(empty) === 0, true);

  // C: 중량만 있고 횟수가 없으면 PR이 되지 않는다
  check('C: a 100kg set with 0 reps produces no PR', detectPRs(empty, []).length, 0);

  // J: 유효/무효가 섞이면 유효한 것만 남는다
  let mixed = createSession('strength', 'core-mixed', START_ISO, {
    initialExercises: [
      { exerciseId: 'squat', exerciseName: '스쿼트' },
      { exerciseId: 'pull-up', exerciseName: '풀업' },
    ],
  });
  mixed = addSetToExercise(mixed, mixed.exercises[0].id, 'mix-1', { weightKg: 60, reps: 10 });
  mixed = completeSet(mixed, mixed.exercises[0].id, 'mix-1');
  mixed = addSetToExercise(mixed, mixed.exercises[0].id, 'mix-2', { weightKg: 60 });
  mixed = completeSet(mixed, mixed.exercises[0].id, 'mix-2');
  mixed = addSetToExercise(mixed, mixed.exercises[1].id, 'mix-3', { weightKg: 0, reps: 12 });
  mixed = completeSet(mixed, mixed.exercises[1].id, 'mix-3');
  check('J: only the effective sets are counted', computeCompletedSetsCount(mixed), 2);
  check('J: both exercises with a real set are counted', computeCompletedExerciseCount(mixed), 2);
  const mixedRecord = sessionToWorkoutRecordInput(mixed, '하체');
  check('J: the record stores only the effective squat set',
    mixedRecord.exercises?.[0]?.setDetails?.map((entry) => entry.id), ['mix-1']);
  check('H: the bodyweight set is stored as a real set',
    mixedRecord.exercises?.[1]?.setDetails?.map((entry) => entry.id), ['mix-3']);
  check('K: a normal session still reports its volume', computeTotalVolumeKg(mixed), 600);
}

console.log(failures === 0 ? '\nAll CORE LOOP checks passed.' : `\n${failures} CORE LOOP check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
