import type { BodyHistoryEntry } from '@/types/body';
import type { UserProfile } from '@/types/user';
import { daysBetween } from '@/utils/trainer-brief';
import { describePrAchievement } from '@/utils/exercise-history';
import type { PtContext, PtContextPr } from '@/utils/pt-context';
import { formatVolumeKg } from '@/utils/workout-stats';

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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOME이 지금 무엇을 말해야 하는가 (상태 + 그 상태의 문구)
 *
 * 이 앱의 주인공은 현실에서 실제로 운동하는 사람이다. 그래서 홈이 먼저 답해야 하는 질문은
 * "내 캐릭터가 어떤 상태인가"가 아니라 **"오늘 내 운동은 어디까지 왔는가"**다.
 *
 * V1은 정확히 세 상태다. 새로 저장하는 것도, 시계를 보는 것도 없다 — 이미 계산돼 있는
 * `PtContext`(오늘 날짜/오늘 기록 여부/진행 중인 세션)만 읽는다.
 *
 *   IN_PROGRESS  진행 중인 세션이 있다
 *   POST_WORKOUT 세션은 없고, 오늘 기록이 있다
 *   PRE_WORKOUT  그 외 (처음 쓰는 사람 포함)
 *
 * 문구를 화면의 삼항 연산자에 흩어 두지 않는다. 예전에는 같은 버튼 문구가 홈/운동/트레이너
 * 세 화면에 각각 박혀 있어서, 한 곳을 고치면 나머지가 조용히 다른 말을 했다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type HomeState = 'PRE_WORKOUT' | 'IN_PROGRESS' | 'POST_WORKOUT';

/**
 * 홈이 지금 세우는 단 하나.
 *
 * `kind`가 핵심이다. 오늘 운동을 이미 끝낸 사람에게 큰 버튼을 다시 들이미는 것은
 * "한 번 더 해라"라는 뜻이 된다. 끝냈으면 **상태로 말한다**(`state`).
 */
export interface HomePrimary {
  kind: 'action' | 'state';
  label: string;
  /** 실제 데이터에서 나온 보조 한 줄. 없으면 null — 지어내지 않는다. */
  note: string | null;
}

/** 오늘 운동을 끝냈을 때만 생기는 보조 행동. 기존 히스토리 탭으로 간다. */
export interface HomeSecondaryAction {
  label: string;
  route: '/(tabs)/history';
}

/**
 * 지금 보여줄 수 있는 **가장 강한 실제 성취** 하나.
 *
 * 새 PR 정의도, 새 보상도 만들지 않는다 — 이미 저장된 기록에서 나온 것만 고른다.
 * `source`는 검증기가 우선순위를 고정하기 위한 값이다.
 */
export interface HomePerformanceSignal {
  source: 'weightPr' | 'repsPr' | 'recentSet' | 'workoutCount' | 'volume';
  title: string;
  value: string;
  note: string | null;
}

export interface HomeView {
  state: HomeState;
  /** 이 블록이 무엇에 대한 것인지 알려주는 짧은 머리말. */
  todayLabel: string;
  primary: HomePrimary;
  secondary: HomeSecondaryAction | null;
  /** 아직 아무 기록도 없으면 null. 빈 카드를 세우지 않는다. */
  performance: HomePerformanceSignal | null;
}

function resolveHomeState(ptContext: PtContext): HomeState {
  if (ptContext.today.activeSession) return 'IN_PROGRESS';
  if (ptContext.today.workoutCompleted) return 'POST_WORKOUT';
  return 'PRE_WORKOUT';
}

/** 진행 중인 세션을 사람 말로. 세트를 아직 안 채웠으면 채웠다고 말하지 않는다. */
function describeActiveSession(session: NonNullable<PtContext['today']['activeSession']>): string {
  const { currentExerciseName, completedSets } = session;
  if (!currentExerciseName) return '진행 중인 세션이 있어요';
  return completedSets > 0
    ? `${currentExerciseName} · ${completedSets}세트 완료`
    : `${currentExerciseName} 하는 중`;
}

/** 며칠 전 일인지. 오늘이면 null — "오늘"이라고 굳이 말하지 않는다. */
function describeWhen(date: string, today: string): string | null {
  const gap = daysBetween(date, today);
  if (gap <= 0) return null;
  if (gap === 1) return '어제';
  return `${gap}일 전`;
}

function joinNote(parts: (string | null)[]): string | null {
  const kept = parts.filter((part): part is string => Boolean(part));
  return kept.length > 0 ? kept.join(' · ') : null;
}

/**
 * PR 하나를 홈 카드로. 값 표기는 **기존 포맷터 하나**(`describePrAchievement`)에서만 온다 —
 * 중량 PR과 횟수 PR은 같은 문장으로 말하면 거짓이 되기 때문에 이미 한 곳에 모여 있다.
 */
function prSignal(pr: PtContextPr, today: string): HomePerformanceSignal {
  const value = describePrAchievement({
    kind: pr.kind,
    weightKg: pr.weightKg,
    reps: pr.reps ?? undefined,
  });
  const previous =
    pr.kind === 'weight'
      ? pr.previousBestWeightKg === null
        ? '첫 기록'
        : `이전 최고 ${pr.previousBestWeightKg}kg`
      : null;

  return {
    source: pr.kind === 'weight' ? 'weightPr' : 'repsPr',
    title: pr.kind === 'weight' ? `${pr.name} 최고 중량` : `${pr.name} 최고 횟수`,
    value,
    note: joinNote([previous, describeWhen(pr.date, today)]),
  };
}

/**
 * 지금 신뢰할 수 있는 성취 중 **가장 강한 것 하나**.
 *
 * 순서: 중량 PR → 횟수 PR → 최근 실제 세트 → 이번 주 운동 횟수 → 이번 주 볼륨.
 * 오늘 세운 PR이 있으면 그것을 먼저 본다 — 지난주 기록이 오늘의 성취를 가리면 안 된다.
 * 하나도 없으면 null이고, 화면은 아무것도 세우지 않는다.
 */
export function buildHomePerformance(ptContext: PtContext): HomePerformanceSignal | null {
  const today = ptContext.today.date;
  const { recentPRs, recentExercises, weeklyWorkoutCount, weeklyVolumeKg, streakDays } =
    ptContext.recentTraining;

  const todayPrs = recentPRs.filter((pr) => pr.date === today);
  const pool = todayPrs.length > 0 ? todayPrs : recentPRs;
  const pr = pool.find((candidate) => candidate.kind === 'weight') ?? pool[0];
  if (pr) return prSignal(pr, today);

  const recent = recentExercises.find((exercise) => exercise.topSet !== null);
  if (recent?.topSet) {
    return {
      source: 'recentSet',
      title: recent.name,
      value: `${recent.topSet.weightKg}kg × ${recent.topSet.reps}회`,
      note: describeWhen(recent.date, today),
    };
  }

  if (weeklyWorkoutCount > 0) {
    return {
      source: 'workoutCount',
      title: '이번 주 운동',
      value: `${weeklyWorkoutCount}회`,
      note: streakDays > 0 ? `연속 ${streakDays}일` : null,
    };
  }

  if (weeklyVolumeKg > 0) {
    return {
      source: 'volume',
      title: '이번 주 볼륨',
      value: formatVolumeKg(weeklyVolumeKg),
      note: null,
    };
  }

  return null;
}

export function buildHomeView(input: {
  ptContext: PtContext;
  /** 오늘 예약된 루틴 이름. 없으면 null. */
  scheduledRoutineName?: string | null;
  /**
   * 오늘 추천 부위의 사람 말 이름. **화면이 이미 추천 strip에 쓰고 있는 그 값**이고,
   * 여기서 새로 추천을 계산하지 않는다. 없으면 null이고, 그러면 일반 문구로 남는다 —
   * "오늘 뭘 하는가"를 지어내지 않는다.
   */
  recommendedFocusLabel?: string | null;
}): HomeView {
  const { ptContext } = input;
  const state = resolveHomeState(ptContext);
  const { weeklyWorkoutCount, streakDays } = ptContext.recentTraining;

  if (state === 'IN_PROGRESS') {
    return {
      state,
      todayLabel: '진행 중',
      primary: {
        kind: 'action',
        label: '운동 계속하기',
        note: describeActiveSession(ptContext.today.activeSession!),
      },
      secondary: null,
      performance: buildHomePerformance(ptContext),
    };
  }

  if (state === 'POST_WORKOUT') {
    return {
      state,
      todayLabel: '오늘',
      // 완료는 행동이 아니라 상태다. 여기에 다시 골드 CTA를 세우면 "한 번 더"가 된다.
      primary: {
        kind: 'state',
        label: '오늘 운동 완료',
        note: joinNote([
          weeklyWorkoutCount > 0 ? `이번 주 ${weeklyWorkoutCount}번째 운동` : null,
          streakDays > 0 ? `연속 ${streakDays}일` : null,
        ]),
      },
      secondary: { label: '오늘 운동 기록', route: '/(tabs)/history' },
      performance: buildHomePerformance(ptContext),
    };
  }

  return {
    state,
    todayLabel: '오늘',
    primary: {
      kind: 'action',
      label: '운동 시작',
      /*
        "지금 누를 수 있다"만 말하면 오늘 무엇을 하는 날인지가 늦게 읽힌다. 그래서 이미
        알고 있는 것부터 말한다: 예약된 루틴 → 오늘 추천 부위 → (둘 다 없으면) 일반 문구.
        없는 계획을 만들어 내지는 않는다.
      */
      note: input.scheduledRoutineName
        ? `오늘 · ${input.scheduledRoutineName}`
        : input.recommendedFocusLabel
          ? `오늘 추천 · ${input.recommendedFocusLabel}`
          : '바로 시작할 수 있어요',
    },
    secondary: null,
    performance: buildHomePerformance(ptContext),
  };
}
