import type { BodyParameters } from '@/types/body';
import type { UserProfile } from '@/types/user';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 저장된 값의 모양 검사
 *
 * repository들은 오랫동안 `readJSON(...) ?? 기본값` 하나로 버텼다. 그것이 막아 주는 것은
 * **값이 없는 경우**뿐이다. 실제로 앱을 멈춘 것은 그게 아니라 "값은 있는데 모양이 다른"
 * 경우였다 — 앱 업데이트로 필수 필드가 늘었거나, 쓰기 도중 종료돼 값이 깨졌거나.
 *
 * 그때 화면은 `.find` / `.map` / `.bodyParameters.size`에서 렌더 도중 터지고, 사용자는
 * 재설치 말고는 빠져나올 방법이 없는 빈 화면을 본다.
 *
 * 여기 있는 함수들은 전부 순수하다 — 저장소를 모르고, 검증할 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 저장소에서 읽은 원문을 값으로 바꾼다. 읽지 못하면 **없는 값**이다.
 *
 * 쓰기 도중 앱이 강제 종료되면 값이 잘린 채로 남고 `JSON.parse`가 던진다. 그 예외가
 * 부팅 경로까지 올라가면 앱은 영원히 빈 화면에 머문다 — 다른 키에 멀쩡히 남아 있는
 * 운동 기록까지 함께 잃는다. 그래서 손상 범위를 그 키 하나로 격리한다.
 *
 * 손상된 원문을 지우지는 않는다. 파싱하지 못했을 뿐 사용자의 데이터다.
 */
export function parseStoredJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 배열로 저장했어야 할 값. 배열이 아니면 빈 배열로 다룬다. */
export function asStoredArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * 온보딩 완료 플래그. **정확히 true일 때만 완료다.**
 *
 * truthy 검사로는 부족하다 — 손상된 값이 객체나 비어 있지 않은 문자열이면 통과해서,
 * 프로필도 없는 사용자를 온보딩 없이 홈으로 들여보낸다.
 */
export function isOnboardingComplete(value: unknown): boolean {
  return value === true;
}

/**
 * 프로필로 쓸 수 있는 값인가.
 *
 * 화면들은 `profile.bodyParameters.size`처럼 필수 필드가 있다고 믿고 읽는다.
 * 모양이 맞지 않으면 **"프로필이 없다"로 다룬다** — 반쯤 읽힌 프로필로 앱을 굴리지 않는다.
 * 그래야 온보딩으로 되돌려 다시 만들 수 있고, 운동 기록 같은 다른 키는 그대로 남는다.
 */
export function isUsableProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const profile = value as Partial<UserProfile>;
  const body = profile.bodyParameters as Partial<BodyParameters> | undefined;
  return (
    typeof profile.genderExpression === 'string' &&
    typeof profile.bodyPresetId === 'string' &&
    typeof profile.weightKg === 'number' &&
    Number.isFinite(profile.weightKg) &&
    typeof body === 'object' &&
    body !== null &&
    typeof body.size === 'number' &&
    Number.isFinite(body.size) &&
    typeof body.tone === 'number' &&
    Number.isFinite(body.tone)
  );
}

/**
 * 저장된 온보딩 플래그와 프로필을 함께 보고, 이번 실행을 온보딩으로 시작할지 정한다.
 *
 * 두 방향을 모두 막는다.
 * - 플래그는 있는데 쓸 수 있는 프로필이 없으면 완료로 보지 않는다. 홈 화면은 프로필이
 *   없으면 아무것도 그리지 않으므로, 통과시키면 탭 바만 있는 빈 화면에 갇히고 온보딩으로
 *   돌아갈 길도 없다.
 * - 온보딩이 생기기 전에 이미 프로필을 만든 사용자는 플래그가 없어도 완료로 본다.
 *   그 사람을 첫 화면에 다시 가두지 않기 위한 것이고, `shouldPersistFlag`로 플래그만
 *   보강한다 — 다른 키(운동 기록/성장)는 건드리지 않는다.
 */
export function resolveOnboardingState(
  onboardingFlag: boolean,
  profile: UserProfile | null
): { onboardingComplete: boolean; shouldPersistFlag: boolean } {
  if (onboardingFlag) return { onboardingComplete: profile !== null, shouldPersistFlag: false };
  if (profile !== null && profile.weightKg > 0) {
    return { onboardingComplete: true, shouldPersistFlag: true };
  }
  return { onboardingComplete: false, shouldPersistFlag: false };
}

/**
 * 부팅 결과로 어떤 화면을 세울지. 네비게이터가 분기하는 세 갈래만 돌려준다
 * (온보딩/앱 분기는 기존 `Stack.Protected` guard가 그대로 담당한다).
 *
 * 핵심은 **읽지 못한 것과 없는 것을 구분하는 것**이다. 저장값을 읽지 못했을 때 그냥
 * 통과시키면 온보딩이 열리고, 사용자가 그것을 완료하는 순간 멀쩡히 남아 있던 프로필과
 * 기록을 덮어쓴다. 그래서 `bootstrapFailed`면 온보딩 완료 여부와 **무관하게** 복구 화면이다.
 */
export function resolveBootstrapScreen(input: {
  loading: boolean;
  bootstrapFailed: boolean;
  onboardingComplete: boolean;
}): 'splash' | 'recovery' | 'navigator' {
  if (input.loading) return 'splash';
  if (input.bootstrapFailed) return 'recovery';
  return 'navigator';
}
