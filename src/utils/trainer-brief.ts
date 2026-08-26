import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { MuscleGroupLabels } from '@/config/muscle-groups';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';
import type { MuscleGroup } from '@/types/exercise';
import { hasLearnedStage, mostRecentlyObserved } from '@/utils/danbaek-learning-presence';
import { withObjectParticle, withSubjectParticle, withTopicParticle } from '@/utils/korean';
import { selectRepresentativePr } from '@/utils/pt-context';
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
    const { currentExerciseName, completedSets, currentExerciseCompletedSets } = today.activeSession;
    // 운동 이름 옆의 숫자는 그 운동의 세트 수여야 한다 — 세션 합계를 붙이면 하지도 않은
    // 세트를 했다고 말하게 된다. 지금 하는 운동을 모르면 세션 전체로만 말한다.
    if (!currentExerciseName || currentExerciseCompletedSets === null) {
      return completedSets > 0
        ? `운동 진행 중입니다. 지금까지 ${completedSets}세트 끝났습니다.`
        : '운동 진행 중입니다. 계속하시죠.';
    }
    if (currentExerciseCompletedSets === 0) return `지금 ${currentExerciseName} 하는 중이시죠. 가시죠.`;
    return completedSets > currentExerciseCompletedSets
      ? `지금 ${currentExerciseName} ${currentExerciseCompletedSets}세트 하셨습니다. 오늘 전체 ${completedSets}세트입니다.`
      : `지금 ${currentExerciseName} 하는 중이시죠. ${currentExerciseCompletedSets}세트 끝났습니다.`;
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

/**
 * 최근 PR 한 줄. 없으면 null (없는 PR을 만들지 않는다).
 *
 * PR은 두 종류다([[decision-log]] DEC-011). 횟수 PR을 중량 기준으로 말하면 거짓이 된다 —
 * 이미 들어 본 무게를 "첫 기록"이라고 하거나, 늘어난 것이 횟수인데 무게를 넘겼다고 하게 된다.
 */
export function buildPrLine(context: PtContext): string | null {
  // 목록의 첫 번째가 아니라 **홈과 같은 정책**이 고른 대표 PR을 말한다 — 예전에는 같은
  // 하루를 두고 홈은 중량 PR을, 스탠리는 목록 순서상의 첫 PR을 말할 수 있었다.
  const pr = selectRepresentativePr(context.recentTraining.recentPRs);
  if (!pr) return null;

  if (pr.kind === 'reps') {
    const load = pr.weightKg > 0 ? `${pr.weightKg}kg` : '맨몸';
    return `${pr.name} ${load}로 ${pr.reps}회, 횟수 기록 넘기셨습니다.`;
  }

  return pr.previousBestWeightKg === null
    ? `${withTopicParticle(pr.name)} ${pr.weightKg}kg가 첫 기록입니다.`
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
  return `한동안 ${withObjectParticle(label)} 안 하셨네요. ${groupExerciseNames.slice(0, 2).join(', ')}부터 가시죠.`;
}

/**
 * 특정 운동에 대한 내 기록 답변. 기록이 없으면 "없다"고만 말한다.
 * 여기서 없는 무게/횟수를 만들면 그게 그대로 사용자에게 사실처럼 전달된다.
 */
export function buildExerciseRecordLine(exerciseName: string, recent: PtContextExercise | null): string {
  if (!recent) return `아직 ${exerciseName} 기록이 없네요.`;
  if (!recent.topSet) {
    return `${withTopicParticle(exerciseName)} ${recent.date}에 ${recent.setCount}세트 하셨습니다.`;
  }
  return `최근 ${withSubjectParticle(exerciseName)} ${recent.topSet.weightKg}kg ${recent.topSet.reps}회입니다 (${recent.date}).`;
}

/**
 * 스탠리가 단백이를 언급하는 한 줄.
 *
 * 관계는 **스탠리 → 플레이어 → 단백이** 순서다(헌법 2장). 그래서 이 문장에서도 가르치는
 * 쪽은 여전히 스탠리이고, 단백이는 옆에서 따라 하는 존재로만 등장한다 — PT를 캐릭터 육성
 * NPC로 바꾸지 않는다. 학습 상태는 이미 계산된 스냅샷에서만 읽고, 없으면 없다고 말한다.
 */
export function buildDanbaekWatchLine(profile: DanbaekLearningProfile): string {
  const capability = mostRecentlyObserved(profile);
  if (!capability) return '단백이는 아직 본 게 없습니다. 오늘 한 세트부터 보여주시죠.';

  const label = MovementFamilyLabels[capability.movementFamily];
  if (hasLearnedStage(capability.learningStage)) {
    return `${withTopicParticle(label)} 단백이도 따라 할 만큼 봤습니다. 오늘은 무게에 집중하시죠.`;
  }
  return `단백이가 옆에서 ${withObjectParticle(label)} 따라 하는 중입니다. 자세는 제가 봅니다.`;
}

export interface TrainerBriefSections {
  /** 지금 어떤 상태인가. 화면 맨 위 한 줄. */
  status: string;
  /** 오늘 중요한 한 가지. PR > 최근 운동 > 주간 요약 순으로 고른다. */
  focus: string;
  /** 그 판단의 근거. 작게 깔린다 — 상태/한 가지와 같은 무게로 읽히면 안 된다. */
  records: string[];
}

/**
 * PT가 실제로 말하는 순서로 나눈다: **지금 상태 → 오늘 중요한 한 가지 → 근거**.
 *
 * 예전에는 같은 문장 네댓 줄이 한 카드에 같은 무게로 쌓여서, 읽는 사람이 무엇부터 봐야
 * 할지 고를 수 없었다. 문장 자체는 그대로 재사용하고 순서와 무게만 정한다 — 새 문장을
 * 만들지 않으므로 여기서 없는 사실이 생길 수 없다.
 *
 * 단백이 이야기는 **여기 들어가지 않는다.** 스탠리 카드 안에 단백이가 있으면 두 역할이
 * 한 목소리로 섞인다 (화면이 따로 보여준다).
 */
export function buildTrainerBriefSections(context: PtContext): TrainerBriefSections {
  const status = buildStatusLine(context);
  const prLine = buildPrLine(context);
  const recentLine = buildRecentTrainingLine(context);
  const weeklyLine = buildWeeklyLine(context);

  const focus = prLine ?? recentLine;
  const records = [weeklyLine, focus === recentLine ? null : recentLine].filter(
    (line): line is string => Boolean(line)
  );

  return { status, focus, records };
}

/**
 * 트레이너 화면 브리핑 블록에 그대로 쓰는 3~5줄. null은 걸러서 렌더한다.
 *
 * 단백이 줄은 **선택 인자**다 — 학습 스냅샷을 주지 않는 호출부(기존 검증 포함)는 예전과
 * 똑같은 브리핑을 받는다.
 */
export function buildTrainerBrief(
  context: PtContext,
  danbaekLearning?: DanbaekLearningProfile
): string[] {
  return [
    buildStatusLine(context),
    buildWeeklyLine(context),
    buildRecentTrainingLine(context),
    buildPrLine(context),
    danbaekLearning ? buildDanbaekWatchLine(danbaekLearning) : null,
  ].filter((line): line is string => Boolean(line));
}
