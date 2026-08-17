import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { Routine } from '@/types/routine';
import { createId } from '@/utils/id';

export async function getRoutines(): Promise<Routine[]> {
  const routines = await readJSON<Routine[]>(StorageKeys.routines);
  return routines ?? [];
}

export async function saveRoutine(
  input: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Routine[]> {
  const routines = await getRoutines();
  const now = new Date().toISOString();
  const newRoutine: Routine = { ...input, id: createId('routine'), createdAt: now, updatedAt: now };
  const updated = [newRoutine, ...routines];
  await writeJSON(StorageKeys.routines, updated);
  return updated;
}

export async function deleteRoutine(routineId: string): Promise<Routine[]> {
  const routines = await getRoutines();
  const updated = routines.filter((routine) => routine.id !== routineId);
  await writeJSON(StorageKeys.routines, updated);
  return updated;
}
