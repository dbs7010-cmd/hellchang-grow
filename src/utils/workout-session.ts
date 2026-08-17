import type { WorkoutCategory, WorkoutExercise, WorkoutRecord } from '@/types/workout';
import type { WorkoutSession } from '@/types/workout-session';
import { toDateString } from '@/utils/date';

/**
 * 이 파일의 함수는 전부 순수 함수다 (IO 없음, 현재 시각은 항상 인자로 받는다).
 * 저장/영속화는 data/workout-session-repository.ts가 감싼다.
 * scripts/verify-workout-session.ts가 경과시간/일시정지/재개 시나리오를 검증한다.
 */

export function createSession(
  category: WorkoutCategory,
  id: string,
  nowIso: string
): WorkoutSession {
  return {
    id,
    startedAt: nowIso,
    activeSince: nowIso,
    accumulatedSeconds: 0,
    status: 'active',
    primaryCategory: category,
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
  return { ...session, status: 'active', activeSince: nowIso };
}

export function changeSessionCategory(
  session: WorkoutSession,
  category: WorkoutCategory
): WorkoutSession {
  return { ...session, primaryCategory: category };
}

export function addSessionActivity(
  session: WorkoutSession,
  activity: WorkoutExercise
): WorkoutSession {
  return { ...session, activities: [...(session.activities ?? []), activity] };
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

/** 완료된 세션 → 기존 WorkoutRecord 저장 구조로 변환 (별도 히스토리 저장소를 새로 만들지 않는다) */
export function sessionToWorkoutRecordInput(
  session: WorkoutSession,
  categoryLabel: string
): Omit<WorkoutRecord, 'id' | 'createdAt'> {
  return {
    date: toDateString(new Date(session.startedAt)),
    category: session.primaryCategory,
    title: `${categoryLabel} 세션`,
    durationMinutes: Math.max(1, Math.round(session.accumulatedSeconds / 60)),
    exercises: session.activities,
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
