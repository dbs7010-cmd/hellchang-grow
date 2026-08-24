/**
 * AsyncStorage에서 읽은 JSON 문자열을 안전하게 해석한다.
 *
 * 문법이 깨진 값 하나는 해당 문서만 없는 것으로 취급한다. 원본 키를 지우거나 고치지는
 * 않으므로 다른 저장 데이터와 복구 가능한 사용자 기록은 그대로 남는다.
 * AsyncStorage I/O 오류는 이 함수 바깥에서 발생하므로 호출부까지 그대로 전파된다.
 */
export function parseStoredJson<T>(raw: string | null): T | null {
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 실제 읽기 작업과 문자열 파싱의 경계. 읽기 자체가 실패하면 예외를 그대로 보존하고,
 * 성공적으로 읽은 문자열의 문법만 `parseStoredJson`이 격리한다.
 */
export async function readStoredJson<T>(readRaw: () => Promise<string | null>): Promise<T | null> {
  return parseStoredJson<T>(await readRaw());
}

/** 완료 플래그만 남고 프로필 문서가 없으면 HOME 대신 프로필 온보딩으로 복구한다. */
export function resolveStoredOnboardingComplete(
  storedComplete: boolean,
  profile: { weightKg: number } | null
): boolean {
  return profile !== null && (storedComplete || profile.weightKg > 0);
}
