/** release에서는 민감한 운동 컨텍스트를 평문 HTTP로 보내지 않는다. */
export function normalizeTrainerEndpointUrl(value: string, isDev: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const localDev = isDev && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    return parsed.protocol === 'https:' || (localDev && parsed.protocol === 'http:') ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function parseRetryAfterMs(value: string | null, nowMs = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) && at > nowMs ? at - nowMs : undefined;
}
