/** Production AI proxy가 검증할 짧은 수명의 앱 세션 token을 제공하는 경계. */
export interface AuthTokenProvider {
  readonly isAvailable: boolean;
  getToken(): Promise<string | null>;
}

/** 사용자 인증/backend가 연결되기 전 release는 원격 AI를 fail closed한다. */
export class UnavailableAuthTokenProvider implements AuthTokenProvider {
  readonly isAvailable = false;

  async getToken(): Promise<null> {
    return null;
  }
}
