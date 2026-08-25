import type { MuscleGroup } from '@/types/exercise';
import type { PtContext, PtExerciseBrief } from '@/utils/pt-context';
import type { QuickStartExercise } from '@/utils/workout-start';

export type AiQuickActionId =
  | 'what_today'
  | 'build_routine'
  | 'review_today'
  | 'check_diet'
  | 'ask_form'
  | 'weekly_summary';

/**
 * PT가 "오늘 이거 하시죠"라고 말할 때 함께 오는 **실행 가능한 계획**.
 *
 * 문장만 돌려주면 화면이 그 문장을 다시 해석해야 하고, 사용자는 PT 말을 듣고 운동 시작
 * 화면으로 가서 같은 부위를 손으로 다시 골라야 한다. 그래서 말과 같은 근거(부위 + 운동)를
 * 구조로도 같이 넘긴다 — 화면은 이 값을 그대로 startWorkoutSession에 넘기면 된다.
 *
 * 없을 수도 있다(기록 질문, 식단 질문 등). 있을 때만 시작 버튼이 뜬다.
 */
export interface AiTrainerPlan {
  muscleGroup: MuscleGroup;
  exercises: QuickStartExercise[];
}

export interface AiTrainerMessage {
  text: string;
  /** 이 답변으로 바로 시작할 수 있는 운동. 기록/식단 답변에는 없다. */
  plan?: AiTrainerPlan;
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
  constructor(message: string) {
    super(message);
    this.name = 'AiTrainerRequestError';
  }
}
