# V1 RELEASE AUDIT

> 2026-08-25 · branch `feat/v1-monetization-foundation` · 기준 커밋 `a14419d`
> **새 기능을 구현하지 않았다.** 저장소의 현재 상태만 조사하고 분류했다.
> 관련: [PROJECT_STATE.md](PROJECT_STATE.md) · [DECISION_LOG.md](DECISION_LOG.md) · [FAILURE_LOG.md](FAILURE_LOG.md)

## 방법

실행한 것과 실행하지 못한 것을 구분한다. 확인하지 못한 것은 **MANUAL QA**로 뺐고, 추측으로 판정하지 않았다.

| 실행 | 결과 |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| verify 스크립트 14종 | PASS (952 단언, FAIL 0) |
| `npx expo config --type public` | 해석된 설정 확인 (아래 A/B 항목의 근거) |
| `npx expo export --platform android` | **성공** — production JS 번들 `4.3MB` 생성, exit 0 |
| `npx expo-doctor` | 21개 중 20개 통과, 1개 실패(패치 버전 불일치 7개) |

확인하지 못한 것: 네이티브 빌드(EAS 계정 필요), 실기기 동작, 스토어 콘솔, 아이콘/스플래시의 시각적 최종 여부.
번들 안에서 mock 코드가 제거됐는지 문자열로 확인하려 했으나 **Hermes 바이트코드라 문자열 검색이 통하지 않았다**(반드시 있어야 할 문자열도 검색되지 않음). 따라서 mock 제외 근거는 소스의 `__DEV__` 경계와 `npm run verify:monetization`까지다.

## 요약

| 분류 | 개수 |
| --- | --- |
| A. 출시 차단 (BLOCKER) | 5 |
| B. 출시 전 필수 (REQUIRED) | 8 |
| C. 출시 후 가능 (POST-LAUNCH) | 6 |
| D. 이미 완료 (DONE) | 9 |
| E. MANUAL QA | 6 |

---

## A. 출시 차단 — 이것이 없으면 빌드/제출 자체가 불가능하다

| # | 항목 | 확인된 사실 | 필요한 것 |
| --- | --- | --- | --- |
| A1 | **앱 식별자 없음** | `app.json`에 `ios.bundleIdentifier`, `android.package`가 **둘 다 없다** | 식별자 확정(예: `com.<회사>.hellchanggrow`). 한 번 정하면 스토어에서 바꿀 수 없다 — 사용자 결정 |
| A2 | **EAS 빌드 설정 없음** | `eas.json` 파일이 없고, `.gitignore`가 `/ios` `/android`를 제외한다(관리형 워크플로) | `eas.json`(preview/production 프로필). 네이티브 프로젝트가 저장소에 없으므로 EAS 없이는 스토어 바이너리를 만들 수 없다 |
| A3 | **EAS 프로젝트 미연결** | 해석된 설정의 `extra`에 `eas.projectId`가 없고 `owner`도 없다 | `eas init`으로 프로젝트 연결 (Expo 계정 필요 — MANUAL) |
| A4 | **스토어 계정·서명 키 없음** | 저장소에서 확인 가능한 서명/자격 증명이 없다(정상 — 저장소에 두면 안 된다) | Google Play 개발자 계정, Apple Developer Program, 키스토어/배포 인증서 — **사용자만 가능** |
| A5 | **개인정보처리방침 없음** | `src` / `docs` / `README` 어디에도 개인정보·약관 문구나 링크가 없다 | 두 스토어 모두 제출 필수. 앱이 사진 라이브러리에 접근하므로 더더욱 필요 |

---

## B. 출시 전 필수 — 제출은 가능하지만 이대로 내면 문제가 된다

| # | 항목 | 확인된 사실 | 조치 |
| --- | --- | --- | --- |
| B1 | **쓰지 않는 마이크 권한이 붙는다** | 해석된 Android 권한에 `android.permission.RECORD_AUDIO`가 **유일한 권한으로** 들어 있다. 출처는 `expo-image-picker` 플러그인 기본값(`node_modules/expo-image-picker/plugin/build/withImagePicker.js`)이다. 앱에는 녹음 기능이 없다 | 플러그인 설정에 `microphonePermission: false` 추가. 불필요한 민감 권한은 Play 심사·데이터 안전 답변에서 바로 문제가 된다 |
| B2 | **앱 표시 이름이 개발용 슬러그** | `name: "hellchang-grow"` — 제품명 "헬창키우기"가 아니다 | 표시 이름/스토어 등재명 확정 |
| B3 | **버전 정책 없음** | `version: "1.0.0"`만 있고 `android.versionCode` / `ios.buildNumber`가 없다 | 빌드 번호 자동 증가(EAS `autoIncrement`) 또는 수동 정책 확정 |
| B4 | **선택한 사진이 나중에 사라질 수 있다** | `history.tsx`가 `ImagePicker`가 준 URI를 그대로 `photoReference`로 저장한다. 앱 전용 저장소로 복사하지 않는다(`FileSystem` 사용처 0건) | 선택 직후 앱 디렉터리로 복사하고 그 경로를 저장. 지금 구조에서는 며칠 뒤 [몸 변화] 전후 비교 사진이 깨질 수 있다 |
| B5 | **의존성 패치 버전 불일치 7개** | `expo-doctor`: `expo`, `expo-router`, `expo-image-picker`, `expo-splash-screen`, `expo-constants`, `expo-linking`, `@expo/ui` | `npx expo install --check`. **의존성 변경은 APPROVAL REQUIRED** |
| B6 | **쓰지 않는 네이티브 의존성 6개** | `src`에서 참조 0건: `expo-device`, `expo-symbols`, `expo-glass-effect`, `@expo/ui`, `expo-web-browser`, `expo-font` | 실제 미사용인지 확인 후 정리. 네이티브 모듈은 빌드 크기와 권한 표면을 늘린다. **의존성 변경은 APPROVAL REQUIRED** |
| B7 | **데이터 안전/개인정보 응답 미작성** | 앱이 수집하는 것: 사용자가 입력한 신체·운동 기록, 선택한 사진 — 전부 기기 로컬(AsyncStorage). 외부 전송은 AI PT 엔드포인트 하나뿐이고 현재 **설정돼 있지 않다**(`resolveTrainerEndpointUrl()` → null) | Play 데이터 안전 / Apple 개인정보 라벨 작성 — MANUAL. AI PT를 켜는 순간 "운동 기록이 서버로 전송됨"으로 답변이 바뀐다 |
| B8 | **크래시 리포팅 없음** | 저장소에 crash/analytics SDK가 없다 | 초기 사용자 문제를 볼 방법이 없다. 도입은 **의존성 추가 = APPROVAL REQUIRED** |

---

## C. 출시 후 가능

| # | 항목 | 상태 |
| --- | --- | --- |
| C1 | 실제 AI PT 연결 | 어댑터와 컨텍스트는 준비됨(`remote-trainer-service`). 연결은 `DEC-003` 결정 사항 |
| C2 | 광고 SDK / 인앱결제 연결 | 경계만 준비됨. 지금은 광고 보상이 아예 나가지 않는다(`FAIL-007` 참조) |
| C3 | 푸시 알림/리마인더 | 앱 안 알림 화면만 있고 `expo-notifications` 미설치 |
| C4 | AI 채팅 화면의 스탠리 이모지 | `ai-chat.tsx`만 이모지, 홈/트레이너 탭은 실제 초상 이미지를 쓴다 |
| C5 | 세트/PR 실제 애니메이션 클립 | 현재는 반동·확대 연출 |
| C6 | `README.md` | `create-expo-app` 템플릿 그대로 |

---

## D. 이미 완료 (근거 있음)

| # | 항목 | 근거 |
| --- | --- | --- |
| D1 | 운동 CORE(세션/타이머/세트/휴식/루틴) | `verify:session` 69, `verify:workout-core` 64, `verify:weight-core` 88 |
| D2 | 성장·신체 상태 파이프라인 | `verify:growth` 68, `verify:body` 87, `verify:growth-reveal` 64 |
| D3 | 세션 완료 idempotency + 손상 receipt 방침 | `verify:core-loop` 85, `DEC-010` |
| D4 | 저장값 손상 방어(모든 키) + 부팅 복구 | `verify:storage` 168, `FAIL-008` |
| D5 | 권리(entitlement) 단일 판정 + 만료 강제 | `verify:entitlement` 55, `DEC-005` |
| D6 | 광고 보상 경계(출시 빌드에 보상 어댑터 없음) | `verify:monetization` 39, `DEC-003`, `FAIL-007` |
| D7 | PR 두 종류(중량/횟수) | `verify:weight-core` 88, `DEC-011` |
| D8 | 캐릭터 CANON 렌더러 + 스탠리 초상 아트 | `verify:character-body` 32, `assets/characters/trainer/stanley_portrait.png`(홈·트레이너 탭에서 사용) |
| D9 | production JS 번들 생성 | `npx expo export --platform android` exit 0, 4.3MB |

---

## E. MANUAL QA — 저장소에서 확인할 수 없다

| # | 항목 | 방법 |
| --- | --- | --- |
| E1 | 세션 중 앱 kill 후 복구 | `scripts/verify-storage-recovery.ts` 하단 6단계 절차 |
| E2 | 아이콘/스플래시가 Expo 템플릿 기본인지 | `assets/images/`에 `react-logo*`, `expo-badge*` 등 템플릿 잔재가 함께 있다 — 실제 아이콘을 눈으로 확인 |
| E3 | 권한 다이얼로그 문구 | 사진 접근 요청 문구가 실기기에서 어떻게 보이는지 |
| E4 | 사진 URI 만료(B4) 재현 | 사진 등록 후 며칠 뒤 [몸 변화]에서 다시 열어 보기 |
| E5 | EAS preview 빌드 1회 성공 | A1~A3 해결 후 |
| E6 | 다양한 화면 크기/저사양 기기 | 세션 화면의 세트 입력·휴식 타이머 중심 |

---

## F. 조사 중 발견한 문서 오류 (이 커밋에서 정정)

`docs/ROADMAP.md`의 M3 현황 메모에 "트레이너 아트 **미완**"이라고 적었으나, 실제로는
`assets/characters/trainer/stanley_portrait.png`가 존재하고 홈·트레이너 탭이 이미 쓰고 있다
(`character-assets.ts`의 `StanleyPortraitImage`). 이모지가 남은 곳은 `ai-chat.tsx` 한 곳이다.
해당 줄을 사실에 맞게 고쳤다.

## G. 관찰 (조치 불필요)

- `PlayerCharacterAssets.home`이 `player_main.png`를 가리키지만, `PlayerCharacter`는 `bodyParameters`가 있으면 **CANON 파라메트릭 렌더러**로 그린다. PNG는 성장 상태가 없는 자리의 fallback이다 — CANON 대체가 아니다.
- 외부 네트워크 호출은 `remote-trainer-service.ts`의 `fetch` 하나뿐이다. 그 외에는 앱이 기기를 벗어나지 않는다.
- API 키는 저장소 어디에도 없다(설계상 프록시 서버만 보유).
