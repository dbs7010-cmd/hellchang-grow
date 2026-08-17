import { AppConfig } from '@/config/app-config';
import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { BodyHistoryEntry } from '@/types/body';
import { todayDateString } from '@/utils/date';
import { createId } from '@/utils/id';

export async function getBodyHistory(): Promise<BodyHistoryEntry[]> {
  const entries = await readJSON<BodyHistoryEntry[]>(StorageKeys.bodyHistory);
  return entries ?? [];
}

export async function addBodyHistoryEntry(
  entry: Omit<BodyHistoryEntry, 'id'>
): Promise<BodyHistoryEntry[]> {
  const entries = await getBodyHistory();
  const newEntry: BodyHistoryEntry = { ...entry, id: createId('body') };
  const updated = [newEntry, ...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  await writeJSON(StorageKeys.bodyHistory, updated);
  return updated;
}

/** 순수 함수: 이미 로드된 히스토리 배열만으로 오늘 사진 업데이트 한도를 확인한다 (IO 없음). */
export function hasReachedDailyPhotoLimit(entries: BodyHistoryEntry[], date: string): boolean {
  const todaysPhotoEntries = entries.filter(
    (entry) => entry.date === date && entry.source === 'photo'
  );
  return todaysPhotoEntries.length >= AppConfig.dailyPhotoLimit;
}

export async function canAddPhotoEntryToday(): Promise<boolean> {
  const entries = await getBodyHistory();
  return !hasReachedDailyPhotoLimit(entries, todayDateString());
}
