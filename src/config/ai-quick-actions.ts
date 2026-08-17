import { AiQuickActionId } from '@/services/trainer/ai-trainer-service';

export const AiQuickActionIds: AiQuickActionId[] = [
  'what_today',
  'build_routine',
  'review_today',
  'check_diet',
  'ask_form',
  'weekly_summary',
];

export const AiQuickActionLabels: Record<AiQuickActionId, string> = {
  what_today: '오늘 뭐 하지?',
  build_routine: '루틴 짜줘',
  review_today: '오늘 기록 평가',
  check_diet: '식단 봐줘',
  ask_form: '운동법 질문',
  weekly_summary: '이번 주 정리',
};
