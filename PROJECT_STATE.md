# PROJECT STATE

> AI COMMAND CENTER v0.1 — 새 세션이 현재 상태를 복구하기 위한 단일 entry point.
> 여기에 권위 문서의 내용을 복사하지 않는다. **가리키기만 한다.**
> 관련: [DECISION_LOG.md](DECISION_LOG.md) · [FAILURE_LOG.md](FAILURE_LOG.md) · [CLAUDE.md](CLAUDE.md)

## SNAPSHOT

- branch: `feat/v1-monetization-foundation`
- HEAD: `7305e34` — docs(readme): replace the create-expo-app template
  (이 문서를 담은 상태 갱신 커밋이 그 위에 올라간다)
- last_updated: 2026-08-25
- last_verified: 2026-08-25 — `tsc` / `lint` PASS + verify 스크립트 15종 전부 PASS(974개 단언)
- remote: `origin/feat/v1-monetization-foundation` — 사용자 승인 하에 fast-forward push (force 금지)
- worktree: 추적 대상 clean. 남은 untracked는 EXPERIMENTAL 항목뿐이다 (아래 WORKTREE 참조)

## AUTHORITY ORDER

충돌 시 AI가 임의 판단하지 않고 이 순서를 따른다.

1. 명시적으로 LOCKED / CANON 처리된 최신 승인사항
2. 현재 프로젝트의 명시적 사용자 결정
3. `docs/PRODUCT_SPEC.md` / `docs/ARCHITECTURE.md`의 유효한 확정 규칙
4. `docs/ROADMAP.md`
5. `PROJECT_STATE.md`
6. 일반 AI 작업 지침 (`AGENTS.md`, `CLAUDE.md`, `.agents/skills/**`)
7. 실험 / 제안

**서로 다른 권위 문서가 실제로 충돌하면 임의로 수정하지 않는다.** `CONFLICTS`에 기록하고 STOP 하거나 사용자 판정을 요구한다.

## LOCKED

내용을 복사하지 않는다. 아래 위치가 원본이다.

| 영역 | 원본 위치 |
| --- | --- |
| V1 운동 CORE 구조 (WorkoutSession / Exercise DB / Routine / 세트 기록 UX) | `CLAUDE.md` NON-NEGOTIABLE PRODUCT RULES, `docs/PRODUCT_SPEC.md` 0-A장, `docs/ROADMAP.md` WEIGHT CORE |
| 단백이 시각 CANON, Stage 0 MASTER, Lv.1~10 성장 불변 규칙 | `assets/characters/danbaek/canon/README.md`, `manifest.json`, `BODY_PARAMETERS.md`, `INDEX.md` |
| 성장 계산 경계 (WorkoutSessionResult → GrowthEngine → BodyState → BodyParameters → Renderer) | `docs/ARCHITECTURE.md` 5.5-B / 5.5-C, `docs/PRODUCT_SPEC.md` 14-B장 |
| V1 홈 화면 visual canon | commit `c3c05bf` |
| V1에서 외부 서비스 미연결 (LLM / 광고 SDK / 인앱결제 / 추천 서버) | `CLAUDE.md`, `docs/ROADMAP.md` 각 마일스톤 말미 |
| Git 안전 규칙 / 검증 선택 규칙 / CANON 가드 / 에셋 통합 규칙 | `.agents/skills/safe-git-workflow`, `helchang-verify`, `danbaek-canon-guard`, `asset-integration` |
| 자율 실행 등급 / FAILURE 근거 규칙 / 일반 지시("계속") 처리 / STOP 조건 | `CLAUDE.md` AI COMMAND CENTER v0.2, [DECISION_LOG.md](DECISION_LOG.md) `DEC-008` `DEC-009` |

## DONE

최근 핵심만 기록한다. 전체 이력은 `docs/ROADMAP.md`와 git log가 원본이다.

- ROADMAP 마일스톤 M0 ~ BODY STATE 완료 (WEIGHT CORE / WORKOUT CORE / GROWTH ENGINE / BODY STATE)
- `10e4169` 광고 보상 경계 — 출시 빌드에 보상을 주는 어댑터가 없다. `FAIL-007` RESOLVED
- `034fa55` 저장값 손상 → 빈 화면 대신 복구. `utils/stored-state` 단일 원본 + `verify:storage` 68개. `FAIL-008` RESOLVED
- `689f8b7` AI COMMAND CENTER v0.1 (PROJECT_STATE / DECISION_LOG / FAILURE_LOG + CLAUDE.md 연결부)
- `4b23f17` 광고 경계 회귀 검증 `verify:monetization` 39개 — `FAIL-007`의 1회성 probe 근거를 재실행 가능한 명령으로 승격
- `ac6aec4` AI COMMAND CENTER v0.2 — FAILURE EVIDENCE RULE + AUTONOMY LEVELS(`DEC-008` `DEC-009`)
- `bc2e90c` kill된 세션의 저장값을 방어적으로 읽는다(`asStoredSession`) + 실기기 kill 수동 절차. `verify:storage` 68 → 95개
- `4968d2c` streak / pass / trainer-usage / referral / event 다섯 키의 모양 검사. 공용 조각(`asStoredCount` 등)으로 조합. `verify:storage` 95 → 139개
- `8444a0f` 믿을 수 없는 완료 receipt는 버리지 않고 멈춘다([DECISION_LOG.md](DECISION_LOG.md) `DEC-010`). `verify:storage` 139 → 168개
- ROADMAP M3 구현 현황 조사 — 문서와 코드의 어긋남을 근거와 함께 `docs/ROADMAP.md` 하단 메모로 기록(항목 자체는 수정하지 않음)
- `6999edf` PR 판정 확장 — 최고 중량 + 같은 중량 최고 횟수(맨몸 포함) 두 종류([DECISION_LOG.md](DECISION_LOG.md) `DEC-011`). `verify:weight-core` 69 → 88개
- V1 RELEASE AUDIT — 출시 차단 5 / 출시 전 필수 8 / 출시 후 가능 6 / 완료 9 / MANUAL QA 6으로 분류 ([RELEASE_AUDIT.md](RELEASE_AUDIT.md))
- 출시 준비 1~3단계 일부 — 앱 식별자 `com.helchanggrow.app`(사용자 승인), `eas.json` 3개 프로필, 불필요 권한 제거(`RECORD_AUDIO` 0건). 출시 차단 5 → 3
- 개인정보처리방침 초안 + 스토어 데이터 안전 답변 시트 ([docs/PRIVACY.md](docs/PRIVACY.md)) — 코드에서 확인한 사실만, 운영 주체 정보는 빈칸
- `948ee48` `npm run verify:release` 22개 — 식별자/권한/EAS 프로필/V1 경계가 틀어지면 검증이 잡는다(틀린 설정으로 negative test 확인)
- `7305e34` README를 템플릿에서 실제 제품 문서로 교체
- `b2a3f65` V1 entitlement foundation — 단일 권리 판정 소스 `resolveEntitlement()`, 만료 강제, `verify:entitlement` 55개
- `ebd5784` 휴식 중 이탈 확인 표시 + stale 종료 확인 정리 (Android 실기기 재현 버그)
- `d6c3910` 세트 완료 피드백을 휴식 전환 전에 보이도록 유지
- `0dfbe4e` 결과 화면 성장 비교 확대 (실제 stage 상승이 있을 때만)
- `4a75851` 세션 완료 idempotent 처리 (receipt 파이프라인, `verify:core-loop`)

## CURRENT

**없음 — verified checkpoint 직후다.** 진행 중인 주 작업 단위가 없다.

**없음.** 설정(식별자/eas.json/권한), 문서(개인정보처리방침 초안·데이터 안전 시트·README),
그리고 그 설정을 지키는 검증(`verify:release`)까지 끝냈다. 남은 것은 전부 계정·게시·제품
결정·의존성 승인이며 아래 NEXT에 누가 해야 하는지 적어 뒀다.

## NEXT

**V1 출시 critical path.** 근거와 상세는 [RELEASE_AUDIT.md](RELEASE_AUDIT.md). 순서대로 진행한다 — 앞의 것이 뒤의 것을 막는다.

1. ~~앱 식별자 확정~~ **완료** — `com.helchanggrow.app`(iOS/Android 공통), `versionCode: 1`, `buildNumber: "1"`. **표시 이름(`name: "hellchang-grow"`)은 아직 개발용 슬러그다** — 스토어 등재명은 제품 결정이라 사용자 지정이 필요하다(`B2`).
2. **EAS 프로젝트 연결** (`A3`) — `eas.json`은 커밋됐다. 남은 것은 `eas init`으로 `extra.eas.projectId`/`owner`를 채우는 것이며 **Expo 계정이 필요해 사용자만 가능**하다. 그 뒤 `preview` 프로필로 첫 네이티브 빌드를 돌린다(`E5`).
3. **미사용 네이티브 의존성 정리** (`B6`) — src 참조 0건인 6개. **의존성 변경이라 APPROVAL REQUIRED**.
4. ~~개인정보처리방침 + 데이터 안전 답변 초안~~ **초안 완료** ([docs/PRIVACY.md](docs/PRIVACY.md)). 남은 것: 운영 주체/연락처/시행일 채우기 → 법률 검토 → 공개 URL 게시 → 스토어 콘솔 입력. **사용자만 가능**.
5. **사진 URI 영속성 수정** (`B4`) — 선택한 사진을 앱 디렉터리로 복사해 저장. 코드 변경이며 GUARDED. `expo-file-system` 의존성이 필요하면 그 시점에 승인을 받는다.
6. **의존성 패치 버전 정리** (`B5`) — `npx expo install --check`. APPROVAL REQUIRED.
7. **아이콘/스플래시/스토어 등재 자산 최종본** (`E2`) — 에셋 필요, **사용자**.
8. **실기기 MANUAL QA** (`E1`,`E3`,`E4`,`E5`,`E6`) → 스토어 제출 (`A4`).

크래시 리포팅(`B8`)은 위 경로와 독립이지만 출시 전에 결정하는 편이 낫다 — 없으면 초기 사용자 문제를 볼 방법이 없다.

push는 사용자가 명시적으로 요청하기 전까지 하지 않는다.

**실기기 kill 검증(사용자 작업)**: `scripts/verify-storage-recovery.ts` 하단의 수동 절차 6단계를 실기기에서 1회 수행하면 ROADMAP M3의 해당 항목이 닫힌다. AI가 대신할 수 없다.

push는 사용자가 명시적으로 요청하기 전까지 하지 않는다.

## BLOCKED

~~**`session-completion` receipt의 손상 처리 방침 — 사용자 승인 대기.**~~ → **해소(`DEC-010`, commit `8444a0f`)**. 승인된 방침: 믿을 수 없으면 버리지 않고 멈추고 [다시 시도]를 보여 준다. 다른 세션의 잔해는 막지 않는다. 아래는 그때의 판단 근거를 남긴 것이다.

- 문제: `getPendingSessionCompletion()`은 저장된 receipt를 그대로 믿는다. 이 값은 운동 완료
  파이프라인(Growth → WorkoutRecord → 보상 → cleanup)이 "어디까지 성공했는지" 기억하는
  유일한 근거다(`4a75851`).
- 영향: 값이 깨졌을 때 **버리면** 파이프라인이 처음부터 다시 돌아 이미 반영된 성장/XP/streak를
  다시 줄 수 있고, **살리면** 실제로는 안 끝난 단계를 끝났다고 보고 보상이 유실될 수 있다.
  어느 쪽도 모양 문제가 아니라 데이터 판단이다.
- 추천안: 읽을 수 있는 필드(`sessionId` / `version` / 단계 플래그)가 전부 유효할 때만 receipt로
  인정하고, 그렇지 않으면 **버리지 말고 "판단 불가"로 두어 자동 재시도를 멈춘 뒤 사용자에게
  [다시 시도]를 보여 주는 쪽**. 중복 지급보다 지연이 낫다는 기존 판단(`4a75851`의 저장 실패
  처리)과 방향이 같다.
- 필요한 승인: 위 방향으로 진행할지, 다른 방침을 쓸지.

## EXPERIMENTAL

승인 여부가 문서로 확인되지 않은 untracked 산출물. 이번 v0.1 작업 범위 밖이며 건드리지 않았다.

- `.codex-remote-attachments/`
- `danbaek-face-canon-v3-5404243.bundle` — 파일명은 face canon v3을 시사하지만 `assets/characters/danbaek/canon/`의 CANON 문서에는 반영돼 있지 않다. CANON으로 승격하려면 사용자 승인 + manifest 정렬이 필요하다 (`asset-integration` 규칙).
- `.agents/` (스킬 4종) — 저장소에 존재하지만 아직 커밋되지 않았다.

## CONFLICTS

미해결. 사용자 승인 없이 해결하지 않는다.

### CONF-001 — 게임 진행 기반 아바타 성장 (미해결)

- 한쪽: `docs/PRODUCT_SPEC.md` 0장·2장 "RPG식 가짜 신체 성장 시스템을 만들지 않는다", `CLAUDE.md` REAL BODY DATA != GAME AVATAR PROGRESSION 2항 "V1 캐릭터는 단일 아바타다 / stage 성장 만들지 않는다", 4항 "게임 진행도가 외형 파라미터로 흘러 들어가는 경로를 만들지 않는다".
- 다른 쪽: `docs/ROADMAP.md` GROWTH ENGINE / BODY STATE 마일스톤, `docs/ARCHITECTURE.md` 5.5-B / 5.5-C, `assets/characters/danbaek/canon/README.md`의 Lv.1~10 성장 불변 규칙, 그리고 현재 구현 `Workout → GrowthEngine → Muscle SP/Stage → BodyState → BodyParameters → Renderer`.
- 두 쪽 모두 자기 문서 안에서는 일관된다. PRODUCT_SPEC/ARCHITECTURE는 "실제 신체 수치(체중/체지방률/골격근량)를 만들지 않는다"는 경계를 지킨다고 말하고, CLAUDE.md 2·4항은 그보다 강하게 "외형 파라미터로 흘러 들어가는 경로 자체를 금지"한다. 현재 구현은 후자와 어긋난다.
- 상태: **CONFLICT — 미해결.** 어느 쪽도 이번 작업에서 수정하지 않았다. 판정 필요: (a) CLAUDE.md 2·4항을 GROWTH/BODY STATE 승인 이후 기준으로 갱신할지, (b) 구현 쪽을 되돌릴지. 사용자만 결정할 수 있다.
- 기록: [DECISION_LOG.md](DECISION_LOG.md) `DEC-007`.

## WORKTREE WARNING

이전에 보호 대상이던 dirty 작업은 `10e4169` + `034fa55`로 커밋됐다. 추적 대상은 clean이다.

남은 untracked는 커밋하지 않은 EXPERIMENTAL 항목뿐이다.

- `.agents/` — 별도 인프라 후보. 기능 커밋에 섞지 않는다.
- `.codex-remote-attachments/`, `danbaek-face-canon-v3-5404243.bundle` — 승인/출처 미확인.

이 변경들을 삭제 / 되돌리기 / stash / reset / clean / 임의 stage 하지 않는다. 다른 branch로 이동하지 않는다. 규칙 원본은 `.agents/skills/safe-git-workflow/SKILL.md`.

## AI ROUTING

- **ChatGPT** — 총괄, 계획, 우선순위, 작업 분해, 최종 판정.
- **Claude Code** — 기본 주력 구현, 저장소 조사, 코드 변경, 테스트.
- **Codex** — 고위험 변경의 독립 검증, Claude가 해결하지 못한 문제의 second opinion. 필요할 때만.

자율 실행 등급(SAFE / GUARDED / APPROVAL REQUIRED)과 일반 지시 처리 규칙은 `CLAUDE.md`의
AI COMMAND CENTER v0.2에 있다 — 여기에 복사하지 않는다.

같은 작업을 Claude와 Codex에 이유 없이 중복 수행시키지 않는다.
