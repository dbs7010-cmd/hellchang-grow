# FAILURE LOG

> AI COMMAND CENTER v0.1. 같은 실패를 두 번 반복하지 않기 위한 기록.
> **확실한 evidence가 없는 과거 실패를 만들어내지 않는다.** 현재 저장소에서 명확히 확인되는 것만 인덱싱했다.
> 관련: [PROJECT_STATE.md](PROJECT_STATE.md) · [DECISION_LOG.md](DECISION_LOG.md)

Status 값: `OPEN` · `RESOLVED` · `AVOID` · `UNKNOWN`

---

## FAIL-001 — 횟수 없는 세트가 기록·streak·XP·PR을 만들었다

- **Status**: RESOLVED
- **Date**: commits `36bc923`, `cf7b546`
- **Context**: 세션 화면이 "지금 채울 세트"를 자동으로 준비한다(`ensurePendingSet`). 사용자가 횟수를 넣지 않은 채 완료를 누를 수 있었다.
- **Symptom**: 실제로 하지 않은 운동이 `WorkoutRecord`로 남고, streak / PASS XP / PR / HISTORY 통계 / PT 컨텍스트 / 지난 기록 제안 / 루틴 완료 보너스까지 오염됐다.
- **Root cause**: "완료된 세트"의 판정 기준이 여러 집계 지점에 흩어져 있었고, `completed` 플래그만 보는 곳이 있었다.
- **Failed approach**: 집계 지점마다 개별 조건을 덧대는 방식. 새 소비처가 생길 때마다 같은 사고가 재발한다.
- **Resolution**: `isEffectiveSet()` 하나로 판정을 단일화하고 모든 집계가 재사용한다. 저장된 과거 기록은 마이그레이션/삭제하지 않고 읽는 시점에만 거른다. → [DECISION_LOG.md](DECISION_LOG.md) `DEC-004`
- **Verification**: `verify:weight-core` / `verify:pt` / `verify:core-loop`에 44개 시나리오 추가 (무효 제외, 맨몸·시간 종목 유효, 혼합 집계, 옛 요약 기록 회귀, 읽어도 저장 원본 불변)
- **Do not repeat**: 세트 유효성 판정식을 새로 만들거나 복제하지 말 것. 중량 0을 무효로 취급하지 말 것(맨몸/시간 종목이 죽는다).
- **Retry condition**: —
- **Evidence**: commits `36bc923`, `cf7b546`

---

## FAIL-002 — 만료된 구독이 영원히 유효했다

- **Status**: RESOLVED
- **Date**: commit `b2a3f65` (2026-08-23)
- **Context**: 화면마다 유료 여부를 따로 판단했고 `SubscriptionState.status`를 그대로 권리로 읽었다.
- **Symptom**: `status: 'active'`이면 `expiresAt`이 지나도 계속 구독 중으로 취급됐다. 로컬에 저장된 문서만으로 영구 premium이 될 수 있었다.
- **Root cause**: "provider가 알려준 기록"과 "지금 이 사용자가 가진 권리"를 같은 값으로 다뤘다.
- **Failed approach**: 화면별 구독 상태 체크.
- **Resolution**: `resolveEntitlement()` 순수 함수가 유일한 판정 소스가 된다. 유효한 만료 시각이 없는 `active`는 인정하지 않고, production에서는 실제 스토어 provider만 신뢰한다. → `DEC-005`
- **Verification**: `npm run verify:entitlement` (55개)
- **Do not repeat**: 화면에서 `subscription.status`를 직접 읽어 유료 여부를 판단하지 말 것. 가격/상품 id를 코드에 두지 말 것.
- **Retry condition**: —
- **Evidence**: commit `b2a3f65`, `scripts/verify-entitlement.ts`

---

## FAIL-003 — 운동 종료 저장이 중간에 실패하면 보상이 중복되거나 사라졌다

- **Status**: RESOLVED
- **Date**: commit `4a75851`
- **Context**: 세션 종료는 Growth → WorkoutRecord → rewards(XP/streak) → cleanup 여러 단계를 거친다.
- **Symptom**: 중간 실패나 완료 버튼 연타 시 보상이 두 번 들어가거나 결과를 잃었다.
- **Root cause**: 완료 처리가 원자적이지 않았고 재시도 시 어디까지 성공했는지 알 방법이 없었다.
- **Failed approach**: 단순 재실행(재시도 = 처음부터).
- **Resolution**: `sessionId` 기반 `SessionCompletionReceipt` 파이프라인. 단계마다 receipt를 갱신하고 마지막 성공 단계 다음부터 이어간다. `sessionId`별 in-flight Promise 공유로 연타 효과는 1회. streak은 운동 날짜 기준으로 반영해 날짜가 바뀐 뒤 재시도해도 결과가 같다. 저장 실패 시 결과를 확정하지 않고 [다시 시도]를 노출한다.
- **Verification**: `npm run verify:core-loop` (21개 — 단계별 강제 실패, 연타, 앱 재시작 복구)
- **Do not repeat**: 완료 파이프라인을 "다시 호출하면 되는" 형태로 되돌리지 말 것. LOCKED 시스템(GrowthEngine / SP 공식 / BodyState / Renderer / HOME)을 건드려 해결하려 하지 말 것 — 저장 경계에서 푼다.
- **Retry condition**: —
- **Evidence**: commit `4a75851`, `scripts/verify-core-loop.ts`

---

## FAIL-004 — 휴식 중 뒤로가기가 아무것도 묻지 않았고, 지난 종료 확인이 뒤늦게 떴다

- **Status**: RESOLVED
- **Date**: commit `ebd5784`
- **Context**: 세션 화면의 확인 UI가 ACTIVE 분기 반환문 안에만 있었다.
- **Symptom**: (1) 휴식 중 뒤로가기는 이탈만 조용히 막고 아무 확인도 보여 주지 않았다. (2) 종료 확인 상태가 휴식으로 넘어가도 살아남아 ACTIVE 복귀 시 뒤늦게 떴고, 같은 자리의 다음 탭이 [종료하고 기록]에 닿았다 — **Android 실기기에서 재현**.
- **Root cause**: 화면 상태(ACTIVE/REST)와 확인 UI의 수명이 분리되지 않았다.
- **Failed approach**: ACTIVE 분기에만 확인 UI를 두는 구조.
- **Resolution**: 확인 바 정의를 하나로 두고 ACTIVE와 REST가 같은 것을 그린다. 휴식 진입 시 종료 확인 상태를 끈다. 가로챈 이동 액션은 화면을 벗어날 때 비운다. 무엇을 언제 묻는지는 순수 규칙(`resolveSessionConfirm` / `shouldClearEndConfirm`)이 결정한다.
- **Verification**: 순수 규칙 함수 기준 검증 + 실기기 재현 확인 (커밋 본문)
- **Do not repeat**: 확인/모달 상태를 화면 분기 안쪽에 가두지 말 것. 웹에서만 확인하고 세션 이탈 동작을 완료로 판정하지 말 것.
- **Retry condition**: —
- **Evidence**: commit `ebd5784`

---

## FAIL-005 — 세트 완료 반응이 사용자에게 보이지 않았다

- **Status**: RESOLVED
- **Date**: commit `d6c3910`
- **Context**: 세트 완료 시 자동으로 휴식 화면으로 전환된다.
- **Symptom**: 완료 후 100ms도 안 돼 화면 전체가 바뀌어, 반응이 방금 누른 화면이 아니라 낯선 화면의 작은 단백이(104px → 70px)에서 일어났다. 단백이 한 줄과 스탠리 휴식 문구가 동시에 떴다.
- **Root cause**: 상태 전이 시점과 피드백 연출 시점을 같게 뒀다.
- **Failed approach**: 전환 직후 같은 연출을 휴식 화면에서 재생.
- **Resolution**: 완료 직후 480ms 동안 운동 화면을 유지하고 같은 크기의 단백이가 반동한 뒤 휴식으로 넘어간다. 반동은 가로/세로 스케일을 어긋나게 둔다 — 균일 확대는 "성장"으로 읽힌다. 세트 completed / 세션 저장 / 휴식 종료 절대시각은 누른 즉시 확정된다.
- **Verification**: `verify:workout-character-motion` 계열 + 저장되지 않는 표현 상태임을 확인
- **Do not repeat**: 연출을 위해 세트 저장이나 휴식 절대시각을 늦추지 말 것(REAL ACTION = GAME INPUT). 축하 연출에 균일 스케일 확대를 쓰지 말 것.
- **Retry condition**: —
- **Evidence**: commit `d6c3910`

---

## FAIL-006 — Renderer의 Stage 0가 CANON 비율에서 벗어났다

- **Status**: RESOLVED
- **Date**: commits `fa3ffca`, `0c8a36c`
- **Context**: parametric Renderer가 CANON 원본 실루엣을 재현해야 한다.
- **Symptom**: Stage 0 비율이 승인된 MASTER CANON과 어긋났다. (커밋 본문이 없어 증상의 세부 내용은 커밋 diff와 CANON 문서가 원본이다.)
- **Root cause**: UNKNOWN — 커밋 메시지에 기록되지 않았다. 추정하지 않는다.
- **Failed approach**: 기록 없음.
- **Resolution**: Stage 0 비율 복원 + CANON 규칙을 `assets/characters/danbaek/canon/README.md`에 LOCKED로 문서화 (얼굴 정체성 / 키 / 중심축 / 사지 길이 고정, 성장은 부피와 곡률로).
- **Verification**: `npm run verify:character-body` (현재 존재하는 스크립트), CANON 문서와의 육안 대조
- **Do not repeat**: CANON과 코드가 어긋날 때 임의로 한쪽을 맞추지 말 것 — 중단하고 보고한다(`danbaek-canon-guard`). 전신 일괄 scale이나 full-body SVG 교체로 부위 성장을 대체하지 말 것.
- **Retry condition**: —
- **Evidence**: commits `fa3ffca`, `0c8a36c`, `assets/characters/danbaek/canon/README.md`

---

## FAIL-007 — mock 보상형 광고가 출시 빌드에서도 이용권을 줄 수 있었다

- **Status**: RESOLVED (2026-08-25, commit `10e4169` + 회귀 검증 `4b23f17`)
- **Date**: 2026-08-25 기록 / 2026-08-25 검증
- **Context**: `DEC-003`에 따라 광고 SDK는 연결하지 않고 mock만 있다. 그 mock이 즉시 보상을 준다.
- **Symptom**: 광고를 실제로 재생할 수 없는 빌드에서 버튼 한 번으로 유료 기능 이용권을 얻을 수 있다.
- **Root cause**: "SDK 미연결"과 "보상 지급"이 분리되지 않았다 — 없는 것을 있는 척하는 어댑터가 유일한 구현이었다.
- **Failed approach**: mock 하나를 모든 빌드에서 사용.
- **Resolution**: `src/services/ads/index.ts`가 `__DEV__`에서만 mock을 고르고, 그 밖에서는 보상을 주지 않는 `UnavailableRewardedAdService`를 쓴다. `services/trainer/index.ts`의 구현 선택 방식을 재사용한다. `watchRewardedAd()`는 `granted && rewardUnits > 0`일 때만 `grantRewardedPtUses()`에 도달하고 결과를 화면에 그대로 돌려준다.
- **Verification** (2026-08-25):
  - `npx tsc --noEmit` PASS / `npm run lint` PASS / `npm run verify:entitlement` PASS(55개) / `npm run verify:pt` PASS
  - 저장소 소스를 그대로 실행한 read-only probe (scratchpad, 저장소 무변경): `__DEV__=false` → `UnavailableRewardedAdService` / `isProviderAvailable:false` / `isAdReady:false` / `showRewardedAd → {granted:false, rewardUnits:0}`. `__DEV__=true` → `MockRewardedAdService` / `{granted:true, rewardUnits:1}`
  - 코드 기준 확인: `showRewardedAd` 호출부는 `app-data-context.tsx`의 `watchRewardedAd` 하나뿐이고, 실패·예외·저장 실패는 전부 `false`를 돌려주며 이용권을 늘리지 않는다. 광고 경로는 `trainerUsage`만 만지고 `entitlement`/`capabilities`를 만지지 않는다 — entitlement는 `resolveEntitlement({ allowDevProvider: __DEV__ })` 세 호출부에서만 나온다
  - ~~**커버리지 공백**: 위 probe는 1회성이며 저장소에 남는 회귀 검증이 아니다~~ → **해소(v0.2)**: `npm run verify:monetization`(`scripts/verify-monetization.ts`, 39개, commit `4b23f17`)이 같은 사실을 저장소 안에서 매번 다시 검증한다 — 빌드별 어댑터 선택, unavailable 어댑터의 무보상, 미승인/0/음수/NaN/Infinity/소수/결과 없음일 때 이용권 불변, 승인된 만큼만 증가, 보상 결과에 등급 필드 없음, production에서 dev provider 불신, 출시 빌드 전체 경로. 검증 가능성을 위해 `selectRewardedAdService(isDevBuild)`와 `resolveRewardedAdGrant(result)` 두 순수 함수만 추출했고 동작은 그대로다
- **Do not repeat**: 없는 외부 서비스를 "성공한 것처럼" 반환하는 어댑터를 production 경로에 두지 말 것. mock은 `__DEV__` 경계 안에서만 선택한다.
- **Retry condition**: 실제 AdMob 어댑터가 붙으면 이 자리의 구현만 교체하고 `npm run verify:monetization`을 다시 돌린다.
- **Evidence**: working tree `src/services/ads/index.ts`, `src/services/ads/unavailable-rewarded-ad-service.ts`, `src/services/ads/mock-rewarded-ad-service.ts`, `src/context/app-data-context.tsx` `watchRewardedAd`, `src/app/ai-chat.tsx` (uncommitted) + 2026-08-25 probe 출력

---

## FAIL-008 — 저장된 값의 모양이 다르면 화면이 렌더 도중 터졌다

- **Status**: RESOLVED (2026-08-25 — `npm run verify:storage` 68개, commit `034fa55`)
- **Date**: 2026-08-25 기록 / 2026-08-25 검증
- **Context**: repository들이 `readJSON(...) ?? 기본값` 하나로 버텼다. 이것이 막아 주는 것은 값이 **없는** 경우뿐이다.
- **Symptom**: 앱 업데이트로 필수 필드가 늘었거나 쓰기 도중 종료돼 값이 깨졌을 때 `.find` / `.map` / `.bodyParameters.size`에서 렌더 중 예외가 나고, 사용자는 재설치 말고는 빠져나올 방법이 없는 빈 화면을 본다.
- **Root cause**: 존재 검사와 모양 검사를 같은 것으로 취급했다.
- **Failed approach**: 기본값 fallback만으로 방어.
- **Resolution**: `src/utils/stored-state.ts`가 저장값 판정의 **단일 원본**이다 — `parseStoredJson`(깨진 JSON은 없는 값) / `asStoredArray`(배열 아니면 빈 배열) / `isUsableProfile`(모양이 다르면 "프로필 없음") / `isOnboardingComplete`(정확히 true) / `resolveOnboardingState`(양방향 온보딩 판정) / `resolveBootstrapScreen`(splash·recovery·navigator). `local-storage` `profile-repository` `app-data-context` `_layout`이 전부 이 함수들을 호출한다. `app-data-context`는 읽기 실패 시 `bootstrapFailed`를 세우고 `reloadAppData`로 같은 경로를 다시 돈다.
  - 처음에는 같은 판정이 두 벌이었다 — `stored-state.ts`(아무도 import하지 않는 상태)와 `profile-repository`의 지역 복사본. 두 벌은 이미 갈라져 있었다(지역 복사본은 배열과 NaN size/tone을 통과시켰다). 단일 원본으로 모으면서 더 엄격한 쪽(`stored-state`)으로 통일했다 — 안전한 방향이고, 검증이 살아 있는 경로를 실제로 덮게 하기 위해서다.
- **Verification**: `npm run verify:storage`(`scripts/verify-storage-recovery.ts`, 68개) — 깨진/잘린 JSON, 배열 아닌 저장값, 프로필 필수 필드·NaN·배열, 온보딩 플래그 truthy 함정, 양방향 온보딩 경계(플래그만 있고 프로필 없음 → 온보딩 / 플래그 없고 프로필 있음 → 완료 + 플래그 보강), 부팅 실패 시 온보딩을 열지 않음, [다시 시도] 상태 전이, 손상의 키 단위 격리. `tsc` / `lint` / 기존 verify 12종도 함께 PASS(총 794개).
  - **추가(2026-08-25, commit `bc2e90c`)**: 진행 중 세션 키만 이 검사를 받지 않고 있었다 — 세트마다·heartbeat마다 저장돼 쓰기 중 kill이 겹칠 확률이 가장 높은데, 세션 화면은 `session.exercises.map(...)`을 그대로 믿는다. `asStoredSession()`을 같은 패턴으로 추가하고 `getActiveSession()`이 읽는 시점에만 쓴다(저장값 무수정). 읽을 수 있는 세션은 살리고(진행 중 운동을 버리지 않는다) 세션이라 볼 수 없는 값만 버린다. `verify:storage` 27개 추가(68 → 95).
  - **한계**: 이 저장소의 다른 verify와 같이 순수 함수만 돌린다. AsyncStorage 실제 I/O(`getItem` 예외 경로)와 React 배선(부팅 catch → `bootstrapFailed`, `_layout`의 실제 렌더)은 `tsc`와 코드 확인까지다. 실기기 kill 복구는 `scripts/verify-storage-recovery.ts` 하단의 **재현 가능한 수동 절차**로 남겼다(`DEC-008` ③) — 아직 수행되지 않았다.
  - **남은 공백**: `streak` / `pass` / `trainer-usage` / `referral` / `event` / `session-completion` 키는 아직 모양 검사가 없다 → [PROJECT_STATE.md](PROJECT_STATE.md) NEXT.
- **Do not repeat**: 저장값 방어를 화면 컴포넌트 안에서 하지 말 것. 깨진 값을 조용히 "고쳐서" 실제 사용자 기록(운동/신체)을 바꾸지 말 것.
- **Retry condition**: —
- **Evidence**: working tree `src/utils/stored-state.ts`, `src/services/storage/local-storage.ts`, `src/data/*-repository.ts`, `src/context/app-data-context.tsx`(부팅 경로), `src/app/_layout.tsx`, `scripts/verify-storage-recovery.ts` (uncommitted)
