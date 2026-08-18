import { WorkoutRecord } from '@/types/workout';

/**
 * 완료된 세트(무게 x 횟수)만 합산한 총 볼륨(kg).
 * setDetails가 없는 옛 기록은 sets/reps/weightKg 요약값으로 근사한다.
 *
 * 세션 종료 요약(computeTotalVolumeKg)과 같은 규칙을 쓰되, 이쪽은 저장된 WorkoutRecord[]를
 * 대상으로 한다. 홈/히스토리가 각자 계산하지 않도록 여기 한 곳에만 둔다.
 */
export function sumVolumeKg(records: WorkoutRecord[]): number {
  return records.reduce((total, record) => {
    const recordVolume = (record.exercises ?? []).reduce((sum, exercise) => {
      const sets = exercise.setDetails;
      if (sets) {
        return (
          sum +
          sets.reduce(
            (setSum, set) =>
              set.completed && set.weightKg !== undefined && set.reps !== undefined
                ? setSum + set.weightKg * set.reps
                : setSum,
            0
          )
        );
      }
      if (exercise.weightKg !== undefined && exercise.reps !== undefined && exercise.sets) {
        return sum + exercise.weightKg * exercise.reps * exercise.sets;
      }
      return sum;
    }, 0);
    return total + recordVolume;
  }, 0);
}

/** 1,250 처럼 천 단위 구분 기호를 넣은 볼륨 표기. */
export function formatVolumeKg(volumeKg: number): string {
  return `${Math.round(volumeKg).toLocaleString('ko-KR')}kg`;
}

export interface PeriodChartPoint {
  label: string;
  value: number;
}

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 히스토리 기간 탭(주/월/연)에 맞춰 활동 패턴 막대를 만든다.
 *  - week : 최근 7일, 하루 = 막대 1개
 *  - month: 최근 5주, 한 주 = 막대 1개
 *  - year : 최근 12개월, 한 달 = 막대 1개
 *
 * 이전에는 어떤 탭을 골라도 "최근 7일"만 그려서, 월/연 탭에서 차트가 상단 수치와
 * 같은 기간을 말하지 않았다.
 */
export function buildPeriodChart(
  records: WorkoutRecord[],
  period: 'week' | 'month' | 'year',
  today: Date = new Date()
): PeriodChartPoint[] {
  const points: PeriodChartPoint[] = [];
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = iso(date);
      points.push({
        label: WEEKDAY_SHORT[date.getDay()],
        value: sumVolumeKg(records.filter((record) => record.date === key)),
      });
    }
    return points;
  }

  if (period === 'month') {
    for (let i = 4; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const startKey = iso(start);
      const endKey = iso(end);
      points.push({
        label: i === 0 ? '이번주' : `${i}주전`,
        value: sumVolumeKg(records.filter((record) => record.date >= startKey && record.date <= endKey)),
      });
    }
    return points;
  }

  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    points.push({
      label: `${date.getMonth() + 1}`,
      value: sumVolumeKg(records.filter((record) => record.date.startsWith(prefix))),
    });
  }
  return points;
}
