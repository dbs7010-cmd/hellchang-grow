import type {
  SessionCompletionReceipt,
  SessionCompletionResultSnapshot,
} from '@/types/session-completion';
import type { WorkoutSession } from '@/types/workout-session';
import { runSessionCompletion } from '@/utils/core-loop';
import {
  addExerciseToSession,
  addSetToExercise,
  clearRest,
  completeSet,
  completeSetAndStartRest,
  completeSession,
  computeCompletedExerciseCount,
  computeCompletedSetsCount,
  createSession,
  ensurePendingSet,
  getCurrentExercise,
  getRestSecondsRemaining,
  sessionToWorkoutRecordInput,
  setCurrentExercise,
  updateSet,
} from '@/utils/workout-session';

let failures = 0;
let checks = 0;

function check(name: string, actual: unknown, expected: unknown) {
  checks++;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (!pass) {
    failures++;
    console.log('  expected:', expected);
    console.log('  actual:  ', actual);
  }
}

const START_ISO = '2026-08-26T09:00:00.000Z';
const START_MS = new Date(START_ISO).getTime();

function routineSession(id: string): WorkoutSession {
  return createSession('strength', id, START_ISO, {
    routineId: 'routine-abc',
    routineName: 'A / B / C',
    initialExercises: [
      { exerciseId: 'bench-press', exerciseName: 'A', targetSets: 3, defaultRestSeconds: 90 },
      { exerciseId: 'squat', exerciseName: 'B', targetSets: 3, defaultRestSeconds: 120 },
      { exerciseId: 'lat-pulldown', exerciseName: 'C', targetSets: 3, defaultRestSeconds: 75 },
    ],
  });
}

// A: A 1세트 → C 1세트 → A 복귀. 포커스만 바뀌고 각 운동의 기록은 그대로다.
{
  let session = routineSession('free-nav-a');
  const [a, , c] = session.exercises;
  session = addSetToExercise(session, a.id, 'a-set-1', { weightKg: 60, reps: 8 });
  session = completeSet(session, a.id, 'a-set-1');
  session = setCurrentExercise(session, c.id);
  session = addSetToExercise(session, c.id, 'c-set-1', { weightKg: 40, reps: 10 });
  session = completeSet(session, c.id, 'c-set-1');
  session = setCurrentExercise(session, a.id);

  check('A: A -> C -> A returns focus to A', getCurrentExercise(session)?.exerciseName, 'A');
  check('A: returning to A preserves its completed set', session.exercises[0].sets, [
    { id: 'a-set-1', weightKg: 60, reps: 8, completed: true },
  ]);
  check('A: C keeps its own completed set', session.exercises[2].sets, [
    { id: 'c-set-1', weightKg: 40, reps: 10, completed: true },
  ]);
  check('A: navigation does not create a fake B set', session.exercises[1].sets.length, 0);
}

// B: pending 입력을 둔 채 다른 운동에 갔다 돌아와도 값과 완료 여부가 보존된다.
{
  let session = routineSession('free-nav-b');
  const [a, b] = session.exercises;
  session = ensurePendingSet(session, a.id, 'a-pending', { weightKg: 50, reps: 10 });
  session = updateSet(session, a.id, 'a-pending', { weightKg: 57.5, reps: 7 });
  session = setCurrentExercise(session, b.id);
  session = setCurrentExercise(session, a.id);

  check('B: pending values survive A -> B -> A', session.exercises[0].sets[0], {
    id: 'a-pending', weightKg: 57.5, reps: 7, completed: false,
  });
  const unchanged = ensurePendingSet(session, a.id, 'must-not-be-added');
  check('B: restore does not add a second pending set', unchanged.exercises[0].sets.length, 1);
}

// C/H: REST는 세션 전역 타이머지만 운동 선택과 독립적이다. skip 연타도 멱등이다.
{
  let session = routineSession('free-nav-c');
  const [a, , c] = session.exercises;
  session = addSetToExercise(session, a.id, 'a-rest-set', { weightKg: 70, reps: 5 });
  session = completeSetAndStartRest(session, a.id, 'a-rest-set', 90, START_MS);
  session = setCurrentExercise(session, c.id);

  check('C: switching during REST changes only the current exercise', getCurrentExercise(session)?.exerciseName, 'C');
  check('C: REST deadline survives exercise selection', getRestSecondsRemaining(session, START_MS + 10_000), 80);
  check('C: completed A set survives REST navigation', computeCompletedSetsCount(session), 1);
  session = clearRest(session);
  const skippedAgain = clearRest(session);
  check('H: repeated REST skip is an identity no-op', skippedAgain, session);
}

// D: B를 하지 않아도 종료/기록이 가능하며 B를 실패나 가짜 완료로 바꾸지 않는다.
{
  let session = routineSession('free-nav-d');
  const [a, , c] = session.exercises;
  session = addSetToExercise(session, a.id, 'a-d', { weightKg: 60, reps: 8 });
  session = completeSet(session, a.id, 'a-d');
  session = setCurrentExercise(session, c.id);
  session = addSetToExercise(session, c.id, 'c-d', { weightKg: 45, reps: 9 });
  session = completeSet(session, c.id, 'c-d');
  const completed = completeSession(session, new Date(START_MS + 600_000).toISOString(), START_MS + 600_000);
  const record = sessionToWorkoutRecordInput(completed, '웨이트');

  check('D: incomplete routine can still become a completed session', completed.status, 'completed');
  check('D: only performed exercises count in Result', computeCompletedExerciseCount(completed), 2);
  check('D: skipped B remains present but unfinished', record.exercises?.[1], {
    id: session.exercises[1].id,
    name: 'B',
    exerciseId: 'squat',
  });
}

// E: 루틴 외 운동 추가 → 선택 → 기록이 Result/accounting에 포함된다.
{
  let session = routineSession('free-nav-e');
  session = addExerciseToSession(session, {
    id: 'extra-exercise', exerciseId: 'deadlift', exerciseName: '추가 운동', targetSets: 2,
  });
  session = setCurrentExercise(session, 'extra-exercise');
  session = addSetToExercise(session, 'extra-exercise', 'extra-set', { weightKg: 100, reps: 3 });
  session = completeSet(session, 'extra-exercise', 'extra-set');
  const record = sessionToWorkoutRecordInput(session, '웨이트');

  check('E: added exercise can be selected immediately', getCurrentExercise(session)?.exerciseName, '추가 운동');
  check('E: added exercise contributes one effective set', computeCompletedSetsCount(session), 1);
  check('E: added exercise is included in the record', record.exercises?.at(-1)?.exerciseId, 'deadlift');
}

// F: 저장/복원 경계의 JSON round-trip 뒤에도 포커스, pending, completed, REST가 유지된다.
{
  let session = routineSession('free-nav-f');
  const [a, b] = session.exercises;
  session = addSetToExercise(session, a.id, 'a-done', { weightKg: 55, reps: 8 });
  session = completeSetAndStartRest(session, a.id, 'a-done', 60, START_MS);
  session = setCurrentExercise(session, b.id);
  session = ensurePendingSet(session, b.id, 'b-pending', { weightKg: 80, reps: 6 });
  const restored = JSON.parse(JSON.stringify(session)) as WorkoutSession;

  check('F: restore preserves selected exercise', getCurrentExercise(restored)?.exerciseName, 'B');
  check('F: restore preserves completed and pending sets', restored.exercises.map((e) => e.sets.length), [1, 1, 0]);
  check('F: restore preserves REST absolute deadline', getRestSecondsRemaining(restored, START_MS + 15_000), 45);
}

// G: 같은 세트 완료 연타가 완료 세트/기록을 두 개 만들지 않는다.
{
  let session = routineSession('free-nav-g');
  const a = session.exercises[0];
  session = addSetToExercise(session, a.id, 'same-set', { weightKg: 60, reps: 8 });
  session = completeSetAndStartRest(session, a.id, 'same-set', 90, START_MS);
  session = completeSetAndStartRest(session, a.id, 'same-set', 90, START_MS);
  const record = sessionToWorkoutRecordInput(session, '웨이트');

  check('G: duplicate complete has one effective set', computeCompletedSetsCount(session), 1);
  check('G: duplicate complete serializes one set detail', record.exercises?.[0].setDetails?.length, 1);
}

// I: 완료 세트가 없거나 무효 세트뿐이면 기록/보상 완료 경로의 gate는 0이다.
{
  let session = routineSession('free-nav-i');
  const a = session.exercises[0];
  session = addSetToExercise(session, a.id, 'invalid-set', { weightKg: 100, reps: 0 });
  session = completeSet(session, a.id, 'invalid-set');

  check('I: invalid-only session has zero effective sets', computeCompletedSetsCount(session), 0);
  check('I: invalid-only session has zero completed exercises', computeCompletedExerciseCount(session), 0);
  check('I: invalid set is excluded from record details', sessionToWorkoutRecordInput(session, '웨이트').exercises?.[0].setDetails, undefined);
}

function receipt(sessionId: string): SessionCompletionReceipt {
  return {
    version: 1,
    sessionId,
    completedAt: START_ISO,
    growthApplied: false,
    workoutRecordSaved: false,
    rewardsSaved: false,
    snapshot: {
      sessionResult: { sessionId },
      recordInput: { sessionId, date: '2026-08-26' },
    } as unknown as SessionCompletionResultSnapshot,
  };
}

// J: RESULT 완료 연타는 같은 sessionId의 in-flight 완료 하나를 공유한다.
{
  let stored: SessionCompletionReceipt | null = null;
  const calls = { growth: 0, record: 0, rewards: 0, cleanup: 0 };
  const operations = {
    loadReceipt: async () => stored,
    saveReceipt: async (next: SessionCompletionReceipt) => { stored = structuredClone(next); },
    clearReceipt: async () => { stored = null; },
    applyGrowth: async () => {
      calls.growth++;
      await Promise.resolve();
      return {
        growth: { sessionId: 'free-nav-j' },
        bodyParametersAfter: {},
        bodyParametersWithPump: {},
      } as Pick<SessionCompletionResultSnapshot, 'growth' | 'bodyParametersAfter' | 'bodyParametersWithPump'>;
    },
    saveWorkoutRecord: async () => { calls.record++; },
    saveRewards: async () => { calls.rewards++; return { weeklyCount: 1, streak: 1 }; },
    cleanupSession: async () => { calls.cleanup++; },
  };

  const [first, second] = await Promise.all([
    runSessionCompletion(receipt('free-nav-j'), operations),
    runSessionCompletion(receipt('free-nav-j'), operations),
  ]);
  check('J: duplicate completion resolves the same session', [first.sessionId, second.sessionId], ['free-nav-j', 'free-nav-j']);
  check('J: every completion side effect runs once', calls, { growth: 1, record: 1, rewards: 1, cleanup: 1 });
}

console.log(`\n${checks - failures}/${checks} session free-navigation checks passed.`);
process.exit(failures === 0 ? 0 : 1);
