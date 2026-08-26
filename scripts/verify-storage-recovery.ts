import type { UserProfile } from '@/types/user';
import type { BodyHistoryEntry } from '@/types/body';
import { buildHistoryDays, latestBodyEntry, sortBodyHistoryNewestFirst } from '@/utils/history';
import { buildStoredPhotoName, photoFileExtension } from '@/utils/photo-file';
import {
  asStoredArray,
  asStoredCount,
  asStoredDateString,
  asStoredFlag,
  asStoredRecord,
  asStoredSession,
  asStoredText,
  classifyStoredReceipt,
  classifyStoredReceiptRaw,
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

// 9. 상태 저장소의 작은 조각들 - 숫자/날짜/참거짓
{
  expect('객체가 아니면 저장된 것이 없다', asStoredRecord('{}') === null);
  expect('배열도 상태 객체가 아니다', asStoredRecord([]) === null);
  expect('null도 아니다', asStoredRecord(null) === null);
  expect('객체는 그대로', asStoredRecord({ xp: 1 })?.xp === 1);

  // 개수/포인트: 0 이상의 실제 숫자만
  expect('정상 숫자는 그대로', asStoredCount(7) === 7);
  expect('0도 유효하다', asStoredCount(0) === 0);
  expect('문자열 숫자는 기본값 (연속 기록이 "5"+1="51"이 되지 않는다)', asStoredCount('5') === 0);
  expect('NaN은 기본값 (화면 숫자가 NaN이 되지 않는다)', asStoredCount(NaN) === 0);
  expect('Infinity는 기본값', asStoredCount(Infinity) === 0);
  expect('음수는 기본값', asStoredCount(-3) === 0);
  expect('null은 기본값', asStoredCount(null) === 0);
  expect('없으면 기본값', asStoredCount(undefined) === 0);
  expect('객체는 기본값', asStoredCount({}) === 0);
  expect('기본값을 지정할 수 있다', asStoredCount('x', 10) === 10);

  // 참/거짓
  expect('true만 참', asStoredFlag(true));
  expect("문자열 'true'는 참이 아니다", !asStoredFlag('true'));
  expect('1은 참이 아니다', !asStoredFlag(1));
  expect('객체는 참이 아니다', !asStoredFlag({}));

  // 날짜 문자열
  expect('ISO 문자열은 그대로', asStoredDateString('2026-08-25T00:00:00.000Z') === '2026-08-25T00:00:00.000Z');
  expect('날짜만 있는 문자열도 읽을 수 있다', asStoredDateString('2026-08-25') === '2026-08-25');
  expect('읽을 수 없는 날짜는 없는 값 (Invalid Date를 만들지 않는다)', asStoredDateString('내일') === undefined);
  expect('숫자는 날짜 문자열이 아니다', asStoredDateString(1_800_000_000_000) === undefined);
  expect('빈 문자열은 없는 값', asStoredDateString('') === undefined);
  expect('null은 없는 값', asStoredDateString(null) === undefined);

  // 문자열
  expect('문자열은 그대로', asStoredText('ABC123') === 'ABC123');
  expect('숫자는 문자열이 아니다', asStoredText(123) === undefined);
  expect('객체는 문자열이 아니다', asStoredText({}) === undefined);
}

// 10. 상태 저장소가 실제로 읽는 모양 (repository들이 위 조각을 그대로 조합한다)
{
  const readStreak = (value: unknown) => {
    const stored = asStoredRecord(value);
    if (!stored) return { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false };
    return {
      currentStreakDays: asStoredCount(stored.currentStreakDays),
      longestStreakDays: asStoredCount(stored.longestStreakDays),
      lastRecordDate: asStoredDateString(stored.lastRecordDate),
      rewardClaimed: asStoredFlag(stored.rewardClaimed),
    };
  };
  const healthy = readStreak({
    currentStreakDays: 5,
    longestStreakDays: 9,
    lastRecordDate: '2026-08-24',
    rewardClaimed: true,
  });
  expect('멀쩡한 streak은 그대로 읽힌다', healthy.currentStreakDays === 5 && healthy.longestStreakDays === 9);
  expect('마지막 기록 날짜가 보존된다', healthy.lastRecordDate === '2026-08-24');
  expect('보상 수령 표시가 보존된다', healthy.rewardClaimed === true);

  const corrupted = readStreak({ currentStreakDays: '5', longestStreakDays: NaN, lastRecordDate: 42 });
  expect('문자열 연속 일수는 0으로 읽는다', corrupted.currentStreakDays === 0);
  expect('NaN 최장 기록도 0으로 읽는다', corrupted.longestStreakDays === 0);
  expect('숫자로 저장된 날짜는 없는 값', corrupted.lastRecordDate === undefined);
  expect('그 뒤 +1을 해도 숫자로 남는다', corrupted.currentStreakDays + 1 === 1);

  // 이용권: 깨진 값으로 유료 기능이 열리지 않는다
  const readUses = (value: unknown) =>
    asStoredCount(asStoredRecord(value)?.rewardedPtUsesRemaining);
  expect('정상 이용권은 그대로', readUses({ rewardedPtUsesRemaining: 2 }) === 2);
  expect('문자열 이용권으로 AI PT가 열리지 않는다', !(readUses({ rewardedPtUsesRemaining: '5' }) > 0));
  expect('true로도 열리지 않는다', !(readUses({ rewardedPtUsesRemaining: true }) > 0));
  expect('깨진 원문으로도 열리지 않는다', !(readUses(parseStoredJson('{"rewardedPtUses')) > 0));

  // PASS xp: 레벨 계산이 NaN이 되지 않는다
  const readXp = (value: unknown) => asStoredCount(asStoredRecord(value)?.xp);
  expect('정상 xp는 그대로', readXp({ xp: 250 }) === 250);
  expect('NaN xp는 0으로 읽는다', Number.isFinite(readXp({ xp: NaN })));
  expect('문자열 xp도 숫자로 읽힌다', Number.isFinite(readXp({ xp: '250' })));

  // 이벤트 패스 만료: new Date(...).toISOString()이 던지지 않는다
  const readExpiry = (value: unknown) => asStoredDateString(asStoredRecord(value)?.expiresAt);
  const broken = readExpiry({ active: true, expiresAt: 'soon' });
  expect('읽을 수 없는 만료 시각은 없는 값', broken === undefined);
  const usable = readExpiry({ active: true, expiresAt: '2026-09-01T00:00:00.000Z' });
  expect('읽을 수 있는 만료 시각은 보존된다', usable === '2026-09-01T00:00:00.000Z');
  expect(
    '보존된 값으로 날짜 계산이 던지지 않는다',
    !Number.isNaN(new Date(usable as string).getTime())
  );
}

// 11. 완료 receipt: 중복 지급보다 지연이 낫다 (DEC-010)
{
  const receipt = (input: Record<string, unknown> = {}) => ({
    version: 1,
    sessionId: 'sess-1',
    completedAt: '2026-08-25T11:00:00.000Z',
    growthApplied: true,
    workoutRecordSaved: false,
    rewardsSaved: false,
    snapshot: { durationMinutes: 42 },
    ...input,
  });

  expect('저장된 것이 없으면 none', classifyStoredReceipt(null).kind === 'none');
  expect('undefined도 none', classifyStoredReceipt(undefined).kind === 'none');

  const usable = classifyStoredReceipt(receipt());
  expect('모든 단계 표시를 읽을 수 있으면 usable', usable.kind === 'usable');
  expect(
    '단계 표시가 그대로 보존된다',
    usable.kind === 'usable' && usable.receipt.growthApplied === true && usable.receipt.rewardsSaved === false
  );

  // 믿을 수 없는 값 - 버리지도 진행하지도 않는다
  const cases: [string, unknown][] = [
    ['버전이 다르면', receipt({ version: 2 })],
    ['버전이 없으면', receipt({ version: undefined })],
    ['sessionId가 없으면', receipt({ sessionId: undefined })],
    ['sessionId가 빈 문자열이면', receipt({ sessionId: '' })],
    ['완료 시각을 읽을 수 없으면', receipt({ completedAt: 'soon' })],
    ['단계 표시가 문자열이면', receipt({ growthApplied: 'true' })],
    ['단계 표시가 숫자면', receipt({ workoutRecordSaved: 1 })],
    ['단계 표시가 없으면', receipt({ rewardsSaved: undefined })],
    ['snapshot이 없으면', receipt({ snapshot: undefined })],
    ['snapshot이 배열이면', receipt({ snapshot: [] })],
    ['객체가 아니면', 'receipt'],
    ['배열이면', []],
  ];
  for (const [name, value] of cases) {
    expect(`${name} unreadable`, classifyStoredReceipt(value).kind === 'unreadable');
  }
  // 원문 수준: 파싱 실패를 "없는 값"으로 접으면 안 된다 - 잘린 뒤에 무엇이 반영됐는지 모른다
  expect('저장된 원문이 없으면 none', classifyStoredReceiptRaw(null).kind === 'none');
  expect('잘린 원문은 unreadable', classifyStoredReceiptRaw('{"version":1,"sess').kind === 'unreadable');
  expect('JSON이 아닌 원문도 unreadable', classifyStoredReceiptRaw('garbage').kind === 'unreadable');
  expect('멀쩡한 원문은 usable', classifyStoredReceiptRaw(JSON.stringify(receipt())).kind === 'usable');
  expect(
    '원문이 다른 세션의 잘린 값이어도 판정은 unreadable이다 (호출부가 sessionId로 거른다)',
    classifyStoredReceiptRaw('{"sessionId":"sess-0"').kind === 'unreadable'
  );

  // 읽을 수 있는 sessionId는 함께 돌려준다 - 다른 세션의 잔해인지 호출부가 판단할 수 있게
  const brokenFlags = classifyStoredReceipt(receipt({ growthApplied: 'true' }));
  expect(
    'unreadable이어도 sessionId는 전달된다',
    brokenFlags.kind === 'unreadable' && brokenFlags.sessionId === 'sess-1'
  );
  const noId = classifyStoredReceipt(receipt({ sessionId: 42 }));
  expect('sessionId조차 읽을 수 없으면 비운다', noId.kind === 'unreadable' && noId.sessionId === undefined);

  // repository가 실제로 하는 판단 (같은 규칙을 여기서 다시 조합해 본다)
  const decide = (value: unknown, currentSessionId: string): 'fresh' | 'resume' | 'stop' => {
    const stored = classifyStoredReceipt(value);
    if (stored.kind === 'none') return 'fresh';
    if (stored.kind === 'usable') return 'resume';
    if (stored.sessionId !== undefined && stored.sessionId !== currentSessionId) return 'fresh';
    return 'stop';
  };
  expect('저장된 것이 없으면 처음부터', decide(null, 'sess-1') === 'fresh');
  expect('멀쩡한 receipt면 이어서', decide(receipt(), 'sess-1') === 'resume');
  expect(
    '같은 세션의 믿을 수 없는 receipt면 멈춘다 (중복 지급 금지)',
    decide(receipt({ growthApplied: 'true' }), 'sess-1') === 'stop'
  );
  expect(
    'sessionId를 못 읽으면 안전한 쪽으로 멈춘다',
    decide(receipt({ sessionId: 42 }), 'sess-1') === 'stop'
  );
  expect(
    '다른 세션의 잔해는 이번 완료를 막지 않는다',
    decide(receipt({ sessionId: 'sess-0', growthApplied: 'true' }), 'sess-1') === 'fresh'
  );
  expect(
    '멈춘 경우에도 저장값을 지우지 않는다 (판정은 읽기만 한다)',
    typeof classifyStoredReceipt === 'function' && classifyStoredReceipt.length === 1
  );
}

// 12. 사진 파일 이름 — 앱이 보관할 자리의 이름을 만든다
{
  expect('jpg 확장자를 읽는다', photoFileExtension('file:///tmp/IMG_0001.JPG') === 'jpg');
  expect('png도 읽는다', photoFileExtension('file:///tmp/shot.png') === 'png');
  expect('heic도 읽는다', photoFileExtension('file:///a/b/c.HEIC') === 'heic');
  expect('쿼리 문자열은 무시한다', photoFileExtension('file:///tmp/a.jpg?width=100') === 'jpg');
  expect('조각(#)도 무시한다', photoFileExtension('file:///tmp/a.png#preview') === 'png');
  expect('확장자가 없으면 jpg', photoFileExtension('file:///tmp/IMG_0001') === 'jpg');
  expect('점으로 시작하는 이름은 확장자가 아니다', photoFileExtension('file:///tmp/.hidden') === 'jpg');
  expect('이상하게 긴 확장자는 jpg', photoFileExtension('file:///tmp/a.somethingweird') === 'jpg');
  expect('경로 없이 와도 동작한다', photoFileExtension('photo.jpeg') === 'jpeg');

  expect('파일 이름은 기록 id로 만든다', buildStoredPhotoName('file:///tmp/a.jpg', 'body-123') === 'body-123.jpg');
  expect(
    '파일 이름에 쓸 수 없는 문자는 빠진다',
    buildStoredPhotoName('file:///tmp/a.png', 'body/../123') === 'body123.png'
  );
  expect('id가 전부 걸러져도 이름이 남는다', buildStoredPhotoName('file:///tmp/a.jpg', '../..') === 'photo.jpg');
  expect(
    '같은 기록이면 같은 이름이다 (사진 하나당 기록 하나)',
    buildStoredPhotoName('file:///tmp/one.jpg', 'body-1') === buildStoredPhotoName('file:///tmp/two.jpg', 'body-1')
  );
  expect(
    '다른 기록이면 다른 이름이다',
    buildStoredPhotoName('file:///tmp/a.jpg', 'body-1') !== buildStoredPhotoName('file:///tmp/a.jpg', 'body-2')
  );
}

// 13. 신체 기록 순서 — 방금 넣은 값이 "지금 몸"이어야 한다
{
  const entry = (id: string, date: string, extra: Partial<BodyHistoryEntry> = {}): BodyHistoryEntry =>
    ({ id, date, weightKg: 78, source: 'manual', ...extra }) as BodyHistoryEntry;

  // 저장소는 새 기록을 맨 앞에 붙인 뒤 정렬한다 — 그 순서를 그대로 재현한다.
  const older = entry('b1', '2026-08-25', { weightKg: 78 });
  const newer = entry('b2', '2026-08-25', { weightKg: 77.4, bodyFatPercent: 17.2 });
  const sorted = sortBodyHistoryNewestFirst([newer, older]);
  expect('같은 날짜면 나중에 넣은 기록이 앞에 온다', sorted[0].id === 'b2');
  expect('...그리고 옛 기록이 사라지지 않는다', sorted.length === 2 && sorted[1].id === 'b1');
  expect('가장 최근 기록이 방금 넣은 값이다', latestBodyEntry([newer, older])?.weightKg === 77.4);
  expect(
    '처음 넣은 체지방률이 최신 값으로 잡힌다',
    latestBodyEntry([newer, older])?.bodyFatPercent === 17.2
  );

  const yesterday = entry('b0', '2026-08-24', { weightKg: 79 });
  const mixed = sortBodyHistoryNewestFirst([yesterday, newer, older]);
  expect('날짜가 다르면 최신 날짜가 먼저다', mixed[0].date === '2026-08-25');
  expect('...같은 날짜 안에서는 넣은 순서를 지킨다', [mixed[0].id, mixed[1].id].join() === 'b2,b1');
  expect('...옛 날짜는 뒤로 간다', mixed[2].id === 'b0');

  expect('기록이 없으면 null', latestBodyEntry([]) === null);
  expect('입력 배열을 바꾸지 않는다', (() => {
    const input = [older, newer];
    sortBodyHistoryNewestFirst(input);
    return input[0].id === 'b1';
  })());

  // 저장소가 실제로 하는 일: 새 기록을 맨 앞에 붙이고 정렬한다. 화면은 이 배열을 그대로 읽는다.
  const saveEntry = (stored: BodyHistoryEntry[], added: BodyHistoryEntry) =>
    sortBodyHistoryNewestFirst([added, ...stored]);

  const afterOnboarding = saveEntry([], older);
  const afterSecondToday = saveEntry(afterOnboarding, newer);
  expect('저장 직후 방금 넣은 기록이 첫 항목이다', afterSecondToday[0].id === 'b2');
  expect('화면이 읽는 "지금 몸"도 그 값이다', latestBodyEntry(afterSecondToday)?.weightKg === 77.4);

  // 히스토리 화면의 날짜별 뷰도 같은 배열을 쓴다
  const days = buildHistoryDays(saveEntry(afterSecondToday, entry('b0', '2026-08-24', {})), []);
  expect('하루를 대표하는 기록은 그날 마지막에 넣은 것', days[0].bodyEntry?.id === 'b2');
  expect('날짜는 최신순으로 나온다', days.map((d) => d.date).join() === '2026-08-25,2026-08-24');

  const withPhoto = entry('b3', '2026-08-25', { photoReference: 'file:///p.jpg', source: 'photo' });
  const dayWithPhoto = buildHistoryDays(saveEntry([older], withPhoto), [])[0];
  expect('그날 사진이 하나라도 있으면 사진 있는 날이다', dayWithPhoto.hasPhoto);
  expect('사진 없는 최신 기록이 그날을 대표해도 사진 표시는 남는다', dayWithPhoto.bodyEntry?.id === 'b3');
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
 *
 * 사진 보관: 사진을 넣은 신체 기록을 만든 뒤, 앱을 지우지 않은 채 며칠 두었다가 [몸 변화]에서
 * 다시 열어 사진이 그대로 있는지 본다. 복사가 실패하는 기기가 있다면 그때는 기록만 남고
 * 사진 자리가 비어야 한다 — 기록 저장 자체가 실패해서는 안 된다.
 * 순수 규칙 쪽 근거는 verify:session의 recoverStaleSession / resumeIfRecentBackground에 있다.
 */

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
