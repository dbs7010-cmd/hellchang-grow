import { MuscleGroupLabels } from '@/config/muscle-groups';
import type { MuscleGroup } from '@/types/exercise';
import type { PtContext, PtContextExercise } from '@/utils/pt-context';

/**
 * 무료 PT(스탠리)가 하는 말. **AI가 아니다** — 전부 저장된 기록에서 직접 계산한 문장이고,
 * 컨텍스트에 없는 숫자는 한 글자도 만들지 않는다. AI가 연결되지 않아도 PT 화면이
 * 쓸모 있어야 하기 때문에 둔다.
 *
 * 말투는 config/trainers.ts의 스탠리와 같은 규칙을 따른다 — 존댓말로 짧게, 훈계하지 않는다.
 * 순수 함수다. scripts/verify-pt-context.ts가 기록 유무별 문장을 검증한다.
 */

function describeSet(exercise: PtContextExercise): string {
  if (!exercise.topSet) return `${exercise.name} ${exercise.setCount}세트`;
  return `${exercise.name} ${exercise.topSet.weightKg}kg × ${exercise.topSet.reps}회`;
}

/** 날짜 문자열(YYYY-MM-DD) 사이의 일수. 둘 다 실제 저장된 날짜일 때만 쓴다. */
export function daysBetween(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** 홈/트레이너 화면 상단 한 줄. 지금 상태를 가장 짧게 요약한다. */
export function buildStatusLine(context: PtContext): string {
  const { today, recentTraining } = context;

  if (today.activeSession) {
    const where = today.activeSession.currentExerciseName;
    return where
      ? `지금 ${where} 하는 중이시죠. ${today.activeSession.completedSets}세트 끝났습니다.`
      : '운동 진행 중입니다. 계속하시죠.';
  }
  if (today.workoutCompleted) {
    return '오늘 운동은 끝내셨네요. 수고하셨습니다.';
  }
  if (!recentTraining.lastWorkoutDate) {
    return '아직 기록이 없네요. 오늘 하나 찍으시죠.';
  }

  const gap = daysBetween(recentTraining.lastWorkoutDate, today.date);
  if (gap <= 1) return '어제 하셨네요. 오늘도 가시죠.';
  if (gap <= 3) return `마지막 운동이 ${gap}일 전입니다. 오늘 오시죠.`;
  return `${gap}일 쉬셨습니다. 오늘은 가볍게라도 시작하시죠.`;
}

/** 이번 주/연속/볼륨 요약. 값이 0이면 없는 대로 말한다 — 숫자를 지어내지 않는다. */
export function buildWeeklyLine(context: PtContext): string {
  const { weeklyWorkoutCount, weeklyVolumeKg, streakDays } = context.recentTraining;

  const parts: string[] = [];
  parts.push(weeklyWorkoutCount > 0 ? `이번 주 ${weeklyWorkoutCount}회` : '이번 주 기록 없음');
  if (weeklyVolumeKg > 0) parts.push(`볼륨 ${weeklyVolumeKg.toLocaleString('ko-KR')}kg`);
  if (streakDays > 0) parts.push(`연속 ${streakDays}일`);
  return parts.join(' · ');
}

/** 최근 운동 한 줄. 기록이 없으면 없다고 말한다. */
export function buildRecentTrainingLine(context: PtContext): string {
  const recent = context.recentTraining.recentExercises;
  if (recent.length === 0) return '최근 세트 기록이 없어서 볼 게 없습니다.';
  const head = recent.slice(0, 2).map(describeSet).join(', ');
  return `최근에 ${head} 하셨습니다.`;
}

/** 최근 PR 한 줄. 없으면 null (없는 PR을 만들지 않는다). */
export function buildPrLine(context: PtContext): string | null {
  const [pr] = context.recentTraining.recentPRs;
  if (!pr) return null;
  return pr.previousBestWeightKg === null
    ? `${pr.name}는 ${pr.weightKg}kg가 첫 기록입니다.`
    : `${pr.name} ${pr.weightKg}kg, 이전 최고 ${pr.previousBestWeightKg}kg 넘기셨습니다.`;
}

/**
 * "오늘 뭐 하지?"에 대한 기록 기반 답. 오늘 예약된 루틴 → 추천 부위 순서로 답하고,
 * 근거가 없으면 근거가 없다고 말한다. 앱 DB에 없는 운동 이름은 절대 만들지 않는다.
 */
export function buildTodayPlanLine(
  context: PtContext,
  recommendedGroup: MuscleGroup | null,
  groupExerciseNames: string[]
): string {
  if (context.today.activeSession) {
    return buildStatusLine(context);
  }
  if (context.currentRoutine && context.currentRoutine.exercises.length > 0) {
    return `오늘은 ${context.currentRoutine.name} 예약돼 있습니다. 그대로 가시죠.`;
  }
  if (!recommendedGroup) {
    return '고른 루틴이 없으니 오늘 하고 싶은 부위로 시작하시죠.';
  }
  const label = MuscleGroupLabels[recommendedGroup];
  if (groupExerciseNames.length === 0) {
    return `오늘은 ${label} 어떠십니까?`;
  }
  return `한동안 ${label}를 안 하셨네요. ${groupExerciseNames.slice(0, 2).join(', ')}부터 가시죠.`;
}

/**
 * 특정 운동에 대한 내 기록 답변. 기록이 없으면 "없다"고만 말한다.
 * 여기서 없는 무게/횟수를 만들면 그게 그대로 사용자에게 사실처럼 전달된다.
 */
export function buildExerciseRecordLine(exerciseName: string, recent: PtContextExercise | null): string {
  if (!recent) return `아직 ${exerciseName} 기록이 없네요.`;
  if (!recent.topSet) return `${exerciseName}는 ${recent.date}에 ${recent.setCount}세트 하셨습니다.`;
  return `최근 ${exerciseName}가 ${recent.topSet.weightKg}kg ${recent.topSet.reps}회입니다 (${recent.date}).`;
}

/** 트레이너 화면 브리핑 블록에 그대로 쓰는 3~4줄. null은 걸러서 렌더한다. */
export function buildTrainerBrief(context: PtContext): string[] {
  return [buildStatusLine(context), buildWeeklyLine(context), buildRecentTrainingLine(context), buildPrLine(context)].filter(
    (line): line is string => Boolean(line)
  );
}
