import type { BodyHistoryEntry } from '@/types/body';
import type { UserProfile } from '@/types/user';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOME 표시 전용 헬퍼
 *
 * 홈의 신체 표시는 **실제로 입력된 값만** 보여준다. 값이 없으면 0이나 추정치가 아니라
 * `-`다 — 앱이 만들어 낸 숫자가 사람의 몸 이야기로 읽히면 그 순간 거짓말이 된다
 * (CLAUDE.md: 실제 신체 수치는 신뢰 가능한 소스에서만 온다).
 *
 * 화면에서 이 규칙이 JSX 안에 흩어져 있으면 레이아웃을 옮길 때마다 조용히 깨진다.
 * 그래서 값 고르는 규칙만 순수 함수로 빼둔다. scripts/verify-home-presentation.ts가 지킨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface HomeBodyMetric {
  label: string;
  /** 실제 입력값이 있을 때만 값이고, 없으면 '-'. */
  value: string;
}

/** 값이 없을 때 쓰는 표기. 히스토리 화면과 같은 규칙이다. */
export const EmptyMetricValue = '-';

/** 가장 최근에 **사용자가 직접 입력한** 신체 기록. 없으면 null. */
export function latestBodyRecord(bodyHistory: BodyHistoryEntry[]): BodyHistoryEntry | null {
  return bodyHistory.reduce<BodyHistoryEntry | null>(
    (latest, entry) => (!latest || entry.date > latest.date ? entry : latest),
    null
  );
}

/**
 * 홈 하단의 몸 상태 한 줄.
 *
 * 체중만 온보딩 값으로 떨어진다 — 프로필을 만들 때 실제로 입력받은 값이기 때문이다.
 * 골격근량/체지방률은 입력한 적이 없으면 `-`이고 추정하지 않는다.
 */
export function buildHomeBodyMetrics(input: {
  profile: UserProfile;
  bodyHistory: BodyHistoryEntry[];
  workoutRecordCount: number;
}): HomeBodyMetric[] {
  const latest = latestBodyRecord(input.bodyHistory);

  return [
    { label: '체중', value: `${latest?.weightKg ?? input.profile.weightKg}kg` },
    {
      label: '골격근량',
      value: latest?.skeletalMuscleKg !== undefined ? `${latest.skeletalMuscleKg}kg` : EmptyMetricValue,
    },
    {
      label: '체지방률',
      value: latest?.bodyFatPercent !== undefined ? `${latest.bodyFatPercent}%` : EmptyMetricValue,
    },
    { label: '운동 기록', value: `${input.workoutRecordCount}회` },
  ];
}
