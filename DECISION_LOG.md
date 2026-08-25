# DECISION LOG

> AI COMMAND CENTER v0.1. 프로젝트의 중요한 결정을 추적한다.
> `docs/PRODUCT_SPEC.md` / `docs/ARCHITECTURE.md` / CANON 내용을 복제하지 않는다 — **인덱스와 포인터만 둔다.**
> 확실한 evidence가 없는 과거 결정을 새로 APPROVED 처리하지 않는다.
> 관련: [PROJECT_STATE.md](PROJECT_STATE.md) · [FAILURE_LOG.md](FAILURE_LOG.md)

Status 값: `PROPOSED` · `APPROVED` · `LOCKED` · `SUPERSEDED` · `CONFLICT`

---

## DEC-001 — V1 운동 CORE 구조 잠금 (WEIGHT CORE)

- **Status**: LOCKED
- **Date**: WEIGHT CORE 마일스톤 시점 (정확한 날짜 미확인 — ROADMAP/커밋 이력이 원본)
- **Decision**: `WorkoutSession`(activeSince 기반 타이머 / pause-resume / 세션 복구), Exercise DB, Routine, 세트 기록 UX를 V1 운동 CORE로 확정한다. 이후 작업은 이 위에 추가한다.
- **Reason**: 실시간 운동 연동 게임의 기본 루프가 반복 재설계로 흔들리는 것을 막기 위해.
- **Authority**: 1 (LOCKED)
- **Affected areas**: `src/types/workout-session.ts`, `src/utils/workout-session.ts`, `src/config/exercises.ts`, Routine, `src/app/session.tsx`, `src/app/workout-start.tsx`
- **Do not reinterpret**: WEIGHT FIRST / START WORKOUT FIRST / ROUTINE OPTIONAL / REAL ACTION = GAME INPUT / RECORDS ARE OUTPUT 다섯 원칙. 사용자의 명시적 재설계 요청 없이 다시 설계하지 않는다.
- **Supersedes**: —
- **Evidence**: `CLAUDE.md` NON-NEGOTIABLE PRODUCT RULES, `docs/PRODUCT_SPEC.md` 0-A장, `docs/ROADMAP.md` "WEIGHT CORE — V1 운동 CORE 최종 확정 (잠금)"

---

## DEC-002 — 단백이 시각 CANON 잠금

- **Status**: LOCKED
- **Date**: `fa3ffca` / `0c8a36c` / `c3c05bf` 시점
- **Decision**: `assets/characters/danbaek/canon/`을 최우선 시각 CANON으로 고정한다. Stage 0 MASTER와 Lv.1~10 성장 불변 규칙(키/얼굴/중심축/사지 길이 고정, 성장은 부피와 곡률로)을 지킨다.
- **Reason**: 새 캐릭터 디자인으로의 재해석과 전신 일괄 scale 대체를 막기 위해.
- **Authority**: 1 (CANON)
- **Affected areas**: `assets/characters/danbaek/canon/**`, `src/config/character-assets.ts`, 공통 `PlayerCharacter` 렌더러, BodyParameters 어댑터
- **Do not reinterpret**: CANON과 코드가 충돌하면 임의 변경하지 않고 중단 후 보고한다. 임시/생성/참고용 이미지를 승인 없이 최종 CANON으로 승격하지 않는다.
- **Supersedes**: 기존 SVG/stages 보조 자료 (MASTER보다 우선할 수 없음)
- **Evidence**: `assets/characters/danbaek/canon/README.md` ("Danbaek CANON — LOCKED"), `manifest.json`, `.agents/skills/danbaek-canon-guard/SKILL.md`, commits `fa3ffca` `0c8a36c` `c3c05bf`

---

## DEC-003 — V1에서 외부 서비스는 인터페이스 + mock까지만

- **Status**: LOCKED
- **Date**: M0 시점부터 유지, 마일스톤마다 재확인
- **Decision**: 실제 AI 이미지 생성, LLM API, 광고 SDK, 인앱결제, 추천 서버를 V1에서 연결하지 않는다. `src/services/*`에 인터페이스와 mock 구현까지만 둔다.
- **Reason**: 외부 SDK 연결 없이 제품 구조와 게임 루프를 먼저 확정하기 위해.
- **Authority**: 1 (CLAUDE.md 고정 규칙)
- **Affected areas**: `src/services/ads`, `src/services/subscription`, `src/services/referral`, `src/services/trainer`, `src/services/growth`
- **Do not reinterpret**: mock이 있다는 이유로 출시 빌드에서 실제 보상/권리를 만들어도 된다는 뜻이 아니다 (DEC-005 참조).
- **Supersedes**: —
- **Evidence**: `CLAUDE.md`, `docs/ROADMAP.md` 각 마일스톤 말미 문단

---

## DEC-004 — 유효 세트 판정 단일화 (`isEffectiveSet`)

- **Status**: APPROVED
- **Date**: commits `36bc923`, `cf7b546`
- **Decision**: `isEffectiveSet(set) = completed && (reps ?? 0) > 0` 하나를 모든 집계가 재사용한다. 중량 0은 무효 조건이 아니다(맨몸 0kg × N회, 시간 종목의 reps=초 계약은 유효). 과거에 저장된 무효 세트는 마이그레이션/삭제하지 않고 **읽는 시점에만** 거른다.
- **Reason**: 체크만 하고 횟수를 넣지 않은 세트가 기록·streak·XP·PR을 만들었다. 판정식을 화면마다 복제하면 같은 사고가 다시 난다.
- **Authority**: 2 (사용자 승인 커밋)
- **Affected areas**: 세션 저장 경계, HISTORY 통계, PR 집계, `findPreviousPerformance`, PT 컨텍스트, 루틴 완료 보너스 XP
- **Do not reinterpret**: 저장된 사용자 기록을 정리한다는 이유로 마이그레이션/삭제하지 않는다.
- **Supersedes**: —
- **Evidence**: commits `36bc923` `cf7b546`, `scripts/verify-weight-core.ts` / `verify-pt-context.ts` / `verify-core-loop.ts`
- **관련 실패**: [FAILURE_LOG.md](FAILURE_LOG.md) `FAIL-001`

---

## DEC-005 — 권리(entitlement) 판정을 단일 순수 함수로 모은다

- **Status**: APPROVED
- **Date**: commit `b2a3f65` (2026-08-23)
- **Decision**: `resolveEntitlement()`가 provider 기록 + 현재 시각 + 신뢰 정책을 받아 등급을 낸다. `SubscriptionState`는 "provider가 알려준 기록"일 뿐 권리 판단에서 분리된다. 유효한 만료 시각이 없는 `active`는 인정하지 않고, production에서는 실제 스토어 provider만 신뢰한다. mock 구독은 `provider:'dev'`이며 구독 버튼은 `__DEV__` 안에만 존재한다.
- **Reason**: 화면마다 유료 여부를 따로 판단하면 만료가 지켜지지 않고 로컬 문서만으로 영구 premium이 된다.
- **Authority**: 2 (사용자 승인 커밋)
- **Affected areas**: `src/utils/entitlement.ts`, `src/types/entitlement.ts`, `src/config/entitlements.ts`, `src/data/subscription-repository.ts`, `src/context/app-data-context.tsx`, `src/app/ai-chat.tsx`, `src/app/(tabs)/settings.tsx`
- **Do not reinterpret**: 가격/상품 id를 코드에 두지 않는다(store product metadata가 원본). capability는 실제 존재하는 기능만 정의한다.
- **Supersedes**: 화면별 개별 구독 판정
- **Evidence**: commit `b2a3f65`, `scripts/verify-entitlement.ts` (55개)
- **관련 실패**: [FAILURE_LOG.md](FAILURE_LOG.md) `FAIL-002`

---

## DEC-006 — AI COMMAND CENTER v0.1 도입

- **Status**: APPROVED
- **Date**: 2026-08-25
- **Decision**: `PROJECT_STATE.md` / `DECISION_LOG.md` / `FAILURE_LOG.md` 세 파일 + `CLAUDE.md`의 짧은 연결 섹션만으로 AI 운영 계층을 구성한다. 새 agent framework / CLI / database / automation service를 만들지 않는다.
- **Reason**: 새 세션이 짧은 지시만으로 상태 파악 → LOCKED 확인 → 현재 작업 → 다음 작업 → 최소 변경 → 검증 → 판정 → 상태 기록 순서를 이어갈 수 있어야 한다. 문서를 늘리는 것이 목적이 아니다.
- **Authority**: 2 (사용자 지시)
- **Affected areas**: `PROJECT_STATE.md`, `DECISION_LOG.md`, `FAILURE_LOG.md`, `CLAUDE.md`
- **Do not reinterpret**: 기존 권위 문서(`docs/**`, CANON, `.agents/skills/**`) 내용을 이 세 파일로 복사하지 않는다. 참조만 한다.
- **Supersedes**: —
- **Evidence**: 이 저장소의 세 파일과 `CLAUDE.md`의 AI COMMAND CENTER 섹션

---

## DEC-007 — 게임 진행 기반 아바타 성장 경로 (CONFLICT)

- **Status**: CONFLICT
- **Date**: 2026-08-25 (기록 시점)
- **Decision**: **없음. 결정되지 않았다.** 이 항목은 판정을 기다리는 충돌 기록이다.
- **Reason**: `CLAUDE.md`의 "V1 캐릭터는 단일 아바타다 / 게임 진행도가 외형 파라미터로 흘러 들어가는 경로를 만들지 않는다"와, ROADMAP·ARCHITECTURE·CANON·현재 구현의 `Workout → GrowthEngine → Muscle SP/Stage → BodyState → BodyParameters → Renderer` 파이프라인이 서로 어긋난다. 양쪽 다 각자의 문서 안에서는 일관된다.
- **Authority**: 충돌 당사자가 1(CANON)과 1~2(CLAUDE.md 고정 규칙)이라 자동 해소되지 않는다.
- **Affected areas**: `CLAUDE.md` REAL BODY DATA != GAME AVATAR PROGRESSION 2·4항, `docs/PRODUCT_SPEC.md` 0·2장, `docs/ARCHITECTURE.md` 5.5-B/5.5-C, `assets/characters/danbaek/canon/README.md` Lv.1~10 규칙, `src/services/growth/**`, `src/utils/growth-*.ts`, `src/utils/body-state.ts` 계열
- **Do not reinterpret**: 어느 한쪽을 "최신이니까" 또는 "구현이 이미 있으니까"로 자동 채택하지 않는다. 사용자 승인 없이 문서도 코드도 수정하지 않는다.
- **Supersedes**: —
- **Evidence**: 위 문서들의 해당 문단 (인용 위치는 [PROJECT_STATE.md](PROJECT_STATE.md) `CONFLICTS` 참조)

---

## DEC-008 — FAILURE는 재실행 가능한 근거가 있을 때만 RESOLVED

- **Status**: APPROVED
- **Date**: 2026-08-25 (COMMAND CENTER v0.2)
- **Decision**: `FAILURE_LOG.md` 항목을 RESOLVED로 올리려면 저장소에 남아 다시 실행할 수 있는 근거가 있어야 한다. 우선순위는 ① 자동 검증 명령 ② 결정적 build/type/static 검증 ③ 재현 가능한 수동 검증 절차. ①이 합리적으로 가능한데 1회성 probe만 있으면 완전한 RESOLVED가 아니다.
- **Reason**: v0.1에서 `FAIL-007`의 근거가 1회성 probe였다 — 다시 확인하려면 매번 손으로 만들어야 했고 회귀를 잡아 주지 못했다. 상태 문서의 "검증됨"이 재실행 가능해야 의미가 있다.
- **Authority**: 2 (사용자 지시)
- **Affected areas**: `FAILURE_LOG.md`, `CLAUDE.md` AI COMMAND CENTER v0.2, `scripts/verify-*.ts`, `package.json`
- **Do not reinterpret**: 모든 실패에 테스트 파일을 강제로 만들지 않는다. UI/실기기/외부 SDK처럼 자동화가 비합리적인 경우 ③으로 충분하다 — 과설계는 이 결정의 목적이 아니다.
- **Supersedes**: —
- **Evidence**: `CLAUDE.md`의 FAILURE EVIDENCE RULE, `scripts/verify-monetization.ts`(commit `4b23f17`), `FAILURE_LOG.md` `FAIL-007`

---

## DEC-009 — 위험도 기반 자율 실행 권한 (AUTONOMY LEVELS)

- **Status**: APPROVED
- **Date**: 2026-08-25 (COMMAND CENTER v0.2)
- **Decision**: 작업을 SAFE / GUARDED / APPROVAL REQUIRED로 나눈다. SAFE는 재승인 없이 조사→최소 변경→검증→재검증→상태 기록까지 자율 실행한다. GUARDED는 실행하되 영향 범위 조사 + 관련 verification + typecheck/lint + 회귀 검증 + diff 검토를 모두 붙이고, 안전한 범위에서 검증 실패를 해결하지 못하면 STOP한다. APPROVAL REQUIRED는 실행하지 않고 문제/영향/추천안/필요한 승인만 보고하고 STOP한다. "계속 / 진행 / continue" 같은 일반 지시는 COMMAND CENTER를 읽어 CURRENT/NEXT를 복구한 뒤 이 등급에 따라 처리한다.
- **Reason**: 저위험 작업마다 승인을 다시 받는 것이 실제 병목이었다. 동시에 LOCKED/CANON/제품 방향/데이터 손실처럼 되돌리기 어려운 것은 사람의 결정으로 남겨야 한다. 등급이 애매하면 한 단계 높게 본다.
- **Authority**: 2 (사용자 지시)
- **Affected areas**: `CLAUDE.md` AI COMMAND CENTER v0.2 (AUTONOMY LEVELS / CONTINUATION RULE / STOP CONDITIONS), `PROJECT_STATE.md`
- **Do not reinterpret**: 자율 실행은 검증 면제가 아니다 — SAFE도 검증하고 상태를 기록한다. CURRENT가 없을 때 EXPERIMENTAL 항목이나 실험 아이디어를 확정 작업처럼 자동 선택하지 않는다. `CONF-001`은 APPROVAL REQUIRED이며 이 결정으로 열리지 않는다.
- **Supersedes**: v0.1의 암묵적 "매 단계 승인" 관행 (v0.1 구조 자체는 그대로 유효하다)
- **Evidence**: `CLAUDE.md`의 AUTONOMY LEVELS / CONTINUATION RULE / STOP CONDITIONS 섹션

---

## DEC-010 — 믿을 수 없는 완료 receipt는 버리지 않고 멈춘다

- **Status**: APPROVED
- **Date**: 2026-08-25
- **Decision**: 저장된 `SessionCompletionReceipt`를 읽을 수 없으면 **삭제하지도, 처음부터 다시 진행하지도 않는다.** 완료 처리를 멈추고 세션을 남긴 채 사용자에게 [다시 시도]를 보여 준다. 단, 읽을 수 있는 `sessionId`가 이번 세션과 다르면 다른 세션의 잔해로 보고 이번 완료를 막지 않는다.
- **Reason**: receipt는 완료 파이프라인이 "어디까지 성공했는지" 기억하는 유일한 근거다. 버리면 이미 반영된 성장/XP/streak를 다시 줄 수 있고(중복), 억지로 살리면 안 끝난 단계를 끝났다고 보아 보상이 유실된다. **중복 지급보다 지연이 낫다** — `4a75851`이 저장 실패를 다룬 방향과 같다. sessionId 예외가 없으면 옛 손상값 하나가 이후 모든 운동 완료를 영구히 막는다.
- **Authority**: 2 (사용자 결정)
- **Affected areas**: `src/utils/stored-state.ts`(`classifyStoredReceipt` / `classifyStoredReceiptRaw`), `src/data/session-completion-repository.ts`, `src/services/storage/local-storage.ts`(`readRawString`), `src/context/app-data-context.tsx` 호출부, `scripts/verify-storage-recovery.ts`
- **Do not reinterpret**: 완료 파이프라인(`runSessionCompletion`)의 단계 순서와 `SessionCompletionOperations` 계약은 이 결정으로 바뀌지 않는다. 손상된 receipt를 "정리"한다는 이유로 삭제하는 코드를 추가하지 않는다. snapshot 내부까지 검사해 부분 복구를 시도하지 않는다.
- **Supersedes**: —
- **Evidence**: commit `8444a0f`, `npm run verify:storage`(168개 중 receipt 판정 29개), `npm run verify:core-loop`(85개 회귀)
- **승인 경위**: [PROJECT_STATE.md](PROJECT_STATE.md) BLOCKED에 문제/영향/추천안/필요한 승인을 올린 직후 사용자가 "계속"으로 진행을 지시했다 — 추천안 그대로 채택한 것으로 해석했다. 다른 방침을 원하면 이 항목을 SUPERSEDED로 바꾸고 다시 결정한다.

---

## DEC-011 — PR은 두 종류다: 최고 중량 갱신 + 같은 중량 최고 횟수 갱신

- **Status**: APPROVED
- **Date**: 2026-08-25
- **Decision**: PR 판정을 `kind: 'weight' | 'reps'` 두 종류로 확장한다. `weight`는 기존 기준 그대로(과거 최고 중량 초과, 동률 아님), `reps`는 **전에 해본 적 있는 같은 중량에서** 그때보다 많은 횟수다. 처음 쓰는 중량에서는 rep PR이 나지 않고, 한 운동에서 둘이 겹치면 `weight`만 남는다. 중량 0/미입력은 하나의 맨몸 구간으로 묶는다. XP는 `AppConfig.passXpPerPr`(15) / `passXpPerRepPr`(10)에서 온다.
- **Reason**: 중량 기준 하나만으로는 풀업/푸쉬업처럼 무게가 늘지 않는 종목에 영원히 PR이 없다. 같은 무게로 더 많이 드는 것은 실제 성장인데 앱이 아무 말도 하지 않았다. 동시에 "새 무게마다 PR"이 되면 PR이라는 말이 값을 잃으므로 경계를 좁게 잡았다.
- **Authority**: 2 (사용자가 CURRENT로 승인)
- **Affected areas**: `src/utils/exercise-history.ts`(detectPRs / listPRs / countPeriodPRs / describePr*), `src/utils/workout-session-result.ts`, `src/context/app-data-context.tsx`(XP), `src/utils/pt-context.ts`, `src/app/session.tsx`, `src/config/app-config.ts`, `src/types/{growth,session-completion}.ts`, `docs/PRODUCT_SPEC.md` 15장, `docs/ARCHITECTURE.md` 5.5-A/5.5-B
- **Do not reinterpret**: **1RM 추정은 PR 판정에 쓰지 않는다** — 제품 기획 15장의 "단순하고 모호하지 않은 경우만"이 그대로 유효하다(`utils/growth-calculation.ts`의 1RM은 성장 SP 전용이며 PR과 무관하다). 판정 규칙을 화면이나 결과 빌더에 복제하지 않는다 — `detectPRs` / `listPRs` 두 함수가 원본이고 `countPeriodPRs`는 `listPRs`를 센다. XP 숫자는 config에서만 바꾼다.
- **Supersedes**: PR을 "이전보다 높은 중량"만으로 판정하던 기존 규칙(확장이며 기존 판정은 그대로 유지된다)
- **Evidence**: commit `6999edf`, `npm run verify:weight-core`(88개 중 rep PR 19개), `npm run verify:workout-core`, `npm run verify:pt`, `npm run verify:core-loop`
