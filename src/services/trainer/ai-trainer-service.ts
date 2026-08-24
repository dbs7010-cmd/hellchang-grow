import type { PtContext, PtExerciseBrief } from '@/utils/pt-context';

export type AiQuickActionId =
  | 'what_today'
  | 'build_routine'
  | 'review_today'
  | 'check_diet'
  | 'ask_form'
  | 'weekly_summary';

export interface AiTrainerMessage {
  text: string;
  /**
   * 이 답변이 실제 AI에서 온 것인지, 앱이 기록만 보고 만든 것인지.
   * 화면은 이 값으로 "AI 연결 전"임을 사용자에게 정직하게 표시한다.
   */
  source: 'ai' | 'offline';
}

export interface AiTrainerHistoryEntry {
  role: 'user' | 'trainer';
  text: string;
}

export interface AiTrainerRequest {
  /** 재시도에도 유지되는 공개 요청 식별자. 서버의 Idempotency-Key와 동일하다. */
  requestId: string;
  /** 사용자가 실제로 보낸 문장 (빠른 질문도 문장으로 바뀌어 들어온다) */
  text: string;
  /** 빠른 질문으로 시작된 요청이면 그 ID */
  quickActionId?: AiQuickActionId;
  /** 실제 저장된 기록만 담긴 압축 컨텍스트 */
  context: PtContext;
  /** 질문에서 특정 운동이 잡히면 앱 내부 운동 데이터도 같이 넘긴다 */
  exercise?: PtExerciseBrief | null;
  /** 최근 대화 몇 개만 (AppConfig.aiHistoryMessageLimit) */
  history: AiTrainerHistoryEntry[];
}

/**
 * PT 답변을 만드는 쪽의 계약. 구현은 두 가지다.
 *  - remote : 서버 프록시(LLM)로 보낸다. 엔드포인트가 설정돼 있을 때만 쓴다.
 *  - offline: 기록에서 직접 계산한다. AI가 아니라는 것을 source로 알린다.
 *
 * API 키는 이 계층에도, 앱 어디에도 두지 않는다 — 키는 프록시 서버만 갖는다.
 */
export interface AITrainerService {
  /** 실제 AI가 연결돼 있는지. false면 화면이 "AI 연결 전"으로 안내한다. */
  readonly isAiConnected: boolean;
  send(request: AiTrainerRequest): Promise<AiTrainerMessage>;
}

/** 요청이 실패했을 때 화면이 재시도를 안내할 수 있게 던지는 에러. */
export class AiTrainerRequestError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'network' | 'http' | 'rate_limit' | 'malformed' = 'network',
    readonly status?: number,
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'AiTrainerRequestError';
  }
}
