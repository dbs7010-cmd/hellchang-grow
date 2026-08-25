import { AppConfig } from '@/config/app-config';
import { StorageKeys } from '@/services/storage/keys';
import { readArray, writeJSON } from '@/services/storage/local-storage';
import { persistBodyPhoto } from '@/services/storage/photo-store';
import { BodyHistoryEntry } from '@/types/body';
import { todayDateString } from '@/utils/date';
import { createId } from '@/utils/id';

export async function getBodyHistory(): Promise<BodyHistoryEntry[]> {
  return readArray<BodyHistoryEntry>(StorageKeys.bodyHistory);
}

export async function addBodyHistoryEntry(
  entry: Omit<BodyHistoryEntry, 'id'>
): Promise<BodyHistoryEntry[]> {
  const entries = await getBodyHistory();
  const id = createId('body');

  // 사진은 여기서 한 번만 앱 보관 자리로 복사한다 — 온보딩과 히스토리 입력이 모두 이 함수를
  // 지나므로 화면마다 같은 처리를 반복하지 않는다. 실패하면 원래 URI가 그대로 돌아온다.
  const photoReference = entry.photoReference
    ? await persistBodyPhoto(entry.photoReference, id)
    : entry.photoReference;

  const newEntry: BodyHistoryEntry = { ...entry, id, photoReference };
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
