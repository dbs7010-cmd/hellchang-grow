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
- **REAL BODY DATA != GAME AVATAR PROGRESSION**: 둘은 연결될 수 있지만 같은 데이터가 아니다. 아래 네 가지를 함께 지킨다.
  1. **실제 신체 수치는 신뢰 가능한 소스에서만 온다.** 체중, 체지방률, 골격근량, 그 밖의 실제 Body History 수치는 사용자가 직접 입력한 값, 또는 향후 InBody / Health Connect / wearable 같은 신뢰 가능한 데이터 소스에서 들어온 값만 사용한다. 운동 횟수·XP·HELL PASS 때문에 실제 신체 수치를 자동으로 생성하거나 변경하지 않는다.
  2. **게임 아바타 외형은 게임 진행도로 성장한다.** 운동 기록, HELL PASS, 실제 Body Growth, 그 밖의 게임 progression을 근거로 `CharacterGrowthStage`를 바꿀 수 있다. 이건 게임적 표현이지 신체 측정 결과가 아니다.
  3. 그래서 성장 단계 계산 결과가 `BodyHistoryEntry`나 `UserProfile`의 신체 수치로 흘러 들어가는 경로를 만들지 않는다. 방향은 항상 한쪽이다 — 기록/진행도 → 아바타 외형.
  4. **UI에서 성장 단계를 과학적 수치처럼 보이게 하지 않는다.** 캐릭터 단계를 근육량·체지방률 변화인 것처럼 말하거나, 단계에 kg/% 같은 단위를 붙이거나, HELL PASS Lv와 한 덩어리로 묶어 표시하지 않는다.
- **DO NOT REDESIGN CORE WITHOUT EXPLICIT USER REQUEST**: `WorkoutSession`(activeSince 기반 타이머/pause-resume/세션 복구), Exercise DB, Routine, 세트 기록 UX 등 WEIGHT CORE에서 확정한 운동 CORE 구조는 사용자의 명시적 재설계 요청이 없는 한 다시 설계하지 않는다. 그 위에 추가하고 확장하는 것이 기본값이다.
- 새 기능을 만들기 전에 **기존 구현을 먼저 확인**한다 (`src/types`, `src/services`, `src/data`, `src/context`, `src/config`). 같은 기능을 이름만 바꿔 중복 생성하지 않는다.
- 순서: 기존 구현 확인 → 재사용/확장 → 테스트.
- 대규모 리팩터링을 임의로 하지 않는다. 필요하지 않은 라이브러리를 무작정 설치하지 않는다.
- 캐릭터 외형 성장은 `CharacterGrowthStage`(stage1~stage5) 하나로만 표현하고, 계산은 `src/utils/character-growth-resolver.ts` 한 곳에서만 한다. 화면마다 성장 규칙을 다시 구현하지 않는다. 반대로 히스토리의 [몸 변화]가 보여주는 숫자는 실제 입력값에서만 나오며, 값이 없으면 지어내지 말고 `-`로 둔다.
- 실제 AI 이미지 생성, LLM API, 광고 SDK, 인앱결제, 추천 서버는 V1에서 연결하지 않는다. 인터페이스 + mock 구현까지만 준비한다 (`src/services/*`).
- 변경 가능성이 높은 숫자(연속 기록 기준일, 보상 이용권 횟수, 추천 보너스 일수 등)는 `src/config/app-config.ts` 중앙 config로만 관리한다. 화면 코드에 하드코딩하지 않는다.
- 체형 등 사용자에게 민감할 수 있는 표시 문자열은 내부 ID와 분리해서 관리한다 (`src/config/body-presets.ts`). 외형을 묘사하는 표현을 도메인 ID/코드에 박지 않는다.
- 작업 전 `git status`로 진행 중인 변경사항을 확인하고 임의로 삭제하지 않는다. 작업 후 `git diff`/`git status`로 검토하고, 테스트가 통과하면 논리적 단위로 커밋한다. 원격 저장소 push는 사용자가 명시적으로 요청하기 전까지 하지 않는다.
- 작업 후 가능한 범위에서 TypeScript 검사(`npx tsc --noEmit`), lint(`npm run lint`), 관련 테스트, Expo 실행 가능성 검사를 수행한다. `package.json`에 없는 명령을 추측해서 실행하지 않는다. `npm audit fix --force`를 취약점 이유로 임의 실행하지 않는다.
