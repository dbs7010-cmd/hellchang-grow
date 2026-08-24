@AGENTS.md

# 헬창키우기 (가칭) — 개발 원칙

이 저장소는 신규 모바일 앱 "헬창키우기(가칭)" 전용이다. 다른 저장소/다른 프로젝트의 파일을 참조하거나 수정하지 않는다.

- 기획/구조/일정은 `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`에 고정되어 있다. 기능을 추가하기 전에 먼저 이 문서를 확인하고, 기획에 없는 기능을 임의로 추가하지 않는다. 기획이 바뀌면 코드보다 먼저 문서를 갱신한다.

## NON-NEGOTIABLE PRODUCT RULES (WEIGHT CORE 이후 고정)

WEIGHT CORE 마일스톤([[roadmap]])에서 V1 운동 CORE 구조를 최종 확정했다. 아래 규칙은 이후 모든 작업(게임성/아트/AI/수익화/출시 품질 포함)에 예외 없이 적용된다.

- **WEIGHT FIRST**: 웨이트 트레이닝이 제품의 중심축이다. 러닝/걷기/자전거/스포츠/기타는 보조 경로("[+ 유산소 추가]")로만 존재하며, 웨이트와 동급의 진입 UX를 부여하지 않는다.
- **START WORKOUT FIRST**: [운동 시작]을 누르면 긴 입력 폼 없이 즉시 세션으로 이어져야 한다. 새 기능을 추가할 때 이 흐름 앞에 필수 입력 단계를 끼워 넣지 않는다.
- **ROUTINE OPTIONAL**: 루틴은 선택 사항이다. 계획형/즉흥형/추천형 사용자 중 누구도 루틴 생성을 강제받지 않는다. 루틴이 없다고 죄책감을 유발하는 문구를 쓰지 않는다.
- **REAL ACTION = GAME INPUT**: 실제 세트 완료 등 현실 운동 행동이 곧 게임의 입력이다. 게임 연출 때문에 실제 기록 입력이 느려지거나 여러 단계를 거치게 만들지 않는다.
- **RECORDS ARE OUTPUT**: `WorkoutRecord`는 세션의 결과물이지 입력 대상이 아니다. 수동 입력 폼은 항상 "놓친 기록 채우기"류의 하위/보조 기능으로만 존재한다.
- **REAL BODY DATA != GAME AVATAR PROGRESSION**: 둘은 연결될 수 있지만 같은 데이터가 아니다. 아래 다섯 가지를 함께 지킨다.
  1. **실제 신체 수치는 신뢰 가능한 소스에서만 온다.** 체중, 체지방률, 골격근량, 그 밖의 실제 Body History 수치는 사용자가 직접 입력한 값, 또는 향후 InBody / Health Connect / wearable 같은 신뢰 가능한 데이터 소스에서 들어온 값만 사용한다. 운동 횟수·XP·HELL PASS 때문에 실제 신체 수치를 자동으로 생성하거나 변경하지 않는다.
  2. **V1 캐릭터는 단일 아바타다.** 운동 기록/XP/HELL PASS로 전신이 자동으로 커지는 성장 단계(stage1~stage5)를 만들지 않는다. 특정 부위만 운동했는데 전신이 같이 커지는 표현은 실제 운동과 맞지 않는다.
  3. **운동 성취감은 캐릭터 몸이 아니라 다른 것으로 표현한다** — HELL PASS, 운동 기록, streak, 운동 완료 이펙트, (향후) 업적/칭호.
  4. 캐릭터 외형은 사용자가 온보딩/설정에서 고른 프로필(성별 표현 / 체형 프리셋 / bodyParameters)에서만 나온다. 게임 진행도가 외형 파라미터로 흘러 들어가는 경로를 만들지 않는다.
  5. **TODO(future)**: 실제 3D 모델 단계에 가면 chest / back / shoulders / arms / legs를 각각 움직이는 부위별 body parameter 확장을 검토한다. 검토 전까지 구현하지 않는다.
- **DO NOT REDESIGN CORE WITHOUT EXPLICIT USER REQUEST**: `WorkoutSession`(activeSince 기반 타이머/pause-resume/세션 복구), Exercise DB, Routine, 세트 기록 UX 등 WEIGHT CORE에서 확정한 운동 CORE 구조는 사용자의 명시적 재설계 요청이 없는 한 다시 설계하지 않는다. 그 위에 추가하고 확장하는 것이 기본값이다.
- 새 기능을 만들기 전에 **기존 구현을 먼저 확인**한다 (`src/types`, `src/services`, `src/data`, `src/context`, `src/config`). 같은 기능을 이름만 바꿔 중복 생성하지 않는다.
- 순서: 기존 구현 확인 → 재사용/확장 → 테스트.
- 대규모 리팩터링을 임의로 하지 않는다. 필요하지 않은 라이브러리를 무작정 설치하지 않는다.
- 캐릭터는 화면마다 다시 그리지 않는다 — HOME/HISTORY/RESULT/온보딩 모두 공통 `PlayerCharacter` 렌더러와 `characterAppearanceFromProfile()` 하나만 쓴다. 에셋 연결 지점은 `src/config/character-assets.ts` 한 곳이다. 히스토리의 [몸 변화]가 보여주는 숫자는 실제 입력값에서만 나오며, 값이 없으면 지어내지 말고 `-`로 둔다.
- 실제 AI 이미지 생성, LLM API, 광고 SDK, 인앱결제, 추천 서버는 V1에서 연결하지 않는다. 인터페이스 + mock 구현까지만 준비한다 (`src/services/*`).
- 변경 가능성이 높은 숫자(연속 기록 기준일, 보상 이용권 횟수, 추천 보너스 일수 등)는 `src/config/app-config.ts` 중앙 config로만 관리한다. 화면 코드에 하드코딩하지 않는다.
- 체형 등 사용자에게 민감할 수 있는 표시 문자열은 내부 ID와 분리해서 관리한다 (`src/config/body-presets.ts`). 외형을 묘사하는 표현을 도메인 ID/코드에 박지 않는다.
- 작업 전 `git status`로 진행 중인 변경사항을 확인하고 임의로 삭제하지 않는다. 작업 후 `git diff`/`git status`로 검토하고, 테스트가 통과하면 논리적 단위로 커밋한다. 원격 저장소 push는 사용자가 명시적으로 요청하기 전까지 하지 않는다.
- 작업 후 가능한 범위에서 TypeScript 검사(`npx tsc --noEmit`), lint(`npm run lint`), 관련 테스트, Expo 실행 가능성 검사를 수행한다. `package.json`에 없는 명령을 추측해서 실행하지 않는다. `npm audit fix --force`를 취약점 이유로 임의 실행하지 않는다.

## AI COMMAND CENTER (v0.1)

기존 규칙은 그대로 유효하다. 이 섹션은 그 규칙들을 **어떤 순서로 적용할지**만 정한다.

### 작업 시작 시 읽는 순서

1. `AGENTS.md`
2. `CLAUDE.md` (이 문서)
3. `PROJECT_STATE.md` — SNAPSHOT / LOCKED / CURRENT / NEXT / BLOCKED / CONFLICTS / WORKTREE WARNING
4. CURRENT와 관련된 authority 문서 (`docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `assets/characters/danbaek/canon/**`)
5. 필요할 경우 `DECISION_LOG.md`
6. 필요할 경우 `FAILURE_LOG.md`
7. 관련 `.agents/skills/**` (`safe-git-workflow` / `helchang-verify` / `danbaek-canon-guard` / `asset-integration`)

권위 순서와 충돌 처리 규칙은 `PROJECT_STATE.md`의 AUTHORITY ORDER에 있다. 서로 다른 권위 문서가 실제로 충돌하면 임의로 수정하지 않는다 — `CONFLICT`로 기록하고 중단하거나 사용자 판정을 요구한다.

### 작업 종료 전

1. 실제 diff 확인 (`git status --short`, `git diff`)
2. 관련 검증 실행 (`helchang-verify` 기준으로 범위에 맞는 것만)
3. 성공 여부 판정 — PASS / FAIL을 명시한다
4. `PROJECT_STATE.md` 업데이트 필요 여부 판단 (CURRENT / NEXT / BLOCKED / CONFLICTS)
5. 중요한 새 결정이면 `DECISION_LOG.md`에 추가
6. 재발 방지 가치가 있는 실패면 `FAILURE_LOG.md`에 추가
7. **검증하지 못한 것은 DONE으로 기록하지 않는다.** dirty tree의 존재를 완료 근거로 삼지 않는다

### AI 역할 분담

- ChatGPT — 총괄 / 계획 / 우선순위 / 작업 분해 / 최종 판정
- Claude Code — 기본 주력 구현 / 저장소 조사 / 코드 변경 / 테스트
- Codex — 고위험 변경의 독립 검증, Claude가 해결하지 못한 문제의 second opinion (필요할 때만)

같은 작업을 Claude와 Codex에 이유 없이 중복 수행시키지 않는다.

## AI COMMAND CENTER v0.2 — 근거와 자율 실행

v0.1(위 섹션)의 읽는 순서와 종료 전 절차는 그대로다. 여기에 두 가지를 더한다.

### FAILURE EVIDENCE RULE

`FAILURE_LOG.md`의 항목을 `RESOLVED`로 올리려면 **저장소에 남아 다시 실행할 수 있는 근거**가 있어야 한다. 우선순위:

1. 자동 검증 명령 (`npm run verify:*`) — 가장 강한 근거
2. 결정적인 build / type / static 검증 (`npx tsc --noEmit`, `npm run lint`)
3. 재현 가능한 수동 검증 절차 (무엇을, 어떤 순서로, 무엇을 보면 통과인지)

1이 합리적으로 가능한데 1회성 probe만 있으면 완전한 RESOLVED가 아니다 — 상태에 그 공백을 적고 승격을 NEXT로 남긴다. 반대로 **모든 실패에 테스트 파일을 만들지 않는다.** UI, 실기기, 외부 SDK처럼 자동화가 비합리적인 경우 3번으로 충분하다.

### AUTONOMY LEVELS

작업의 위험도로 정한다. 등급이 애매하면 한 단계 높게 본다.

**SAFE — 재승인 없이 실행한다.** 저장소 조사, 코드 검색, 기존 테스트/typecheck/lint 실행, 기존 규칙을 보존하는 작은 버그 수정, 테스트·검증 추가, 영향 범위가 명확하고 검증 가능한 dead code 정리, `PROJECT_STATE`/`FAILURE_LOG` 갱신, 이미 승인된 범위 안의 반복 수정과 재검증. 조사 → 최소 변경 → 검증 → 실패 시 원인 분석 → 안전 범위 내 수정 → 재검증 → 상태 기록까지 자율로 진행한다.

**GUARDED — 실행하되 강한 검증을 붙인다.** 여러 production 파일 변경, shared utility 변경, persistence/storage 변경, entitlement/monetization 변경, 공용 context/state 변경, 기존 API contract 변경, 여러 기능에 영향을 줄 수 있는 refactor. 변경 전 영향 범위 조사 → 최소 변경 → 관련 verification → typecheck/lint → 회귀 검증 → diff 검토를 모두 거친다. **검증 실패를 안전한 범위에서 해결하지 못하면 STOP.**

**APPROVAL REQUIRED — 실행하지 않는다.** LOCKED/CANON 변경, 제품 방향 변경, 미해결 CONFLICT 해결, 대규모 architecture 변경, dependency 추가/교체, destructive migration, 사용자 데이터 삭제 가능 변경, `reset`/`clean`/force push/history rewrite, production 배포, 외부 비용 발생, secret/credential 변경, 보안 정책 약화. 이 범주에서는 **문제 / 영향 / 추천안 / 필요한 승인**만 보고하고 STOP.

### CONTINUATION RULE

"계속 / 진행 / 알아서 진행 / 다음 / 이어서 해 / continue" 같은 일반 지시에는 세부 명령이 없어도 COMMAND CENTER를 읽고 CURRENT/NEXT를 복구한 뒤 진행한다. SAFE는 자율 실행, GUARDED는 이미 승인된 CURRENT/NEXT 범위라면 자율 실행 + 강화 검증, APPROVAL REQUIRED는 STOP 후 승인 요청.

CURRENT가 없으면 `PROJECT_STATE.md`의 NEXT에서 가장 가까운 실행 가능한 작업 **하나**를 고른다. NEXT도 없으면 `docs/ROADMAP.md`의 가장 가까운 미완료 확정 작업을 조사한다. **실험 아이디어를 확정 작업처럼 자동 선택하지 않는다** (`PROJECT_STATE`의 EXPERIMENTAL 포함).

### STOP CONDITIONS

다음에만 사용자에게 돌아온다: ① APPROVAL REQUIRED 발생, ② 기존 결정과 충돌, ③ 검증 실패를 안전한 범위에서 해결 불가, ④ 요구사항이 실제로 모호해 구현 방향이 둘 이상이고 제품 결과가 달라짐, ⑤ 데이터 손실 위험, ⑥ 비용 발생, ⑦ credential/secret 필요, ⑧ 작업 목표 완료.

"다음 작업을 진행해도 될까요?"라는 이유만으로 멈추지 않는다.
