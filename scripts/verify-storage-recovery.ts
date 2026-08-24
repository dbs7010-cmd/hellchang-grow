import type { UserProfile } from '@/types/user';
import {
  asStoredArray,
  asStoredSession,
  isOnboardingComplete,
  isUsableProfile,
  parseStoredJson,
  resolveBootstrapScreen,
  resolveOnboardingState,
} from '@/utils/stored-state';

/**
 * STORAGE RECOVERY 검증 (FAILURE_LOG의 FAIL-008).
 *
 * 확인하는 것은 "저장값이 깨졌을 때 앱이 빈 화면에 갇히지 않고, 그러면서도 멀쩡한 사용자
 * 데이터를 덮어쓰지 않는가"다. 여기서 도는 것은 전부 순수 함수다 — AsyncStorage가 필요한
 * 부분(repository의 실제 read/write)은 돌리지 않는다. repository와 부팅 경로가 이 함수들을
 * 그대로 호출하므로, 판정 규칙 자체는 여기서 검증된다.
 */

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const profile = (input: Partial<UserProfile> = {}): UserProfile =>
  ({
    genderExpression: 'male',
    bodyPresetId: 'average',
    weightKg: 70,
    bodyParameters: { size: 0.5, tone: 0.5 },
    ...input,
  }) as UserProfile;

// 1. 깨진 JSON은 "없는 값"이다
{
  expect('값이 없으면 null', parseStoredJson(null) === null);
  expect('쓰다 만 값(잘린 JSON)은 null', parseStoredJson('{"weightKg":7') === null);
  expect('JSON이 아닌 쓰레기는 null', parseStoredJson(' garbage') === null);
  expect("문자열 'undefined'도 null", parseStoredJson('undefined') === null);
  expect('빈 문자열도 null', parseStoredJson('') === null);
  expect('멀쩡한 객체는 그대로', (parseStoredJson('{"a":1}') as { a: number }).a === 1);
  expect('멀쩡한 배열은 그대로', (parseStoredJson('[1,2]') as number[]).length === 2);
  expect('null 리터럴은 null', parseStoredJson('null') === null);
  expect('false 리터럴은 보존된다 (없는 값과 구분)', parseStoredJson('false') === false);
}

// 2. 배열이 아닌 저장값
{
  expect('배열은 그대로', asStoredArray<number>([1, 2, 3]).length === 3);
  expect('빈 배열도 배열', asStoredArray<number>([]).length === 0);
  expect('배열 흉내를 낸 객체는 빈 배열', asStoredArray({ 0: 'a', length: 1 }).length === 0);
  expect('문자열은 빈 배열', asStoredArray('[]').length === 0);
  expect('숫자는 빈 배열', asStoredArray(3).length === 0);
  expect('null은 빈 배열', asStoredArray(null).length === 0);
  expect('undefined는 빈 배열', asStoredArray(undefined).length === 0);
  // readArray()가 실제로 도는 경로: 원문 -> parse -> 배열 판정
  expect('깨진 원문은 빈 배열', asStoredArray(parseStoredJson('[{"id":"a"')).length === 0);
  expect('객체로 저장된 원문은 빈 배열', asStoredArray(parseStoredJson('{"records":[]}')).length === 0);
  expect('정상 원문은 항목을 보존한다', asStoredArray(parseStoredJson('[{"id":"a"},{"id":"b"}]')).length === 2);
}

// 3. 온보딩 플래그는 정확히 true일 때만 완료
{
  expect('true만 완료', isOnboardingComplete(true));
  expect('false는 미완료', !isOnboardingComplete(false));
  expect("문자열 'true'는 미완료", !isOnboardingComplete('true'));
  expect('숫자 1은 미완료', !isOnboardingComplete(1));
  expect('객체는 미완료', !isOnboardingComplete({}));
  expect('빈 배열은 미완료', !isOnboardingComplete([]));
  expect('null은 미완료', !isOnboardingComplete(null));
  expect('undefined는 미완료', !isOnboardingComplete(undefined));
  expect('깨진 원문은 미완료', !isOnboardingComplete(parseStoredJson('tru')));
}

// 4. 잘못된 프로필은 "프로필 없음"으로 다룬다
{
  expect('정상 프로필은 통과', isUsableProfile(profile()));
  expect('null은 프로필 아님', !isUsableProfile(null));
  expect('undefined는 프로필 아님', !isUsableProfile(undefined));
  expect('배열은 프로필 아님', !isUsableProfile([]));
  expect('문자열은 프로필 아님', !isUsableProfile('profile'));
  expect('bodyParameters가 없으면 프로필 아님', !isUsableProfile({ ...profile(), bodyParameters: undefined }));
  expect('bodyParameters가 null이면 프로필 아님', !isUsableProfile({ ...profile(), bodyParameters: null }));
  expect('size가 없으면 프로필 아님', !isUsableProfile({ ...profile(), bodyParameters: { tone: 0.5 } }));
  expect(
    'size가 NaN이면 프로필 아님',
    !isUsableProfile({ ...profile(), bodyParameters: { size: NaN, tone: 0.5 } })
  );
  expect(
    'tone이 NaN이면 프로필 아님',
    !isUsableProfile({ ...profile(), bodyParameters: { size: 0.5, tone: NaN } })
  );
  expect('weightKg가 문자열이면 프로필 아님', !isUsableProfile({ ...profile(), weightKg: '70' }));
  expect('weightKg가 NaN이면 프로필 아님', !isUsableProfile({ ...profile(), weightKg: NaN }));
  expect('genderExpression이 없으면 프로필 아님', !isUsableProfile({ ...profile(), genderExpression: undefined }));
  expect('bodyPresetId가 숫자면 프로필 아님', !isUsableProfile({ ...profile(), bodyPresetId: 123 }));
  expect('여분 필드가 있어도 통과', isUsableProfile({ ...profile(), heightCm: 175 }));
  expect('깨진 원문은 프로필 아님', !isUsableProfile(parseStoredJson('{"weightKg":7')));
  expect('정상 원문은 프로필', isUsableProfile(parseStoredJson(JSON.stringify(profile()))));
}

// 5. 온보딩 상태: 기존 데이터를 덮어쓰지 않는 경계
{
  const flagAndProfile = resolveOnboardingState(true, profile());
  expect('플래그와 프로필이 모두 있으면 완료', flagAndProfile.onboardingComplete);
  expect('그때는 저장할 것이 없다', !flagAndProfile.shouldPersistFlag);

  // 플래그는 있는데 프로필이 없다(손상/삭제) -> 빈 홈 화면에 갇히지 않도록 온보딩으로
  const flagOnly = resolveOnboardingState(true, null);
  expect('플래그만 있고 프로필이 없으면 미완료', !flagOnly.onboardingComplete);
  expect('플래그만 있을 때 플래그를 다시 쓰지 않는다', !flagOnly.shouldPersistFlag);

  // 온보딩이 생기기 전 사용자: 플래그가 없어도 프로필이 있으면 완료로 본다
  const legacy = resolveOnboardingState(false, profile());
  expect('플래그 없이 프로필이 있으면 완료 (기존 사용자 보호)', legacy.onboardingComplete);
  expect('그때만 플래그를 보강한다', legacy.shouldPersistFlag);

  const legacyNoWeight = resolveOnboardingState(false, profile({ weightKg: 0 }));
  expect('체중이 0이면 완료로 보지 않는다', !legacyNoWeight.onboardingComplete);
  expect('체중이 0이면 플래그도 쓰지 않는다', !legacyNoWeight.shouldPersistFlag);

  const fresh = resolveOnboardingState(false, null);
  expect('신규 사용자는 미완료', !fresh.onboardingComplete);
  expect('신규 사용자에게 플래그를 쓰지 않는다', !fresh.shouldPersistFlag);

  // 깨진 저장값으로 들어온 조합 - repository가 이미 걸러 주지만 규칙 자체도 안전해야 한다
  const corrupted = resolveOnboardingState(isOnboardingComplete(parseStoredJson('{}')), null);
  expect('깨진 플래그에 프로필도 없으면 미완료', !corrupted.onboardingComplete);
  expect('깨진 플래그로 플래그를 쓰지 않는다', !corrupted.shouldPersistFlag);
}

// 6. 부팅 실패 화면 / 다시 시도
{
  const booting = { loading: true, bootstrapFailed: false, onboardingComplete: false };
  expect('읽는 중이면 스플래시', resolveBootstrapScreen(booting) === 'splash');

  const failed = { loading: false, bootstrapFailed: true, onboardingComplete: false };
  expect('부팅 실패면 복구 화면', resolveBootstrapScreen(failed) === 'recovery');
  expect(
    '부팅 실패면 온보딩을 열지 않는다 (완료 여부와 무관)',
    resolveBootstrapScreen({ ...failed, onboardingComplete: true }) === 'recovery'
  );
  expect(
    '읽는 중이면 실패 표시보다 스플래시가 먼저',
    resolveBootstrapScreen({ loading: true, bootstrapFailed: true, onboardingComplete: false }) === 'splash'
  );

  const ok = { loading: false, bootstrapFailed: false, onboardingComplete: true };
  expect('정상 부팅이면 네비게이터', resolveBootstrapScreen(ok) === 'navigator');
  expect(
    '온보딩 미완료 여부는 네비게이터 안에서 갈린다',
    resolveBootstrapScreen({ ...ok, onboardingComplete: false }) === 'navigator'
  );

  // reloadAppData(): loading=true, bootstrapFailed=false로 되돌린 뒤 다시 읽는다
  const retrying = { loading: true, bootstrapFailed: false, onboardingComplete: false };
  expect('[다시 시도] 직후에는 스플래시', resolveBootstrapScreen(retrying) === 'splash');
  expect(
    '다시 읽어 성공하면 네비게이터로 나간다',
    resolveBootstrapScreen({ ...retrying, loading: false }) === 'navigator'
  );
  expect(
    '다시 읽어도 실패하면 복구 화면에 머문다',
    resolveBootstrapScreen({ loading: false, bootstrapFailed: true, onboardingComplete: false }) === 'recovery'
  );
}

// 7. 손상은 그 키 하나로 격리된다
{
  const brokenProfile = parseStoredJson('{"weightKg":7');
  const records = asStoredArray(parseStoredJson('[{"id":"r1"},{"id":"r2"}]'));
  expect('프로필이 깨져도 운동 기록은 남는다', !isUsableProfile(brokenProfile) && records.length === 2);

  const okProfile = parseStoredJson(JSON.stringify(profile()));
  expect(
    '기록이 깨져도 프로필은 남는다',
    isUsableProfile(okProfile) && asStoredArray(parseStoredJson('[{"id"')).length === 0
  );
}

// 8. 진행 중이던 세션: 앱이 kill된 뒤 다시 켰을 때
{
  const session = (input: Record<string, unknown> = {}) => ({
    id: 's1',
    startedAt: '2026-08-25T10:00:00.000Z',
    createdAt: '2026-08-25T10:00:00.000Z',
    status: 'active',
    primaryCategory: 'weight',
    accumulatedSeconds: 120,
    exercises: [{ id: 'e1', exerciseId: 'bench', exerciseName: '벤치프레스', sets: [] }],
    ...input,
  });

  const ok = asStoredSession(session());
  expect('정상 세션은 그대로 복구된다', ok?.id === 's1' && ok?.status === 'active');
  expect('운동 목록이 보존된다', ok?.exercises.length === 1);
  expect('누적 시간이 보존된다', ok?.accumulatedSeconds === 120);

  // 세션이라고 볼 수 없는 값은 버린다 - 이 상태로는 어떤 화면도 그릴 수 없다
  expect('null은 세션 아님', asStoredSession(null) === null);
  expect('배열은 세션 아님', asStoredSession([]) === null);
  expect('문자열은 세션 아님', asStoredSession('session') === null);
  expect('id가 없으면 세션 아님', asStoredSession(session({ id: undefined })) === null);
  expect('id가 빈 문자열이면 세션 아님', asStoredSession(session({ id: '' })) === null);
  expect('startedAt이 없으면 세션 아님', asStoredSession(session({ startedAt: undefined })) === null);
  expect('createdAt이 없으면 세션 아님', asStoredSession(session({ createdAt: undefined })) === null);
  expect('status가 없으면 세션 아님', asStoredSession(session({ status: undefined })) === null);
  expect('모르는 status면 세션 아님', asStoredSession(session({ status: 'running' })) === null);
  expect('깨진 원문은 세션 아님', asStoredSession(parseStoredJson('{"id":"s1","stat')) === null);

  // 읽을 수 있는 세션은 살린다 - 진행 중이던 운동을 통째로 버리는 것이 더 나쁘다
  const noExercises = asStoredSession(session({ exercises: undefined }));
  expect('exercises가 없는 옛 세션도 복구된다', noExercises !== null);
  expect('그때 exercises는 빈 배열이다', noExercises?.exercises.length === 0);

  const brokenExercises = asStoredSession(session({ exercises: { 0: 'x' } }));
  expect('exercises가 배열이 아니어도 세션은 살아남는다', brokenExercises !== null);
  expect('배열이 아닌 exercises는 빈 배열로 읽는다', brokenExercises?.exercises.length === 0);

  const brokenSets = asStoredSession(
    session({ exercises: [{ id: 'e1', exerciseId: 'bench', exerciseName: '벤치', sets: null }] })
  );
  expect('세트 목록이 깨져도 운동은 남는다', brokenSets?.exercises.length === 1);
  expect('깨진 세트 목록은 빈 배열로 읽는다', brokenSets?.exercises[0].sets.length === 0);

  const nanSeconds = asStoredSession(session({ accumulatedSeconds: NaN }));
  expect('누적 시간이 NaN이면 0으로 읽는다', nanSeconds?.accumulatedSeconds === 0);
  const stringSeconds = asStoredSession(session({ accumulatedSeconds: '120' }));
  expect('누적 시간이 문자열이면 0으로 읽는다', stringSeconds?.accumulatedSeconds === 0);

  // kill 복구에 필요한 표시들은 손대지 않는다 (recoverStaleSession / resumeIfRecentBackground의 입력)
  const killed = asStoredSession(
    session({ lastHeartbeatMs: 1_800_000, activeSince: '2026-08-25T10:02:00.000Z' })
  );
  expect('lastHeartbeatMs는 그대로 전달된다', killed?.lastHeartbeatMs === 1_800_000);
  expect('activeSince는 그대로 전달된다', killed?.activeSince === '2026-08-25T10:02:00.000Z');
  const backgrounded = asStoredSession(
    session({ status: 'paused', pausedByAppBackground: true, pausedAtMs: 1_800_000 })
  );
  expect('자동 일시정지 표시가 보존된다', backgrounded?.pausedByAppBackground === true);
  expect('일시정지 시각이 보존된다', backgrounded?.pausedAtMs === 1_800_000);
  expect('완료된 세션도 그대로 읽는다 (완료 파이프라인이 판단한다)',
    asStoredSession(session({ status: 'completed' }))?.status === 'completed');

  // 읽기는 저장된 값을 바꾸지 않는다
  const stored = session({ exercises: undefined });
  asStoredSession(stored);
  expect('읽어도 저장 원본은 그대로다', !('exercises' in stored) || stored.exercises === undefined);
}

/*
 * 여기서 자동으로 덮지 못하는 것 — 재현 가능한 수동 절차 (DEC-008의 우선순위 3).
 *
 * 실기기 kill 복구: 위 검증은 "저장된 값이 어떤 모양이든 앱이 안전하게 읽는가"까지다.
 * 실제 iOS/Android가 백그라운드에서 앱을 죽이는 시점과 그때 마지막 저장 상태는 순수 함수로
 * 재현할 수 없다. 실기기에서 확인할 때는 다음 순서를 그대로 따른다.
 *
 *   1. 운동을 시작하고 세트를 한 개 이상 완료한다 (저장이 일어난다).
 *   2. 타이머가 도는 것을 확인하고 시각을 적어 둔다.
 *   3. 앱을 백그라운드로 보내고 앱 전환기에서 강제 종료한다.
 *   4. 30분 이상 기다린 뒤 앱을 다시 켠다.
 *   5. 확인: 세션이 남아 있고, 상태가 [일시정지]이며, 경과 시간에 방치된 30분이 더해져
 *      있지 않다(= 마지막 heartbeat까지만 계산된다). 기록해 둔 세트도 그대로 있다.
 *   6. 다시 [재개]하고 종료하면 그 시간만 기록에 남는다.
 *
 * 짧은 전환(2번 뒤 30초 안에 복귀)은 [재개]를 누르지 않아도 자동으로 이어져야 한다.
 * 순수 규칙 쪽 근거는 verify:session의 recoverStaleSession / resumeIfRecentBackground에 있다.
 */

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
