import type { WorkoutCategory, WorkoutExercise, WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import type { MuscleGroup } from '@/types/exercise';
import type { SessionExerciseEntry, WorkoutSession } from '@/types/workout-session';
import { toDateString } from '@/utils/date';

/**
 * 이 파일의 함수는 전부 순수 함수다 (IO 없음, 현재 시각은 항상 인자로 받는다).
 * 저장/영속화는 data/workout-session-repository.ts가 감싼다.
 * scripts/verify-workout-session.ts가 경과시간/일시정지/재개/세트 기록 시나리오를 검증한다.
 */

export function createSession(
  category: WorkoutCategory,
  id: string,
  nowIso: string,
  options?: {
    primaryMuscleGroup?: MuscleGroup;
    routineId?: string;
    initialExercises?: { exerciseId: string; exerciseName: string }[];
  }
): WorkoutSession {
  const exercises: SessionExerciseEntry[] = (options?.initialExercises ?? []).map((entry, index) => ({
    id: `${id}-ex-${index}`,
    exerciseId: entry.exerciseId,
    exerciseName: entry.exerciseName,
    sets: [],
  }));

  return {
    id,
    startedAt: nowIso,
    activeSince: nowIso,
    accumulatedSeconds: 0,
    status: 'active',
    lastHeartbeatMs: new Date(nowIso).getTime(),
    primaryCategory: category,
    primaryMuscleGroup: options?.primaryMuscleGroup,
    routineId: options?.routineId,
    exercises,
    currentExerciseId: exercises[0]?.id,
    createdAt: nowIso,
  };
}

/**
 * 세션이 지금까지 실제로 "운동 중"이었던 총 초(pause 구간 제외)를 계산한다.
 * 앱이 백그라운드에 오래 있었어도 activeSince(마지막 재개 시각) 기준으로 다시 계산하므로
 * 단순 interval count와 달리 시간이 크게 틀어지지 않는다.
 */
export function computeElapsedSeconds(session: WorkoutSession, nowMs: number): number {
  if (session.status === 'active' && session.activeSince) {
    const activeSinceMs = new Date(session.activeSince).getTime();
    return session.accumulatedSeconds + Math.max(0, Math.floor((nowMs - activeSinceMs) / 1000));
  }
  return session.accumulatedSeconds;
}

export function pauseSession(session: WorkoutSession, nowMs: number): WorkoutSession {
  if (session.status !== 'active') return session;
  return {
    ...session,
    status: 'paused',
    accumulatedSeconds: computeElapsedSeconds(session, nowMs),
    activeSince: undefined,
  };
}

export function resumeSession(session: WorkoutSession, nowIso: string): WorkoutSession {
  if (session.status !== 'paused') return session;
  return {
    ...session,
    status: 'active',
    activeSince: nowIso,
    lastHeartbeatMs: new Date(nowIso).getTime(),
    pausedByAppBackground: undefined,
    pausedAtMs: undefined,
  };
}

/**
 * 앱이 백그라운드로 전환될 때 호출하는 pauseSession의 변형 — 방치된 시간이 운동 시간에
 * 섞이지 않도록 즉시 시간을 확정하면서, "이건 사용자가 누른 게 아니라 앱이 자동으로
 * 일시정지한 것"이라는 표시를 세션에 남긴다. 짧은 백그라운드 뒤 곧바로 돌아오면
 * resumeIfRecentBackground()가 이 표시를 보고 조용히 다시 재개한다.
 */
export function pauseSessionForBackground(session: WorkoutSession, nowMs: number): WorkoutSession {
  const paused = pauseSession(session, nowMs);
  if (paused === session) return session;
  return { ...paused, pausedByAppBackground: true, pausedAtMs: nowMs };
}

/**
 * 앱이 포그라운드로 돌아왔을 때 호출한다. 이 세션이 (사용자가 아니라) 방금 전
 * pauseSessionForBackground()로 자동 일시정지됐고, 그 간격이 staleThresholdMs보다
 * 짧으면 조용히 다시 재개한다 — 알림 확인 등 짧은 전환 때문에 [재개]를 매번
 * 누르게 만들지 않기 위함이다. 간격이 길었거나 사용자가 직접 일시정지한 세션은
 * 건드리지 않는다(그대로 '일시정지' 상태로 남아 사용자의 명시적 판단을 기다린다).
 */
export function resumeIfRecentBackground(
  session: WorkoutSession,
  nowMs: number,
  staleThresholdMs: number
): WorkoutSession {
  if (session.status !== 'paused' || !session.pausedByAppBackground || session.pausedAtMs === undefined) {
    return session;
  }
  if (nowMs - session.pausedAtMs >= staleThresholdMs) return session;
  return resumeSession(session, new Date(nowMs).toISOString());
}

/** status가 'active'인 동안 주기적으로 호출해 "앱이 마지막으로 살아있던 시각"을 기록한다. */
export function heartbeatSession(session: WorkoutSession, nowMs: number): WorkoutSession {
  if (session.status !== 'active') return session;
  return { ...session, lastHeartbeatMs: nowMs };
}

/**
 * 세션이 'active' 상태로 저장된 채 오랫동안(staleThresholdMs 이상) heartbeat가 없었다면
 * — 백그라운드에 방치됐거나 앱이 강제 종료됐다가 뒤늦게 재시작된 것으로 보고,
 * "마지막으로 확인된 시각"을 기준으로 pauseSession과 동일한 규칙으로 일시정지 처리한다.
 * 방치된 구간(gap)은 운동 시간에 포함되지 않는다 — 임의로 특정 시간 이상을 잘라내는
 * masking이 아니라, 마지막으로 실제 활성 상태였던 시각까지만 정확히 계산하는 것이다.
 */
export function recoverStaleSession(
  session: WorkoutSession,
  nowMs: number,
  staleThresholdMs: number
): WorkoutSession {
  if (session.status !== 'active' || !session.activeSince) return session;
  const lastKnownMs = session.lastHeartbeatMs ?? new Date(session.activeSince).getTime();
  if (nowMs - lastKnownMs < staleThresholdMs) return session;
  return pauseSession(session, lastKnownMs);
}

export function changeSessionCategory(
  session: WorkoutSession,
  category: WorkoutCategory
): WorkoutSession {
  return { ...session, primaryCategory: category };
}

export function completeSession(session: WorkoutSession, nowIso: string, nowMs: number): WorkoutSession {
  return {
    ...session,
    status: 'completed',
    accumulatedSeconds: computeElapsedSeconds(session, nowMs),
    activeSince: undefined,
    endedAt: nowIso,
  };
}

// ── 운동/세트 관리 ─────────────────────────────────────────────────────────

export function addExerciseToSession(
  session: WorkoutSession,
  exercise: { id: string; exerciseId: string; exerciseName: string }
): WorkoutSession {
  const entry: SessionExerciseEntry = {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    sets: [],
  };
  return {
    ...session,
    exercises: [...session.exercises, entry],
    currentExerciseId: session.currentExerciseId ?? entry.id,
  };
}

export function setCurrentExercise(session: WorkoutSession, exerciseEntryId: string): WorkoutSession {
  if (!session.exercises.some((e) => e.id === exerciseEntryId)) return session;
  return { ...session, currentExerciseId: exerciseEntryId };
}

function mapExercise(
  session: WorkoutSession,
  exerciseEntryId: string,
  fn: (entry: SessionExerciseEntry) => SessionExerciseEntry
): WorkoutSession {
  let changed = false;
  const exercises = session.exercises.map((entry) => {
    if (entry.id !== exerciseEntryId) return entry;
    changed = true;
    return fn(entry);
  });
  return changed ? { ...session, exercises } : session;
}

export function addSetToExercise(
  session: WorkoutSession,
  exerciseEntryId: string,
  setId: string,
  initial?: { weightKg?: number; reps?: number }
): WorkoutSession {
  return mapExercise(session, exerciseEntryId, (entry) => ({
    ...entry,
    sets: [
      ...entry.sets,
      { id: setId, weightKg: initial?.weightKg, reps: initial?.reps, completed: false },
    ],
  }));
}

export function updateSet(
  session: WorkoutSession,
  exerciseEntryId: string,
  setId: string,
  patch: Partial<Pick<WorkoutSetEntry, 'weightKg' | 'reps'>>
): WorkoutSession {
  return mapExercise(session, exerciseEntryId, (entry) => ({
    ...entry,
    sets: entry.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
  }));
}

export function completeSet(
  session: WorkoutSession,
  exerciseEntryId: string,
  setId: string
): WorkoutSession {
  return mapExercise(session, exerciseEntryId, (entry) => ({
    ...entry,
    sets: entry.sets.map((set) => (set.id === setId ? { ...set, completed: true } : set)),
  }));
}

/** 이전 세트 값을 다음 세트의 기본값으로 넘겨주기 위한 헬퍼 (반복 입력을 줄인다). */
export function getLastSetValues(
  session: WorkoutSession,
  exerciseEntryId: string
): { weightKg?: number; reps?: number } | null {
  const entry = session.exercises.find((e) => e.id === exerciseEntryId);
  const lastSet = entry?.sets[entry.sets.length - 1];
  if (!lastSet) return null;
  return { weightKg: lastSet.weightKg, reps: lastSet.reps };
}

// ── 휴식 타이머 ────────────────────────────────────────────────────────────

export function startRest(session: WorkoutSession, seconds: number, nowMs: number): WorkoutSession {
  return { ...session, restUntilMs: nowMs + seconds * 1000 };
}

export function clearRest(session: WorkoutSession): WorkoutSession {
  if (session.restUntilMs === undefined) return session;
  return { ...session, restUntilMs: undefined };
}

export function getRestSecondsRemaining(session: WorkoutSession, nowMs: number): number {
  if (session.restUntilMs === undefined) return 0;
  return Math.max(0, Math.ceil((session.restUntilMs - nowMs) / 1000));
}

// ── 세션 → 기존 WorkoutRecord 변환 ──────────────────────────────────────────

export function computeCompletedSetsCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length,
    0
  );
}

/** 총 볼륨 = weight × reps 기반으로 계산 가능한(완료된, 중량/횟수 모두 있는) 세트만 포함한다. */
export function computeTotalVolumeKg(session: WorkoutSession): number {
  return session.exercises.reduce((sum, exercise) => {
    const exerciseVolume = exercise.sets
      .filter((set) => set.completed && set.weightKg !== undefined && set.reps !== undefined)
      .reduce((setSum, set) => setSum + (set.weightKg as number) * (set.reps as number), 0);
    return sum + exerciseVolume;
  }, 0);
}

/** 완료된 세션 → 기존 WorkoutRecord 저장 구조로 변환 (별도 히스토리 저장소를 새로 만들지 않는다) */
export function sessionToWorkoutRecordInput(
  session: WorkoutSession,
  titleLabel: string
): Omit<WorkoutRecord, 'id' | 'createdAt'> {
  const exercises: WorkoutExercise[] = session.exercises.map((entry) => {
    const completedSets = entry.sets.filter((set) => set.completed);
    const lastSet = completedSets[completedSets.length - 1];
    const exercise: WorkoutExercise = {
      id: entry.id,
      name: entry.exerciseName,
      exerciseId: entry.exerciseId,
    };
    if (completedSets.length > 0) {
      exercise.sets = completedSets.length;
      exercise.reps = lastSet.reps;
      exercise.weightKg = lastSet.weightKg;
      exercise.setDetails = completedSets;
    }
    return exercise;
  });

  return {
    date: toDateString(new Date(session.startedAt)),
    category: session.primaryCategory,
    title: `${titleLabel} 세션`,
    durationMinutes: Math.max(1, Math.round(session.accumulatedSeconds / 60)),
    exercises: exercises.length > 0 ? exercises : undefined,
    memo: session.notes,
    completed: true,
  };
}

export function formatElapsedTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
