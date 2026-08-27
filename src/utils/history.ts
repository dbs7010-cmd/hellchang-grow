import type { BodyHistoryEntry } from '@/types/body';
import type { WorkoutRecord } from '@/types/workout';

/**
 * 신체 기록을 최신순으로 정렬한다. **같은 날짜에 여러 번 기록하면 나중에 넣은 것이 앞에 온다.**
 *
 * 같은 날짜일 때 0을 돌려주는 것이 핵심이다. JS의 sort는 stable이므로 **입력 순서가 그대로
 * 유지된다.** 예전 비교자는 같은 날짜에도 ±1을 돌려줘서, 오늘 방금 넣은 체중이 뒤로 밀리고
 * 화면이 옛 값을 계속 보여줬다 — 체지방률처럼 처음 넣은 값은 아예 '-'로 남았다.
 *
 * **계약**: 같은 날짜끼리의 우선순위는 날짜가 아니라 입력 순서에서 온다. 저장소가 새 기록을
 * 배열 맨 앞에 붙인 뒤 이 함수를 쓰므로(`addBodyHistoryEntry`), 저장된 배열을 그대로 넘기는
 * 한 "나중에 넣은 것이 먼저"가 된다. 순서를 뒤섞은 배열을 넘기면 그 순서가 답이 된다.
 */
export function sortBodyHistoryNewestFirst(entries: BodyHistoryEntry[]): BodyHistoryEntry[] {
  return [...entries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

/** 가장 최근 신체 기록. 같은 날짜가 여러 개면 나중에 넣은 것. 없으면 null. */
export function latestBodyEntry(entries: BodyHistoryEntry[]): BodyHistoryEntry | null {
  return sortBodyHistoryNewestFirst(entries)[0] ?? null;
}

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

  // 같은 날짜에 기록이 여러 개면 그날을 대표하는 것은 **가장 최근에 넣은 것**이다.
  // 최신순으로 훑으며 먼저 온 것만 남긴다 (사진 유무는 그날 전체를 본다).
  for (const entry of sortBodyHistoryNewestFirst(bodyHistory)) {
    const day = days.get(entry.date) ?? { date: entry.date, workouts: [], hasPhoto: false };
    if (!day.bodyEntry) day.bodyEntry = entry;
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
