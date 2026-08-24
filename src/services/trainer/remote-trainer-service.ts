import Constants from 'expo-constants';

import { AppConfig } from '@/config/app-config';
import type { AuthTokenProvider } from '@/services/auth/auth-token-provider';
import {
  AITrainerService,
  AiTrainerMessage,
  AiTrainerRequest,
  AiTrainerRequestError,
} from '@/services/trainer/ai-trainer-service';
import {
  normalizeTrainerEndpointUrl,
  parseRetryAfterMs,
} from '@/services/trainer/trainer-request-config';

/**
 * 서버 프록시를 통해 LLM에 묻는 PT.
 *
 * **앱은 API 키를 갖지 않는다.** 클라이언트가 아는 것은 프록시 엔드포인트 URL 하나뿐이고,
 * 실제 provider 키는 그 서버만 갖는다. 클라이언트 번들은 사용자가 열어볼 수 있으므로
 * EXPO_PUBLIC_* 값이든 app.json extra든 앱에 들어간 값은 전부 공개된 값으로 취급한다.
 *
 * 엔드포인트가 설정되지 않으면 이 서비스는 만들어지지 않고(resolveTrainerService),
 * 앱은 기록 기반 오프라인 PT로 떨어진다 — 연결되지 않았는데 연결된 척하지 않는다.
 *
 * 서버가 받는 body (provider secret과 system prompt는 서버만 소유한다):
 *   { requestId, message, quickActionId, context, exercise, history }
 * 서버가 돌려줘야 하는 body:
 *   { text: string }
 */
export class RemoteTrainerService implements AITrainerService {
  readonly isAiConnected = true;
  private readonly endpointUrl: string;
  private readonly authTokenProvider: AuthTokenProvider;

  constructor(endpointUrl: string, authTokenProvider: AuthTokenProvider) {
    this.endpointUrl = endpointUrl;
    this.authTokenProvider = authTokenProvider;
  }

  async send(request: AiTrainerRequest): Promise<AiTrainerMessage> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AppConfig.aiRequestTimeoutMs);

    try {
      const authToken = await this.authTokenProvider.getToken();
      if (!authToken) {
        throw new AiTrainerRequestError('AI PT 인증을 확인할 수 없습니다.', 'http', 401);
      }
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': request.requestId,
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          requestId: request.requestId,
          message: request.text,
          quickActionId: request.quickActionId ?? null,
          context: request.context,
          exercise: request.exercise ?? null,
          history: request.history,
        }),
      });

      if (!response.ok) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));
        if (response.status === 429) {
          throw new AiTrainerRequestError(
            '요청이 몰렸어요. 잠시 뒤 다시 시도해 주세요.',
            'rate_limit',
            response.status,
            retryAfterMs
          );
        }
        throw new AiTrainerRequestError(
          `PT 서버가 ${response.status}로 응답했습니다.`,
          'http',
          response.status,
          retryAfterMs
        );
      }

      const raw = await response.text();
      if (raw.length > AppConfig.aiResponseCharacterLimit) {
        throw new AiTrainerRequestError('PT 서버 답변이 너무 깁니다.', 'malformed');
      }
      let data: { text?: unknown };
      try {
        data = JSON.parse(raw) as { text?: unknown };
      } catch {
        throw new AiTrainerRequestError('PT 서버 답변 형식을 확인할 수 없습니다.', 'malformed');
      }
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text) {
        throw new AiTrainerRequestError('PT 서버가 빈 답변을 보냈습니다.', 'malformed');
      }
      return { text, source: 'ai' };
    } catch (error) {
      if (error instanceof AiTrainerRequestError) throw error;
      if ((error as Error)?.name === 'AbortError') {
        throw new AiTrainerRequestError('응답이 너무 오래 걸립니다.', 'timeout');
      }
      throw new AiTrainerRequestError('PT 서버에 연결하지 못했습니다.', 'network');
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * 프록시 엔드포인트를 찾는다. 둘 다 "앱에 박히는 공개 값"이며 비밀키가 아니다.
 *  1. EXPO_PUBLIC_AI_TRAINER_URL (환경변수)
 *  2. app.json > expo.extra.aiTrainerEndpointUrl
 * 없으면 null — 호출부가 오프라인 PT로 떨어진다.
 */
export function resolveTrainerEndpointUrl(isDev = typeof __DEV__ !== 'undefined' && __DEV__): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_AI_TRAINER_URL;
  const fromExtra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.
    aiTrainerEndpointUrl;
  const url = (typeof fromEnv === 'string' && fromEnv) || (typeof fromExtra === 'string' && fromExtra) || '';
  return normalizeTrainerEndpointUrl(url, isDev);
}

/** release에서는 민감한 운동 컨텍스트를 평문 HTTP로 보내지 않는다. */
