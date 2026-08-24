import { StorageKeys } from '@/services/storage/keys';
import { readArray, writeJSON } from '@/services/storage/local-storage';
import { Routine } from '@/types/routine';
import { createId } from '@/utils/id';

export async function getRoutines(): Promise<Routine[]> {
  return readArray<Routine>(StorageKeys.routines);
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

export async function updateRoutine(
  routineId: string,
  input: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Routine[]> {
  const routines = await getRoutines();
  const now = new Date().toISOString();
  const updated = routines.map((routine) =>
    routine.id === routineId ? { ...routine, ...input, updatedAt: now } : routine
  );
  await writeJSON(StorageKeys.routines, updated);
  return updated;
}

export async function deleteRoutine(routineId: string): Promise<Routine[]> {
  const routines = await getRoutines();
  const updated = routines.filter((routine) => routine.id !== routineId);
  await writeJSON(StorageKeys.routines, updated);
  return updated;
}
