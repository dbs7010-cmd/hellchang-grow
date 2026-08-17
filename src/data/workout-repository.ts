import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { WorkoutRecord } from '@/types/workout';
import { todayDateString } from '@/utils/date';
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
  const updated = [newRecord, ...records].sort((a, b) => (a.date < b.date ? 1 : -1));
  await writeJSON(StorageKeys.workoutRecords, updated);
  return updated;
}

export function getTodayRecords(records: WorkoutRecord[]): WorkoutRecord[] {
  const today = todayDateString();
  return records.filter((record) => record.date === today);
}
