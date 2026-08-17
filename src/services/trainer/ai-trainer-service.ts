export type AiQuickActionId =
  | 'what_today'
  | 'build_routine'
  | 'review_today'
  | 'check_diet'
  | 'ask_form'
  | 'weekly_summary';

export interface AiTrainerMessage {
  text: string;
}

/** 실제 LLM API로 교체할 때 이 인터페이스만 구현하면 된다. UI는 바뀌지 않는다. */
export interface AITrainerService {
  sendQuickAction(actionId: AiQuickActionId): Promise<AiTrainerMessage>;
  /** 빠른 선택 버튼 이후 자유 입력창에서 보낸 메시지 */
  sendMessage(text: string): Promise<AiTrainerMessage>;
}
