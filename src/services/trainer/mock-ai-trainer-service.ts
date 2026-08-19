import {
  AITrainerService,
  AiQuickActionId,
  AiTrainerMessage,
} from '@/services/trainer/ai-trainer-service';

/**
 * 스탠리의 대사는 화면과 상관없이 톤이 같아야 한다 — 존댓말로 짧고 담백하게.
 * (config/trainers.ts의 dialogueSet와 같은 규칙을 따른다.)
 */
const MOCK_RESPONSES: Record<AiQuickActionId, string> = {
  what_today: '오늘은 가볍게 20분만 움직여보시죠. 안 하는 것보단 낫습니다.',
  build_routine: '주 3회로 상체·하체·유산소를 나눠서 시작해보시죠.',
  review_today: '오늘 기록 봤습니다. 나쁘지 않은데, 강도는 조금 더 올리셔도 되겠습니다.',
  check_diet: '단백질부터 챙기시죠. 나머지는 그다음입니다.',
  ask_form: '자세를 영상으로 봐드리는 기능은 아직 준비 중입니다.',
  weekly_summary: '이번 주는 꾸준하셨습니다. 다음 주도 이 페이스로 가시죠.',
};

export class MockAITrainerService implements AITrainerService {
  async sendQuickAction(actionId: AiQuickActionId): Promise<AiTrainerMessage> {
    return { text: MOCK_RESPONSES[actionId] };
  }

  async sendMessage(text: string): Promise<AiTrainerMessage> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { text: '질문을 적어주시면 답해드리겠습니다.' };
    }
    return {
      text: `"${trimmed}"에 대한 답변은 아직 준비 중입니다. 지금은 위의 빠른 질문으로 먼저 물어봐주세요.`,
    };
  }
}

export const aiTrainerService: AITrainerService = new MockAITrainerService();
