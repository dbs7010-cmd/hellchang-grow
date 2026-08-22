import type { WorkoutCategory, WorkoutExercise, WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import type { MuscleGroup } from '@/types/exercise';
import type { SessionExerciseEntry, WorkoutSession } from '@/types/workout-session';
import { toDateString } from '@/utils/date';

/**
 * 이 파일의 함수는 전부 순수 함수다 (IO 없음, 현재 시각은 항상 인자로 받는다).
 * 저장/영속화는 data/workout-session-repository.ts가 감싼다.
 * scripts/verify-workout-session.ts가 경과시간/일시정지/재개/세트 기록 시나리오를 검증한다.
 */

/**
 * 세션에 운동을 넣을 때 화면이 넘기는 최소 정보. targetSets/defaultRestSeconds는
 * Exercise DB(defaultSets/defaultRestSeconds)에서 채워 넘긴다 — 이 순수 함수는 DB를 모른다.
 */
export interface SessionExerciseInput {
  exerciseId: string;
  exerciseName: string;
  targetSets?: number;
  defaultRestSeconds?: number;
}

export function createSession(
  category: WorkoutCategory,
  id: string,
  nowIso: string,
  options?: {
    primaryMuscleGroup?: MuscleGroup;
    routineId?: string;
    routineName?: string;
    initialExercises?: SessionExerciseInput[];
  }
): WorkoutSession {
  const exercises: SessionExerciseEntry[] = (options?.initialExercises ?? []).map((entry, index) => ({
    id: `${id}-ex-${index}`,
    exerciseId: entry.exerciseId,
    exerciseName: entry.exerciseName,
    targetSets: entry.targetSets,
    defaultRestSeconds: entry.defaultRestSeconds,
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
    routineName: options?.routineName,
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
  const restSecondsRemaining = getRestSecondsRemaining(session, nowMs);
  return {
    ...session,
    status: 'paused',
    accumulatedSeconds: computeElapsedSeconds(session, nowMs),
    activeSince: undefined,
    restUntilMs: restSecondsRemaining > 0 ? undefined : session.restUntilMs,
    restPausedSecondsRemaining: restSecondsRemaining > 0 ? restSecondsRemaining : undefined,
  };
}

export function resumeSession(session: WorkoutSession, nowIso: string): WorkoutSession {
  if (session.status !== 'paused') return session;
  const nowMs = new Date(nowIso).getTime();
  return {
    ...session,
    status: 'active',
    activeSince: nowIso,
    lastHeartbeatMs: nowMs,
    restUntilMs:
      session.restPausedSecondsRemaining !== undefined
        ? nowMs + session.restPausedSecondsRemaining * 1000
        : session.restUntilMs,
    restPausedSecondsRemaining: undefined,
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
  exercise: SessionExerciseInput & { id: string }
): WorkoutSession {
  const entry: SessionExerciseEntry = {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    targetSets: exercise.targetSets,
    defaultRestSeconds: exercise.defaultRestSeconds,
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

/**
 * 세트 값을 증감으로 바꾼다(+2.5kg, -1회 …). 스테퍼는 절대값이 아니라 증감으로 처리해야 한다 —
 * 화면에 그려진 값에서 더하면, 빠르게 두 번 누를 때 두 번 다 같은 값에서 계산해 한 번이 씹힌다.
 * 0 아래로는 내려가지 않는다.
 */
export function adjustSet(
  session: WorkoutSession,
  exerciseEntryId: string,
  setId: string,
  delta: { weightKg?: number; reps?: number }
): WorkoutSession {
  return mapExercise(session, exerciseEntryId, (entry) => ({
    ...entry,
    sets: entry.sets.map((set) => {
      if (set.id !== setId) return set;
      const next = { ...set };
      if (delta.weightKg !== undefined) {
        next.weightKg = Math.max(0, (set.weightKg ?? 0) + delta.weightKg);
      }
      if (delta.reps !== undefined) {
        next.reps = Math.max(0, (set.reps ?? 0) + delta.reps);
      }
      return next;
    }),
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

/**
 * 지금 조작할 세트(= 아직 완료하지 않은 첫 세트)를 항상 하나 보장한다.
 *
 * 세트를 완료할 때마다 [+ 세트 시작]을 다시 눌러야 했던 단계를 없앤다 — 헬스장에서
 * 사용자가 하는 일은 "중량 확인 → 횟수 확인 → 세트 완료" 세 가지뿐이어야 한다.
 * 기본값 우선순위: 이번 세션의 직전 세트 → 넘겨받은 지난 기록(defaults) → 빈 값.
 * 이미 대기 중인 세트가 있으면 세션을 그대로(같은 참조로) 돌려준다.
 */
export function ensurePendingSet(
  session: WorkoutSession,
  exerciseEntryId: string,
  setId: string,
  defaults?: { weightKg?: number; reps?: number }
): WorkoutSession {
  const entry = session.exercises.find((e) => e.id === exerciseEntryId);
  if (!entry) return session;
  if (entry.sets.some((set) => !set.completed)) return session;
  const initial = getLastSetValues(session, exerciseEntryId) ?? defaults;
  return addSetToExercise(session, exerciseEntryId, setId, initial);
}

/**
 * 세트 완료 → 휴식 자동 시작을 한 번의 상태 변경으로 처리한다.
 * 두 번 나눠 부르면 저장이 두 번 일어나고, 그 사이 렌더에서 "휴식 없는 완료" 상태가
 * 한 프레임 보인다. 확인 팝업 없이 곧바로 휴식으로 넘어가는 것이 이 흐름의 핵심이다.
 * restSeconds가 0 이하면 휴식을 시작하지 않는다 (사용자가 휴식을 끈 경우).
 */
export function completeSetAndStartRest(
  session: WorkoutSession,
  exerciseEntryId: string,
  setId: string,
  restSeconds: number,
  nowMs: number
): WorkoutSession {
  const completed = completeSet(session, exerciseEntryId, setId);
  if (completed === session || restSeconds <= 0) return completed;
  return startRest(completed, restSeconds, nowMs);
}

/** "3 / 5 세트" 표시용. target이 없으면(옛 세션/즉석 운동) 완료 수만 돌려준다. */
export function getSetProgress(
  session: WorkoutSession,
  exerciseEntryId: string
): { completed: number; target?: number } {
  const entry = session.exercises.find((e) => e.id === exerciseEntryId);
  return {
    completed: entry?.sets.filter(isEffectiveSet).length ?? 0,
    target: entry?.targetSets,
  };
}

/** 현재 포커스된 운동. currentExerciseId가 비었거나 사라졌으면 첫 운동으로 떨어진다. */
export function getCurrentExercise(session: WorkoutSession): SessionExerciseEntry | undefined {
  return (
    session.exercises.find((entry) => entry.id === session.currentExerciseId) ?? session.exercises[0]
  );
}

/** 세션 목록 순서상 다음 운동. 마지막 운동이면 undefined. */
export function getNextExercise(session: WorkoutSession): SessionExerciseEntry | undefined {
  const current = getCurrentExercise(session);
  if (!current) return undefined;
  const index = session.exercises.findIndex((entry) => entry.id === current.id);
  return index >= 0 ? session.exercises[index + 1] : undefined;
}

/**
 * 세트 완료 후 자동으로 시작할 휴식 길이(초). 운동별 기본값 → 앱 기본값 순서로 떨어진다.
 * 화면이 아니라 여기서 정해야 종목을 바꿔도 규칙이 하나로 유지된다.
 */
export function getAutoRestSeconds(
  session: WorkoutSession,
  exerciseEntryId: string,
  fallbackSeconds: number
): number {
  const entry = session.exercises.find((e) => e.id === exerciseEntryId);
  return entry?.defaultRestSeconds ?? fallbackSeconds;
}

// ── 휴식 타이머 ────────────────────────────────────────────────────────────

export function startRest(session: WorkoutSession, seconds: number, nowMs: number): WorkoutSession {
  return {
    ...session,
    restUntilMs: nowMs + seconds * 1000,
    restPausedSecondsRemaining: undefined,
    restTotalSeconds: seconds,
  };
}

export function clearRest(session: WorkoutSession): WorkoutSession {
  if (
    session.restUntilMs === undefined &&
    session.restPausedSecondsRemaining === undefined &&
    session.restTotalSeconds === undefined
  ) return session;
  return {
    ...session,
    restUntilMs: undefined,
    restPausedSecondsRemaining: undefined,
    restTotalSeconds: undefined,
  };
}

/**
 * 원형 휴식 타이머가 채워야 할 비율(0~1). 고른 휴식 길이가 기준이라 60초를 고르면 꽉 찬 링에서
 * 시작하고, 옛 세션처럼 길이 정보가 없으면 남은 시간 자체를 기준으로 안전하게 되돌아간다.
 */
export function getRestProgress(session: WorkoutSession, secondsRemaining: number): number {
  const total = session.restTotalSeconds ?? Math.max(secondsRemaining, 1);
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, secondsRemaining / total));
}

export function getRestSecondsRemaining(session: WorkoutSession, nowMs: number): number {
  if (session.restPausedSecondsRemaining !== undefined) {
    return Math.max(0, session.restPausedSecondsRemaining);
  }
  if (session.restUntilMs === undefined) return 0;
  return Math.max(0, Math.ceil((session.restUntilMs - nowMs) / 1000));
}

// ── 세션 → 기존 WorkoutRecord 변환 ──────────────────────────────────────────

/**
 * 실제로 수행된 것으로 인정하는 세트인가 — 기록/통계/PR/보상의 단일 판정 기준이다.
 *
 * 체크만 하고 횟수를 넣지 않은 세트(자동으로 준비된 빈 세트를 그대로 완료한 경우)는
 * 운동으로 세지 않는다. 그런 세트가 기록에 들어가면 운동 횟수·연속 기록·XP가 실제로
 * 하지 않은 운동으로 올라간다.
 *
 * 중량 0은 무효 조건이 아니다: 맨몸 운동은 0kg x N회가 정상이고, 시간 종목(plank)은
 * reps 필드를 초로 쓰므로 둘 다 reps > 0이면 유효하다.
 */
export function isEffectiveSet(set: WorkoutSetEntry): boolean {
  return set.completed && (set.reps ?? 0) > 0;
}

export function computeCompletedSetsCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter(isEffectiveSet).length,
    0
  );
}

/** Result의 "운동 N개"는 계획에 담긴 수가 아니라 실제 완료 세트가 있는 운동 수다. */
export function computeCompletedExerciseCount(session: WorkoutSession): number {
  return session.exercises.filter((exercise) => exercise.sets.some(isEffectiveSet)).length;
}

/** 이번 세션에서 실제로 수행한(유효 세트가 있는) 운동 ID. 루틴 완료 판정의 근거다. */
export function getPerformedExerciseIds(session: WorkoutSession): Set<string> {
  return new Set(
    session.exercises
      .filter((exercise) => exercise.sets.some(isEffectiveSet))
      .map((exercise) => exercise.exerciseId)
  );
}

/**
 * 루틴의 모든 운동을 실제로 수행했는가 — 루틴 완료 보너스 XP의 유일한 조건이다.
 * 담기만 하고 횟수를 채우지 않은 운동은 수행으로 치지 않는다. 빈 루틴은 완료가 아니다.
 */
export function isRoutineCompleted(session: WorkoutSession, routineExerciseIds: string[]): boolean {
  if (routineExerciseIds.length === 0) return false;
  const performed = getPerformedExerciseIds(session);
  return routineExerciseIds.every((id) => performed.has(id));
}

/** 총 볼륨 = weight × reps 기반으로 계산 가능한(완료된, 중량/횟수 모두 있는) 세트만 포함한다. */
export function computeTotalVolumeKg(session: WorkoutSession): number {
  return session.exercises.reduce((sum, exercise) => {
    const exerciseVolume = exercise.sets
      .filter((set) => isEffectiveSet(set) && set.weightKg !== undefined)
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
    // 무효 세트는 저장 자체를 하지 않는다 — 한 번 기록에 들어가면 히스토리 통계와 PR이
    // 계속 그 값을 사실로 취급한다.
    const completedSets = entry.sets.filter(isEffectiveSet);
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
    sessionId: session.id,
    date: toDateString(new Date(session.startedAt)),
    category: session.primaryCategory,
    // 루틴으로 시작했으면 사용자가 붙인 이름을 그대로 쓴다 ("가슴 A"). 아니면 부위/종류 라벨
    // 기반의 기존 제목("등 세션")이 그대로다 — 이미 저장된 기록은 건드리지 않는다.
    title: session.routineName?.trim() || `${titleLabel} 세션`,
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
