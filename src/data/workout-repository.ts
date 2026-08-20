import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import type { WorkoutRecord } from '@/types/workout';
import { todayDateString, toDateString } from '@/utils/date';
import { createId } from '@/utils/id';

export async function getWorkoutRecords(): Promise<WorkoutRecord[]> {
  const records = await readJSON<WorkoutRecord[]>(StorageKeys.workoutRecords);
  return records ?? [];
}

export async function addWorkoutRecord(
  record: Omit<WorkoutRecord, 'id' | 'createdAt'>
): Promise<WorkoutRecord[]> {
  const records = await getWorkoutRecords();
  const newRecord: WorkoutRecord = {
    ...record,
    id: createId('workout'),
    createdAt: new Date().toISOString(),
  };
  // 날짜 내림차순, 같은 날은 나중에 저장한 기록이 위로. 예전 비교자는 동률일 때도 -1을 돌려줘서
  // 하루에 두 번 이상 운동하면 목록 순서가 뒤죽박죽이었다 (방금 끝낸 기록이 맨 위가 아니었다).
  const updated = [newRecord, ...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  await writeJSON(StorageKeys.workoutRecords, updated);
  return updated;
}

/** 백그라운드 방치 등으로 잘못 생성된 기록을 사용자가 직접 정리할 수 있게 한다. */
export async function deleteWorkoutRecord(recordId: string): Promise<WorkoutRecord[]> {
  const records = await getWorkoutRecords();
  const updated = records.filter((record) => record.id !== recordId);
  await writeJSON(StorageKeys.workoutRecords, updated);
  return updated;
}

export function getTodayRecords(records: WorkoutRecord[]): WorkoutRecord[] {
  const today = todayDateString();
  return records.filter((record) => record.date === today);
}

/** 이번 주(월요일 시작) ~ 오늘까지의 기록. 날짜 문자열(YYYY-MM-DD)은 사전식 비교가 곧 날짜 비교다. */
export function getThisWeekRecords(
  records: WorkoutRecord[],
  today: string = todayDateString()
): WorkoutRecord[] {
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  const mondayStr = toDateString(date);
  return records.filter((record) => record.date >= mondayStr && record.date <= today);
}

/** 이번 달(1일) ~ 오늘까지의 기록. */
export function getThisMonthRecords(
  records: WorkoutRecord[],
  today: string = todayDateString()
): WorkoutRecord[] {
  const monthStart = `${today.slice(0, 7)}-01`;
  return records.filter((record) => record.date >= monthStart && record.date <= today);
}

/** 올해(1/1) ~ 오늘까지의 기록. */
export function getThisYearRecords(
  records: WorkoutRecord[],
  today: string = todayDateString()
): WorkoutRecord[] {
  const yearStart = `${today.slice(0, 4)}-01-01`;
  return records.filter((record) => record.date >= yearStart && record.date <= today);
}
