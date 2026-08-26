import { StorageKeys } from '@/services/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/services/storage/local-storage';
import { WorkoutSession } from '@/types/workout-session';
import { asStoredSession } from '@/utils/stored-state';

/**
 * 진행 중인(active/paused) 세션은 최대 1개만 존재한다 — 배열이 아니라 단일 객체로 저장한다.
 * 완료된 세션은 기존 WorkoutRecord로 변환돼 workout-repository에 저장되므로
 * 별도의 세션 히스토리 저장소를 새로 만들지 않는다.
 */
export async function getActiveSession(): Promise<WorkoutSession | null> {
  // 잘린/옛 형식 값으로 운동 화면이 터지지 않도록 읽는 시점에만 모양을 확인한다
  // (asStoredSession). 저장된 값은 고쳐 쓰지 않는다.
  return asStoredSession(await readJSON<unknown>(StorageKeys.activeWorkoutSession));
}

export async function saveActiveSession(session: WorkoutSession): Promise<void> {
  await writeJSON(StorageKeys.activeWorkoutSession, session);
}

export async function clearActiveSession(): Promise<void> {
  await removeKey(StorageKeys.activeWorkoutSession);
}
