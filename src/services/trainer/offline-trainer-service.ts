import { Exercises, getExercisesByMuscleGroup, searchExercises } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import {
  AITrainerService,
  AiTrainerMessage,
  AiTrainerRequest,
} from '@/services/trainer/ai-trainer-service';
import { matchExerciseInText } from '@/utils/pt-context';
import {
  buildExerciseRecordLine,
  buildPrLine,
  buildRecentTrainingLine,
  buildStatusLine,
  buildTodayPlanLine,
  buildWeeklyLine,
} from '@/utils/trainer-brief';

/**
 * AI가 연결되지 않았을 때 쓰는 PT. **LLM이 아니다.**
 *
 * 여기서 나가는 모든 문장은 전달받은 PtContext(=실제 저장된 기록)에서 계산한 것이다.
 * "AI인 척하는 가짜 답변"을 만들지 않기 위해 두 가지를 지킨다.
 *  1. 컨텍스트에 없는 숫자/운동/루틴을 문장에 넣지 않는다.
 *  2. 기록으로 답할 수 없는 질문(자유 상담, 식단 상담 등)은 답을 지어내지 않고,
 *     지금은 답할 수 없다고 그대로 말한다. 화면도 source: 'offline'로 이를 표시한다.
 */
export class OfflineTrainerService implements AITrainerService {
  readonly isAiConnected = false;

  async send(request: AiTrainerRequest): Promise<AiTrainerMessage> {
    return { text: this.answer(request), source: 'offline' };
  }

  private answer(request: AiTrainerRequest): string {
    const { context, quickActionId, text } = request;

    if (quickActionId === 'what_today') return this.todayPlan(context);
    if (quickActionId === 'review_today' || quickActionId === 'weekly_summary') {
      return [buildStatusLine(context), buildWeeklyLine(context), buildRecentTrainingLine(context), buildPrLine(context)]
        .filter(Boolean)
        .join('\n');
    }
    if (quickActionId === 'build_routine') {
      return context.currentRoutine
        ? `지금 ${context.currentRoutine.name} 루틴 쓰고 계십니다. 새 루틴 추천은 AI 연결 후에 봐드리겠습니다.`
        : '루틴 추천은 AI 연결 후에 봐드리겠습니다. 지금은 [운동] 탭에서 직접 만드실 수 있습니다.';
    }
    if (quickActionId === 'check_diet' || quickActionId === 'ask_form') {
      return '이건 AI 연결 후에 답해드릴 수 있습니다. 지금은 기록으로 볼 수 있는 것만 말씀드립니다.';
    }

    // 자유 질문: 특정 운동을 물었고 그 운동 기록이 있으면 그것만 정확히 답한다.
    const matched = request.exercise ?? this.matchExercise(text);
    if (matched) {
      const exerciseId = 'exerciseId' in matched ? matched.exerciseId : matched.id;
      const recent =
        request.exercise?.myRecent ??
        context.recentTraining.recentExercises.find((entry) => entry.exerciseId === exerciseId) ??
        null;
      return buildExerciseRecordLine(matched.name, recent);
    }

    if (/오늘|뭐\s*하|추천/.test(text)) return this.todayPlan(context);
    if (/기록|최근|이번\s*주|볼륨|연속/.test(text)) {
      return [buildStatusLine(context), buildWeeklyLine(context), buildRecentTrainingLine(context)]
        .filter(Boolean)
        .join('\n');
    }

    return '아직 AI가 연결되지 않아서 자유 질문은 못 받습니다. 기록 관련해서는 위 빠른 질문으로 물어보시죠.';
  }

  private todayPlan(context: AiTrainerRequest['context']): string {
    const trained = new Set(
      context.recentTraining.recentExercises
        .map((entry) => Exercises.find((exercise) => exercise.id === entry.exerciseId)?.primaryMuscleGroup)
        .filter(Boolean)
    );
    const untouched = MuscleGroups.find((group) => !trained.has(group)) ?? null;
    const names = untouched ? getExercisesByMuscleGroup(untouched).slice(0, 2).map((e) => e.name) : [];
    return buildTodayPlanLine(context, untouched, names);
  }

  /** 질문에 앱 운동 DB의 운동이 들어 있으면 그 운동으로 본다. DB에 없는 운동은 만들지 않는다. */
  private matchExercise(text: string) {
    return matchExerciseInText(text, Exercises, searchExercises);
  }
}
