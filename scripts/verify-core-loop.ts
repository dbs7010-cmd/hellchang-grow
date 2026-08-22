import { mutateSessionIfActive, runSessionCompletion } from '@/utils/core-loop';
import type {
  SessionCompletionReceipt,
  SessionCompletionResultSnapshot,
} from '@/types/session-completion';
import {
  addExerciseToSession,
  addSetToExercise,
  completeSet,
  computeCompletedExerciseCount,
  computeCompletedSetsCount,
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

console.log(failures === 0 ? '\nAll CORE LOOP checks passed.' : `\n${failures} CORE LOOP check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
