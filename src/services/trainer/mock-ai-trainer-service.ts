import {
  AITrainerService,
  AiQuickActionId,
  AiTrainerMessage,
} from '@/services/trainer/ai-trainer-service';

const MOCK_RESPONSES: Record<AiQuickActionId, string> = {
  what_today: '오늘은 가볍게 20분만 움직여봐. 그것도 안 하면 나만 손해야.',
  build_routine: '주 3회, 상체/하체/유산소로 나눠서 시작해. 무리하지 말고.',
  review_today: '오늘 기록 봤어. 나쁘지 않은데, 강도는 조금 더 올려도 되겠어.',
  check_diet: '단백질부터 챙겨. 나머지는 그다음이야.',
  ask_form: '자세 영상까지 봐주는 기능은 아직 준비 중이야. 조금만 기다려.',
  weekly_summary: '이번 주는 꾸준했어. 다음 주도 이 페이스 유지해봐.',
};

export class MockAITrainerService implements AITrainerService {
  async sendQuickAction(actionId: AiQuickActionId): Promise<AiTrainerMessage> {
    return { actionId, text: MOCK_RESPONSES[actionId] };
  }
}

export const aiTrainerService: AITrainerService = new MockAITrainerService();
