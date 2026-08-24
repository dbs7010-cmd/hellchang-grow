# PROJECT STATE

> AI COMMAND CENTER v0.1 — 새 세션이 현재 상태를 복구하기 위한 단일 entry point.
> 여기에 권위 문서의 내용을 복사하지 않는다. **가리키기만 한다.**
> 관련: [DECISION_LOG.md](DECISION_LOG.md) · [FAILURE_LOG.md](FAILURE_LOG.md) · [CLAUDE.md](CLAUDE.md)

## SNAPSHOT

- branch: `feat/v1-monetization-foundation`
- HEAD: `034fa55` — fix(storage): survive corrupted stored values instead of a blank screen
  (이 문서를 담은 COMMAND CENTER 체크포인트 커밋이 그 위에 올라간다)
- last_updated: 2026-08-25
- last_verified: 2026-08-25 — `tsc` / `lint` PASS + verify 스크립트 13종 전부 PASS(794개 단언, 신규 `verify:storage` 포함)
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

## DONE

최근 핵심만 기록한다. 전체 이력은 `docs/ROADMAP.md`와 git log가 원본이다.

- ROADMAP 마일스톤 M0 ~ BODY STATE 완료 (WEIGHT CORE / WORKOUT CORE / GROWTH ENGINE / BODY STATE)
- `10e4169` 광고 보상 경계 — 출시 빌드에 보상을 주는 어댑터가 없다. `FAIL-007` RESOLVED
- `034fa55` 저장값 손상 → 빈 화면 대신 복구. `utils/stored-state` 단일 원본 + `verify:storage` 68개. `FAIL-008` RESOLVED
- `b2a3f65` V1 entitlement foundation — 단일 권리 판정 소스 `resolveEntitlement()`, 만료 강제, `verify:entitlement` 55개
- `ebd5784` 휴식 중 이탈 확인 표시 + stale 종료 확인 정리 (Android 실기기 재현 버그)
- `d6c3910` 세트 완료 피드백을 휴식 전환 전에 보이도록 유지
- `0dfbe4e` 결과 화면 성장 비교 확대 (실제 stage 상승이 있을 때만)
- `4a75851` 세션 완료 idempotent 처리 (receipt 파이프라인, `verify:core-loop`)

## CURRENT

**없음 — verified checkpoint 직후다.** 진행 중인 주 작업 단위가 없다.

직전 작업(V1 수익화/저장 안전 경계)은 `10e4169` + `034fa55`로 커밋됐고 DONE으로 옮겼다.
다음 작업은 NEXT를 따른다.

## NEXT

`FAIL-007`의 1회성 probe를 `scripts/verify-monetization.ts`(`npm run verify:monetization`) 회귀 검증으로 승격한다 — 어댑터 선택(`__DEV__` 양쪽), 보상 게이트(`granted`/`rewardUnits`/예외/저장 실패), 광고가 entitlement를 만들지 않음을 저장소에 남는 검증으로 고정한다. 함께 COMMAND CENTER 규칙에 "실행 가능한 명령이 없으면 FAILURE를 RESOLVED로 올리지 않는다"를 넣는다(v0.2 1순위).

push는 사용자가 명시적으로 요청하기 전까지 하지 않는다.

## BLOCKED

None.

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

같은 작업을 Claude와 Codex에 이유 없이 중복 수행시키지 않는다.
