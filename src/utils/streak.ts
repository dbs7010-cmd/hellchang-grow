import type { StreakState } from '@/types/streak';
import { yesterdayDateString } from '@/utils/date';

/**
 * 순수 함수: 오늘 기록이 하나 이상 생겼을 때 streak 상태가 어떻게 바뀌는지만 계산한다.
 * 저장/IO는 하지 않는다 (data/streak-repository.ts가 이 함수를 감싸서 저장까지 처리).
 *
 * 같은 날 여러 번 호출돼도 lastRecordDate가 이미 오늘이면 그대로 반환한다 (중복 증가 방지).
 * 날짜 경계 계산은 전부 utils/date.ts의 JS Date 정규화에 위임하므로 월말/연말에도 정확하다.
 */
export function computeStreakUpdate(state: StreakState, today: string): StreakState {
  if (state.lastRecordDate === today) {
    return state;
  }

  const isConsecutive = state.lastRecordDate === yesterdayDateString(today);
  const currentStreakDays = isConsecutive ? state.currentStreakDays + 1 : 1;

  return {
    currentStreakDays,
    longestStreakDays: Math.max(state.longestStreakDays, currentStreakDays),
    lastRecordDate: today,
    rewardClaimed: state.rewardClaimed,
  };
}
