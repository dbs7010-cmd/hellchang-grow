import appJson from '../app.json' with { type: 'json' };
import easJson from '../eas.json' with { type: 'json' };
import packageJson from '../package.json' with { type: 'json' };

/**
 * RELEASE CONFIG 검증 ([RELEASE_AUDIT.md] A1 / A2 / B1 / B3, [DECISION_LOG.md] DEC-003).
 *
 * 출시 설정은 한 번 맞춰 놓으면 잊어버리는 종류다. 그런데 여기가 틀어지면 알아채는 시점이
 * **스토어 심사**다 — 식별자가 비면 빌드가 안 되고, 권한이 하나 늘면 데이터 안전 답변이
 * 거짓이 되고, 광고 SDK가 조용히 들어오면 개인정보처리방침이 사실과 달라진다.
 *
 * 그래서 사람이 눈으로 지키던 것을 명령 하나로 바꾼다. 여기서 읽는 것은 저장소의 정적
 * 파일(app.json / eas.json / package.json)뿐이다. 플러그인이 최종적으로 만들어 내는
 * 네이티브 설정까지 보려면 `npx expo config --type public`을 따로 돌린다.
 */

const APP_ID = 'com.helchanggrow.app';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const app = appJson.expo as Record<string, any>;
const eas = easJson as Record<string, any>;
const pkg = packageJson as Record<string, any>;

/** 값 안에 특정 문자열이 있는지 — 권한 이름처럼 "어디에도 없어야 하는" 것을 찾을 때 쓴다. */
const appJsonText = JSON.stringify(appJson);

// 1. 앱 식별자 — 스토어에 한 번 올리면 바꿀 수 없다
{
  expect('iOS 번들 식별자가 있다', typeof app.ios?.bundleIdentifier === 'string');
  expect('Android 패키지 이름이 있다', typeof app.android?.package === 'string');
  expect('두 식별자가 승인된 값과 같다', app.ios?.bundleIdentifier === APP_ID && app.android?.package === APP_ID);
  expect('iOS와 Android가 같은 식별자를 쓴다', app.ios?.bundleIdentifier === app.android?.package);
  expect('slug이 있다 (EAS 프로젝트 연결에 쓰인다)', typeof app.slug === 'string' && app.slug.length > 0);
  expect('딥링크 scheme이 있다', typeof app.scheme === 'string' && app.scheme.length > 0);
}

// 2. 버전/빌드 번호 — 같은 번호로 두 번 올릴 수 없다
{
  expect('버전 문자열이 있다', typeof app.version === 'string' && /^\d+\.\d+\.\d+$/.test(app.version));
  expect('Android versionCode가 1 이상의 정수다', Number.isInteger(app.android?.versionCode) && app.android.versionCode >= 1);
  expect('iOS buildNumber가 문자열이다', typeof app.ios?.buildNumber === 'string' && app.ios.buildNumber.length > 0);
}

// 3. 권한 — 쓰지 않는 권한이 조용히 되살아나지 않게 한다
{
  expect('app.json 어디에도 RECORD_AUDIO가 없다', !appJsonText.includes('RECORD_AUDIO'));

  const pickerPlugin = (app.plugins ?? []).find(
    (entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-image-picker'
  ) as [string, Record<string, unknown>] | undefined;

  expect('expo-image-picker 플러그인 설정이 있다', pickerPlugin !== undefined);
  expect('마이크 권한을 명시적으로 막았다', pickerPlugin?.[1]?.microphonePermission === false);
  expect('카메라 권한을 명시적으로 막았다', pickerPlugin?.[1]?.cameraPermission === false);
  expect(
    '사진 접근 사유 문구가 비어 있지 않다 (iOS 심사에서 요구한다)',
    typeof pickerPlugin?.[1]?.photosPermission === 'string' &&
      (pickerPlugin[1].photosPermission as string).trim().length > 0
  );
}

// 4. EAS 빌드 프로필 — 이 파일이 없으면 스토어 바이너리를 만들 수 없다
{
  expect('빌드 프로필 세 개가 있다', ['development', 'preview', 'production'].every((p) => eas.build?.[p]));
  expect('버전 숫자의 원본이 저장소다', eas.cli?.appVersionSource === 'local');
  expect('preview는 내부 배포다', eas.build?.preview?.distribution === 'internal');
  expect('preview는 APK다 (설치해서 바로 확인하려고)', eas.build?.preview?.android?.buildType === 'apk');
  expect('production은 AAB다 (Play 업로드 형식)', eas.build?.production?.android?.buildType === 'app-bundle');
}

// 5. V1 경계 (DEC-003) — 여기가 바뀌면 개인정보처리방침과 스토어 답변도 함께 바뀌어야 한다
{
  const deps = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) });
  const has = (needle: string) => deps.some((name) => name.includes(needle));

  expect('광고 SDK가 없다', !has('admob') && !has('google-mobile-ads') && !has('applovin'));
  expect('인앱결제 SDK가 없다', !has('iap') && !has('in-app-purchases') && !has('revenuecat') && !has('purchases'));
  expect(
    'AI PT 엔드포인트가 app.json에 박혀 있지 않다',
    (app.extra as Record<string, unknown> | undefined)?.aiTrainerEndpointUrl === undefined
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
