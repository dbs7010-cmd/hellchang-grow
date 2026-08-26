import type { BodyParameters } from '@/types/body';
import type { UserProfile } from '@/types/user';
import type { SessionCompletionReceipt } from '@/types/session-completion';
import type { WorkoutSetEntry } from '@/types/workout';
import type { SessionExerciseEntry, WorkoutSession } from '@/types/workout-session';

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

/**
 * 저장된 진행 중 세션. 모양이 맞지 않으면 **세션이 없는 것으로 다룬다.**
 *
 * 이 키는 앱에서 가장 자주 쓰인다 — 세트를 완료할 때마다, 그리고 heartbeat마다 저장된다.
 * 그래서 쓰기 도중 강제 종료가 겹칠 확률도 가장 높다. 그런데 세션 화면은
 * `session.exercises.map(...)`처럼 필드가 있다고 믿고 읽으므로, 잘린 값 하나가 운동 화면을
 * 렌더 도중 터뜨린다.
 *
 * 판정은 두 단계다.
 * - **세션이라고 볼 수 없으면 버린다**: 객체가 아니거나, id/시각/상태가 없거나, 상태 값이
 *   세 가지가 아닌 경우. 이 상태로는 어떤 화면도 그릴 수 없다.
 * - **읽을 수 있는 세션은 살린다**: 진행 중이던 운동을 통째로 버리는 것이 더 나쁜 결과다.
 *   `exercises`가 없거나 배열이 아니면(옛 버전 세션, 잘린 값) 빈 배열로, 숫자가 아닌 누적
 *   시간은 0으로 읽는다. NaN을 그대로 흘리면 타이머와 기록 분(分)까지 NaN이 된다.
 *
 * **읽을 때만 정리하고 저장소를 고쳐 쓰지 않는다** — 저장된 값은 그대로 두고, 다음 저장이
 * 자연스럽게 덮어쓴다.
 */
export function asStoredSession(value: unknown): WorkoutSession | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const session = value as Partial<WorkoutSession>;
  if (typeof session.id !== 'string' || session.id.length === 0) return null;
  if (typeof session.startedAt !== 'string' || typeof session.createdAt !== 'string') return null;
  if (session.status !== 'active' && session.status !== 'paused' && session.status !== 'completed') {
    return null;
  }

  const exercises = asStoredArray<SessionExerciseEntry>(session.exercises).map((exercise) => ({
    ...exercise,
    sets: asStoredArray<WorkoutSetEntry>(exercise?.sets),
  }));
  const accumulatedSeconds =
    typeof session.accumulatedSeconds === 'number' && Number.isFinite(session.accumulatedSeconds)
      ? session.accumulatedSeconds
      : 0;

  return { ...(session as WorkoutSession), accumulatedSeconds, exercises };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 작은 조각들
 *
 * 상태 저장소마다 전용 검사기를 만들면 같은 규칙이 여섯 벌이 된다. 실제로 필요한 것은
 * "이 자리에 숫자가/날짜가/참이 들어 있는가" 몇 가지뿐이라, repository들이 이 조각을
 * 조합해서 쓴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 필드를 읽기 전에 확인한다. 객체가 아니면 저장된 것이 없는 것과 같다. */
export function asStoredRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * 개수/포인트처럼 **0 이상이어야 하는 숫자**. 그 밖의 값은 기본값으로 읽는다.
 *
 * 문자열 "5"를 그대로 흘리면 `"5" + 1 = "51"`이 되고 `"5" > 0`은 true다 — 연속 기록이
 * 이상해지거나, 없는 이용권으로 유료 기능이 열린다. NaN은 화면의 숫자를 전부 NaN으로 만든다.
 */
export function asStoredCount(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return value;
}

/** 저장된 참/거짓. 정확히 true일 때만 참이다 (문자열/숫자는 참이 아니다). */
export function asStoredFlag(value: unknown): boolean {
  return value === true;
}

/**
 * 날짜로 쓸 수 있는 문자열. 읽을 수 없으면 **없는 값**이다.
 *
 * `new Date(깨진 값)`은 Invalid Date이고, 거기에 대고 `.toISOString()`을 부르면 던진다.
 * 화면에는 "Invalid Date"가 그대로 찍힌다.
 */
export function asStoredDateString(value: unknown): string | undefined {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return undefined;
  return value;
}

/** 저장된 문자열. 문자열이 아니면 없는 값이다. */
export function asStoredText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * 저장된 완료 receipt를 세 가지로 나눈다.
 *
 * 이 값은 운동 완료 파이프라인(Growth → 기록 → 보상 → cleanup)이 "어디까지 성공했는지"
 * 기억하는 유일한 근거다. 그래서 다른 저장값처럼 "이상하면 기본값" 으로 다룰 수 없다 —
 * 단계 표시 하나를 잘못 읽으면 이미 준 성장/XP를 다시 주거나(중복), 아직 안 준 보상을
 * 줬다고 판단한다(유실).
 *
 * - `none`: 저장된 것이 없다. 처음부터 시작하면 된다.
 * - `usable`: 모든 단계 표시를 읽을 수 있다. 그 지점부터 이어서 하면 된다.
 * - `unreadable`: 값은 있는데 믿을 수 없다. **버리지도 말고 진행하지도 않는다.**
 *   읽을 수 있는 `sessionId`가 있으면 함께 돌려준다 — 다른 세션의 잔해라면 이번 완료를
 *   막을 이유가 없기 때문이다(그 판단은 호출부가 한다).
 *
 * snapshot 안쪽까지 검사하지는 않는다. 여기서 정하는 것은 "어느 단계부터 이어갈 수 있는가"
 * 하나이고, snapshot이 실제로 쓸 수 없으면 그 단계에서 실패해 같은 재시도 경로로 돌아온다.
 */
export function classifyStoredReceiptRaw(
  raw: string | null
): ReturnType<typeof classifyStoredReceipt> {
  if (raw === null) return { kind: 'none' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 다른 키에서는 파싱 실패를 "없는 값"으로 접었다. 여기서는 그럴 수 없다 —
    // 잘린 원문 뒤에 이미 반영된 단계가 있었는지 알 수 없기 때문이다.
    return { kind: 'unreadable' };
  }
  return classifyStoredReceipt(parsed);
}

export function classifyStoredReceipt(
  value: unknown
):
  | { kind: 'none' }
  | { kind: 'usable'; receipt: SessionCompletionReceipt }
  | { kind: 'unreadable'; sessionId?: string } {
  if (value === null || value === undefined) return { kind: 'none' };

  const stored = asStoredRecord(value);
  if (!stored) return { kind: 'unreadable' };

  const sessionId = typeof stored.sessionId === 'string' && stored.sessionId.length > 0
    ? stored.sessionId
    : undefined;

  const flagsReadable =
    typeof stored.growthApplied === 'boolean' &&
    typeof stored.workoutRecordSaved === 'boolean' &&
    typeof stored.rewardsSaved === 'boolean';

  if (
    stored.version !== 1 ||
    sessionId === undefined ||
    asStoredDateString(stored.completedAt) === undefined ||
    !flagsReadable ||
    asStoredRecord(stored.snapshot) === null
  ) {
    return { kind: 'unreadable', sessionId };
  }

  return { kind: 'usable', receipt: stored as unknown as SessionCompletionReceipt };
}

/**
 * 저장된 성장 상태를 **migrate에 넘기기 전에** 모양만 다듬는다.
 *
 * `migrateGrowthState()`는 빠진 필드는 잘 채우지만, **있는데 타입이 다른 값**은 그대로
 * 통과시킨다. 실제로 세 가지가 새어 나갔다(직접 실행해 확인했다):
 *  - `totalWorkoutSp: "abc"` → `Math.max(0, "abc")` = **NaN**. 그 NaN이 다음 운동에서
 *    그대로 다시 저장돼 사용자의 누적 SP가 영구히 망가진다.
 *  - `daily.spByMuscle: "..."` → 문자열이 그대로 남아 홈의 `Object.entries`가 엉뚱한
 *    부위 키를 만들고, 합계가 NaN이 된다.
 *  - `daily.date: 20260826` → 숫자가 날짜 자리에 남아 "오늘인가" 비교가 영원히 어긋난다.
 *
 * 그래서 **읽는 경계에서** 걸러낸다. 성장 계산 자체는 건드리지 않는다 — 여기서 하는 일은
 * "읽을 수 없는 필드는 없는 값으로 만든다"뿐이고, 그러면 migrate의 기존 기본값 규칙이
 * 그대로 적용된다(예: totalWorkoutSp가 없으면 부위 합계로 다시 만든다).
 *
 * 검증 가능한 순수 함수다 (scripts/verify-storage-recovery.ts).
 */
export function asStoredGrowthState(value: unknown): Record<string, unknown> | null {
  const stored = asStoredRecord(value);
  if (!stored) return null;

  const normalized: Record<string, unknown> = { ...stored };

  // 있는데 셀 수 없는 값이면 지운다 — 0으로 덮지 않는다. 지워야 migrate가 부위 합계로
  // 되살린다(0으로 덮으면 멀쩡한 부위 SP가 있는데 총합만 0인 상태가 저장된다).
  if (asStoredCount(stored.totalWorkoutSp, -1) < 0) delete normalized.totalWorkoutSp;

  const daily = asStoredRecord(stored.daily);
  const dailyDate = daily ? asStoredDateString(daily.date) : undefined;
  const dailySpByMuscle = daily ? asStoredRecord(daily.spByMuscle) : null;

  if (dailyDate === undefined || dailySpByMuscle === null) {
    // 오늘 집계를 읽을 수 없으면 통째로 버린다. migrate가 오늘 날짜의 빈 집계를 만든다 —
    // 하루치 표시가 비는 것이 손상된 값을 계속 들고 다니는 것보다 낫다.
    delete normalized.daily;
  } else {
    const spByMuscle: Record<string, number> = {};
    for (const [muscle, sp] of Object.entries(dailySpByMuscle)) {
      const count = asStoredCount(sp, -1);
      if (count >= 0) spByMuscle[muscle] = count;
    }
    normalized.daily = { date: dailyDate, spByMuscle };
  }

  return normalized;
}
