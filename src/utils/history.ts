import { BodyHistoryEntry } from '@/types/body';
import { WorkoutRecord } from '@/types/workout';

export interface HistoryDay {
  date: string;
  bodyEntry?: BodyHistoryEntry;
  workouts: WorkoutRecord[];
  hasPhoto: boolean;
}

/**
 * 신체 히스토리와 운동 기록을 날짜별로 합쳐 하나의 히스토리 뷰로 만든다.
 * 무료/유료로 데이터를 분리하지 않는다 (제품 기획 6장) — 순수 파생 뷰이며 저장 구조는 바꾸지 않는다.
 */
export function buildHistoryDays(
  bodyHistory: BodyHistoryEntry[],
  workoutRecords: WorkoutRecord[]
): HistoryDay[] {
  const days = new Map<string, HistoryDay>();

  for (const entry of bodyHistory) {
    const day = days.get(entry.date) ?? { date: entry.date, workouts: [], hasPhoto: false };
    day.bodyEntry = entry;
    day.hasPhoto = day.hasPhoto || Boolean(entry.photoReference);
    days.set(entry.date, day);
  }

  for (const record of workoutRecords) {
    const day = days.get(record.date) ?? { date: record.date, workouts: [], hasPhoto: false };
    day.workouts.push(record);
    days.set(record.date, day);
  }

  return Array.from(days.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
