# 헬창키우기 (가칭) — 로드맵

기획: [[product-spec]] · 구조: [[architecture]]

## M0 — 기반 구축

- [x] 저장소/`package.json` 분석, 기존 SDK 57 expo-router 템플릿 파악
- [x] 기획 문서 고정 (`docs/PRODUCT_SPEC.md`)
- [x] 아키텍처 문서 고정 (`docs/ARCHITECTURE.md`)
- [x] 로컬 저장 라이브러리 도입 (`@react-native-async-storage/async-storage`, SDK 호환 버전)
- [x] 폴더 구조 정리 (`config` / `types` / `services` / `data` / `context`)
- [x] 도메인 타입 정의
- [x] 중앙 config (`app-config.ts`, `body-presets.ts`, `trainers.ts`)
- [x] 서비스 인터페이스 + mock 구현 (광고 / 구독 / 추천인 / AI 트레이너)
- [x] repository 기반 로컬 저장 계층
- [x] `AppDataProvider` + 기본 navigation shell (`Stack.Protected`: 온보딩 vs 탭)

## M1 — 최소 실행 가능한 뼈대

- [x] 온보딩 진입 화면 (무료 체형 선택 / 내 사진으로 시작)
- [x] 내 사진으로 시작 placeholder 화면 (V1 미구현 안내, 무료 체형 선택으로 유도)
- [x] 성별 표현 선택
- [x] 체형 프리셋 선택
- [x] 체형 조절 placeholder (수동 보정 슬라이더, 시각적 반영은 다음 단계)
- [x] 홈 화면 (오늘 상태 / 트레이너 / 연속 기록 / 최근 변화, 카드 최소화)
- [x] 운동 기록 추가 + 오늘 기록 표시
- [x] 기본 스탠리 NPC 카드 (선택형 상호작용, 광고 시청 mock으로 AI PT 잠금 해제 데모)
- [x] 히스토리 기본 목록 (신체 히스토리 + 운동 기록)
- [x] 설정 화면 (mock 구독/추천인/오픈 이벤트 상태, 데이터 초기화)

M1에서는 사진 AI 생성, 실제 AI PT, 결제, 광고 SDK를 구현하지 않는다 — 모두 인터페이스/placeholder까지만.

## M2 — 핵심 루프를 실제로 만져볼 수 있는 수준

- [x] 홈 화면 핵심 루프 강화 (오늘 상태 → 기록 → 트레이너 반응 → streak → 히스토리로 자연스럽게 이어지도록 재구성)
- [x] 운동 기록에 `sports` 카테고리 추가, 기록 직후 트레이너 반응 한 줄 표시
- [x] 트레이너 대사 확충 + streak 조건형 대사(`streakPraise`) 추가, 조건 분기 로직을 `utils/trainer-dialogue.ts`로 공통화
- [x] AI PT 진입 UX를 빠른 질문 버튼 + 자유 입력창이 있는 `AiPtPanel`로 교체 (`AITrainerService.sendMessage` 추가, 여전히 mock)
- [x] 구독/광고 보상 AI PT 접근 로직 공통화 (`consumeAiAccess`) — 응답 품질 차이 없음을 코드로도 보장
- [x] 사진 기반 시작 플로우를 실제 UI로 교체 (`expo-image-picker`, 권한 거부/취소/없음 처리, 하루 1회 제한 + DEV 우회)
- [x] 체형 미세 조절 값을 `BodyAvatarPreview`(도형 + Reanimated)로 실시간 시각화, 온보딩/홈에서 재사용
- [x] 히스토리를 신체 기록 + 운동 기록 통합 뷰로 재구성 (`buildHistoryDays`), 저장 구조는 그대로 유지
- [x] 히스토리에 전후 비교 UI 뼈대 추가 (두 날짜 선택 → 사진/체중 비교, 사진 없는 날짜는 명확한 placeholder)
- [x] streak 계산을 순수 함수로 분리(`utils/streak.ts`)하고 같은 날 중복/다음 날 연속/하루 건너뜀/월말/연말 경계를 `scripts/verify-streak.ts`로 검증
- [x] 오픈 이벤트 패스를 홈 화면에서도 자연스럽게 인지하도록 배너 추가, 추천인 중복 등록 방지 UI(설정 화면에서 등록된 코드 표시)

M2에서도 실제 LLM API, 광고 SDK, 인앱결제, 추천 서버는 연결하지 않는다 — 서비스 인터페이스와 mock 구조를 유지한다. 사진 선택 UI는 실제로 동작하지만 AI 이미지 변환은 여전히 없다.

## Realtime Core — "기록 앱"에서 "실시간 운동 연동 게임"으로 재정의

M2까지는 운동을 마친 뒤 사용자가 직접 입력하는 방식이 메인 플레이였다. 이 단계에서 제품 핵심을 "운동 시작 버튼을 누르는 순간 현실 운동과 앱의 세션이 동시에 시작되는" 실시간 루프로 재정의했다([[product-spec]] 0장). 기존 M0~M2에서 만든 온보딩/체형/사진/AsyncStorage repository/AppDataProvider/streak/히스토리/Trainer/Stanley/AITrainerService/광고·구독·추천인·오픈이벤트 mock/설정 화면은 전부 그대로 유지하고 재사용했다 — 새로 만든 것은 그 위에 얹은 `WorkoutSession` 도메인과 화면 배치 변경뿐이다.

- [x] `WorkoutSession` 도메인 추가 (`types/workout-session.ts`) — 기존 `WorkoutRecord`/`WorkoutExercise`와 충돌하지 않고, `activities`는 `WorkoutExercise`를 재사용
- [x] 세션 상태 전이를 순수 함수로 구현(`utils/workout-session.ts`): 시작/일시정지/재개/카테고리 변경/상세 기록 추가/종료. 경과 시간은 항상 `activeSince` 기준 재계산이라 백그라운드/일시정지를 거쳐도 드리프트가 없다
- [x] `scripts/verify-workout-session.ts`(`npm run verify:session`)로 90초·45분 시간 점프, 여러 번의 일시정지-재개, 세션 완료 시 분 반올림 등 24개 시나리오 검증
- [x] 진행 중인 세션 1개만 저장하는 `workout-session-repository` 추가 (별도 세션 히스토리 저장소는 만들지 않음 — 완료 시 기존 `addWorkoutRecord` 액션을 그대로 호출해 `WorkoutRecord`/streak로 흡수)
- [x] `AppDataProvider`에 `activeSession` 상태 + `startWorkoutSession`/`pauseWorkoutSession`/`resumeWorkoutSession`/`changeSessionCategory`/`addSessionActivity`/`endWorkoutSession` 액션 추가, `addWorkoutRecord`가 갱신된 `{workoutRecords, streak}`를 반환하도록 확장(세션 종료 요약에 재사용)
- [x] 홈 화면을 "캐릭터 + Stanley 한 줄 + 매우 큰 [운동 시작] 버튼 + 이번 주 N회·연속 M일째"로 재구성, 기존 "오늘 기록"/"최근 변화" 카드 제거(정보는 세션 결과/히스토리 탭으로 이동)
- [x] `PrimaryButton`에 `size="large"` 옵션 추가 (기존 컴포넌트 확장, 새 컴포넌트 만들지 않음)
- [x] 실시간 운동 세션 전체화면(`src/app/session.tsx`) 추가 — 실시간 타이머, 캐릭터, 운동 종류 변경, 웨이트 상세 기록(선택), 일시정지/재개, 종료, 종료 후 결과 요약
- [x] Stanley 실시간 반응 대사 풀 추가(`TrainerDialogueSet`에 `session*` 필드 8종): 시작/오늘 두 번째 세션/10분/20~30분/장시간/일시정지/재개/종료
- [x] 운동 기록 탭 역할 변경: 오늘 자동 기록을 상단에, 기존 수동 입력 폼은 "놓친 기록 수동으로 추가"로 하위 배치(기능은 그대로 재사용, 강제 입력 없음)
- [x] streak/꾸준함 보상이 실제 완료된 세션(=WorkoutRecord 생성) 기준으로만 갱신됨을 재사용 경로로 보장 — 앱 실행만으로는 절대 증가하지 않음, 같은 날 두 번째 세션도 기존 `computeStreakUpdate` 가드로 하루 1일만 증가

Realtime Core에서도 실제 LLM API, 광고 SDK, 인앱결제, 추천 서버는 연결하지 않는다. 최종 아트도 만들지 않는다 — 캐릭터는 여전히 `BodyAvatarPreview` 도형 preview, 세션 중 상태는 이모지 배지("🟢 운동 중" / "⏸ 일시정지")로만 표현한다.

## WEIGHT CORE — V1 운동 CORE 최종 확정 (잠금)

**이 마일스톤은 V1의 운동 CORE 구조를 최종 확정(lock)한다.** 이후 게임성/아트/AI/수익화/출시 품질은 이 구조 위에 추가하며, 사용자의 명시적 요청 없이는 운동 CORE 구조를 다시 설계하지 않는다([[product-spec]] 0-A장, `CLAUDE.md`의 NON-NEGOTIABLE PRODUCT RULES). Realtime Core에서 만든 `WorkoutSession`(activeSince 기반 타이머, pause/resume, 세션 복구), streak, 히스토리, AsyncStorage/repository 구조, `AppDataProvider`, Trainer/Stanley, `AITrainerService`, 광고/구독/추천인/오픈이벤트 mock, 온보딩, 체형/사진 시스템은 전부 그대로 재사용했다 — 세션 엔진을 새로 만들지 않고 그 위에 웨이트 중심 기능을 얹었다.

- [x] 웨이트를 제품 중심축으로 재배치: 부위(가슴/등/하체/어깨/팔/전신) 진입이 주 경로, 러닝/걷기/자전거/스포츠/기타는 "[+ 유산소 추가]" 보조 경로로 이동. 기존 카테고리/데이터는 그대로 유지
- [x] Exercise DB 추가(`config/exercises.ts`, `types/exercise.ts`) — 44개 정적 운동, `getExerciseById`/`getExercisesByMuscleGroup`/`searchExercises` 헬퍼, [직접 운동 추가]로 DB 밖 운동도 지원
- [x] `workout-start.tsx` 신설 — [운동 시작] 직후 계획형(오늘 예정 루틴)/즉흥형(부위 선택)/추천형(오늘 뭐 하지?) 세 경로를 모두 같은 `startWorkoutSession()`으로 수렴시킴. 루틴 생성 강제 없음
- [x] Routine 도메인 추가(`types/routine.ts`, `data/routine-repository.ts`) — 완전히 선택 사항, `scheduledDays`가 있으면 그 요일 홈에서 자동 제안, 없어도 언제든 선택 가능
- [x] `WorkoutSession`/`WorkoutExercise`를 세트 단위로 확장(`SessionExerciseEntry`, `WorkoutSetEntry`) — 기존 필드는 전부 optional 추가라 과거 저장 데이터와 호환. `activities`를 `exercises`로 대체
- [x] 실시간 세트 기록 UX(`session.tsx`) — 지난 세트 값을 기본값으로 제안, 중량/횟수 입력 + 체크로 완료, "세트 완료 = 게임 입력" 원칙에 따라 짧은 즉시 피드백(Stanley 한마디, PR이면 NEW PR 콜아웃)
- [x] 이전 기록 조회(`utils/exercise-history.ts` `findPreviousPerformance`) — Exercise ID 기준 마지막 세션/무게/횟수/세트 구성, legacy 기록도 fallback으로 조회 가능
- [x] PR 판정(`detectPRs`) — "이전보다 높은 중량 성공"만 단순 판정, 완료된 세트만 대상, 세션 종료 요약에 "NEW PR" 카드로 노출
- [x] 휴식 타이머(60/90/120초 + 커스텀, `restUntilMs` 절대시각 패턴 재사용) — 완전히 선택/스킵 가능, 세션 타이머는 휴식 중에도 계속 흐름
- [x] 다음 운동 이동 + 세션 중 [+ 운동 추가] — 루틴 순서 또는 사용자가 고른 다음 운동으로 전환, 언제든 운동 추가 가능
- [x] 운동 종료 자동 집계 확장 — 실제 소요 시간/운동 수/총 세트/총 볼륨(중량×횟수, 완료된 세트만)/PR/주간 횟수/streak를 재입력 없이 자동 계산
- [x] PASS 진행도 도메인 추가(`types/pass.ts`, `utils/pass.ts`, `data/pass-repository.ts`) — 세션 완료/PR/루틴 완료 시 XP 적립, 레벨은 항상 XP로부터 계산(저장 안 함), 실제 몸 파라미터는 절대 변경하지 않음
- [x] 홈에 PASS 진행 바 노출("HELL PASS Lv.N") — 보조 요소로만, 캐릭터/오늘의 운동/[운동 시작]이 여전히 주인공
- [x] 홈 정보 우선순위 재배치: PASS 진행도 → 캐릭터 → Stanley 한마디 → 오늘 제안(루틴 또는 "오늘은 뭐 조질까?", 죄책감 유발 문구 금지) → [운동 시작] → 주간 횟수/streak
- [x] 운동 탭 역할 전환 — 수동 기록 입력 화면에서 "내 루틴/루틴 만들기/운동 DB 탐색/부위별 탐색/운동 검색/운동 정보"로 전환, 탭 라벨도 "운동 기록" → "운동"으로 변경(더 이상 기록 입력이 아님을 반영)
- [x] 과거 `WorkoutRecord` 조회 + 놓친 기록 수동 입력 폼을 히스토리 탭으로 이동(운동 탭에서 제거)
- [x] Stanley 게임 반응 확장 — 세션 상태 조건에 첫 세트/여러 세트 완료/긴 휴식/운동 종목 변경/PR/루틴 절반/루틴 완료 대사 추가, 여전히 결정론적 대사 풀(LLM 호출 없음)이며 AI PT와 명확히 분리
- [x] 순수 함수 검증 스크립트 추가(`scripts/verify-weight-core.ts`, `npm run verify:weight-core`) — 이전 기록 조회/PR 판정/부위 추천/루틴 요일 매칭/PASS 레벨 계산 27개 시나리오 검증, 기존 `verify:streak`/`verify:session`도 계속 통과
- [x] Playwright로 온보딩→홈→[운동 시작]→즉흥형 부위 선택→운동 DB 후보→세트 기록→PR/볼륨 자동 집계→PASS XP 반영→같은 날 두 번째 세션(streak 미중복)→새로고침 후 세션 복구까지 브라우저에서 클릭 검증

WEIGHT CORE에서도 실제 LLM API, 광고 SDK, 인앱결제, 추천 서버, 실제 1RM 계산은 연결/구현하지 않는다. 최종 아트도 여전히 없다 — 세트 완료 피드백은 텍스트/이모지 placeholder 수준이며, 구조만 최종 아트 교체가 쉽게 준비돼 있다.

## WORKOUT CORE — 실제 헬스장 사용성 기준으로 운동 흐름 재정비

WEIGHT CORE로 잠근 구조(activeSince 타이머 / Exercise DB / Routine / 세트 기록 / PR / PASS)는 그대로 두고 그 위에 올린 작업이다. 새 캐릭터/새 디자인 시스템/새 저장소를 만들지 않았다.

- [x] Exercise 공통 데이터 규격 확정 — `ResolvedExercise`(category / animationFamily / primaryMuscles / secondaryMuscles / spDistribution / usesWeight / usesBodyWeight / uses1RM / defaultSets / defaultReps / defaultRestSeconds / difficulty / guideId / alternativeExerciseIds)와 `resolveExercise()` 유도 규칙 추가. 기존 44개 항목은 `animationFamily`만 명시하고 나머지는 유도값이라 재작성하지 않았다. 프리웨이트/머신/케이블/맨몸은 여전히 같은 모델 하나를 쓴다
- [x] Motion Family 도입(`config/motion-families.ts`) — 15개 공통 모션 파라미터, `Exercise.animationFamily`로 연결. 종목별 애니메이션은 만들지 않았고, 세션 화면이 family만 보고 캐릭터 모션을 돌리는 구조까지만 준비
- [x] `CharacterMotionStage` 추가 — 공통 `PlayerCharacter` 렌더러를 그대로 쓰고 모션 레이어만 덧입힌다(화면마다 캐릭터를 다시 그리지 않는 규칙 유지). 새 캐릭터 이미지 없음, `character-assets.ts`에 `session` 슬롯만 추가(비우면 home으로 fallback)
- [x] `workout-start.tsx` 재구성 — [지난 루틴 계속하기] / [오늘 추천] / [직접 선택] 세 줄이 화면 순서 그대로 우선순위다. 후보 계산은 `buildQuickStartPlan()`(순수 함수)으로 분리했고, 루틴이 있는 사용자는 한 번의 터치로 세션에 진입한다
- [x] 세션 조작 단순화 — `ensurePendingSet()`으로 "지금 채울 세트"를 항상 유지(= [+ 세트 시작] 탭 제거), `completeSetAndStartRest()`로 세트 완료 → 자동 휴식을 한 번의 상태 변경으로 처리(팝업 없음). 스테퍼 버튼 48 → 56px
- [x] 세션 화면 정보 정리 — 현재 운동명 / "N / M 세트"(`getSetProgress`) / 중량 / 횟수 / 지난 기록 / 휴식 / 다음 운동 / 운동 종료. 지난 기록 줄을 스크롤 안쪽에서 세트 조작 바로 위로 올렸다
- [x] `WorkoutSessionResult` 도메인 추가(`types/growth.ts`, `utils/workout-session-result.ts`) — 총 시간/세트/반복/볼륨/운동별 기록/PR/부위별 볼륨(spDistribution 적용)/체중. 완료된 세트만 포함하며 PR 판정은 기존 `detectPRs`와 같은 기준
- [x] GrowthEngine 서비스 경계 추가(`services/growth/`) — 인터페이스 + no-op 구현까지만. `endWorkoutSession()`이 결과를 넘기는 호출부는 이미 연결돼 있고, 실제 성장 계산은 다음 작업에서 구현한다
- [x] `scripts/verify-workout-core.ts`(`npm run verify:workout-core`) 추가 — Exercise 규격 유도/DB 불변식, 세트 자동 준비와 세트 완료→휴식 전이, WorkoutSessionResult 집계와 PR 일치, 빠른 시작 후보 우선순위 등 46개 시나리오. 기존 `verify:streak`/`verify:session`/`verify:weight-core`/`verify:pt`도 계속 통과

WORKOUT CORE에서도 실제 애니메이션 클립, LLM API, 광고 SDK, 인앱결제, 1RM 계산, 성장(SP) 계산은 연결/구현하지 않는다.

## GROWTH ENGINE — 실제 운동 기록 → 부위별 SP → 성장 상태

WORKOUT CORE에서 만든 `growthEngine.applySessionResult(sessionResult)` 연결점을 그대로 쓰고, 그 안을 채웠다. 운동 시작 UX / 세션 UI / Exercise 모델 / MotionFamily / 홈 / 단백이 디자인은 건드리지 않았다.

- [x] 세부 부위 도입 — `MuscleGroupDetail` 13종 + `MuscleDetailToGroup` 매핑. 기존 `MuscleGroup`(UI 묶음)을 대체하지 않고 계층으로 확장했다. 저장/계산은 세부, 화면은 묶음
- [x] `Exercise.muscleSpDistribution` — 합 1.0의 세부 부위 분배. 대표 운동 24종은 명시(벤치 0.6/0.25/0.15 등), 나머지는 `spDistribution` + `animationFamily`에서 유도(컬=이두, 익스텐션=삼두, 레이즈=측면 어깨…)
- [x] SP 계산(`utils/growth-calculation.ts`) — 유효 부하 → 추정 1RM → 상대 강도 구간 → 반복 포화 → 부위별 피로도 → 세트 자극 → 부위 분배. 단계별 순수 함수로 분리했고 거대 함수를 만들지 않았다
- [x] 상대 강도 우선 — 절대 중량이 아니라 부하÷1RM 구간으로 판정. 1RM은 과거 기록 + 이번 세션에서 추정하며, 없으면 중립 배수로 계산해 0점이 되지 않는다
- [x] 맨몸 운동 — `체중 × bodyWeightLoadFactor + 추가 중량`. 계수는 동작 패턴에서 유도하고 필요한 종목만 override(풀업 1.0 / 딥스 0.95 / 푸쉬업 0.65 …). 웨이트 딥스/풀업도 그대로 계산된다
- [x] 악용 방지 — 반복수 포화(1kg×1000회 ≪ 정상 1세트), 중량 sanity clamp, 부위별 세트 diminishing return(운동을 바꿔도 이어짐), 하루 soft cap(끊지 않고 초과분 효율만 감소)
- [x] 성장 상태(`types/growth.ts`, `utils/growth-state.ts`, `data/growth-repository.ts`) — 부위별 `{totalSp, currentStage, lastGainAt}` + 총합 + 당일 집계 + 마지막 반영 세션. 기존 AsyncStorage repository 패턴 그대로이며 새 저장 기술을 도입하지 않았다. 없거나 낡은 저장값은 `migrateGrowthState()`가 채운다
- [x] stage threshold를 config로 분리 — 0~5, 비선형(초반 빠르게 → 후반 장기 목표). stage는 항상 threshold에서 재계산되고, 한 세션에 한 단계까지만 오른다(넘친 SP는 다음 세션으로 이월)
- [x] pump 분리 — 세션 한정 일시값으로 결과에만 실어 보내고 저장하지 않는다 (다음 단계 연출용)
- [x] `GrowthApplicationResult` 반환 — gainedSpByMuscle / previousStages / currentStages / stageChanges / pumpByMuscle / totalSpGained. `EndSessionSummary.growth`로 화면까지 연결됐다
- [x] 밸런스 상수 일원화(`config/growth-config.ts`) — 1RM 계수 / 강도 구간 / 반복 포화 / 피로도 / 하루 상한 / stage threshold / 맨몸 부하 계수. 계산 코드에 magic number 없음
- [x] `scripts/verify-growth-engine.ts`(`npm run verify:growth`) — 68개 시나리오. 상대 강도 차이, 1RM이 다른 두 사용자, 부위 분배, 맨몸 0 SP 금지, 체중별 부하 차이, 반복/세트 악용 방지, threshold 통과, 단일 세션 다단계 점프 금지, 저장 왕복/migration까지 검증. 기존 verify 스크립트 4종도 계속 통과
- [x] 실기기 대신 웹에서 전체 흐름 확인 — 운동 시작 → 세트 완료 → 종료 → SP 저장 → 새로고침 후 유지 → 두 번째 세션 누적

GROWTH ENGINE에서도 지방/식단 계산, 단백이 외형 변환(Visual Body), 실제 애니메이션, LLM/광고/결제는 구현하지 않는다. Fat 축은 `DanbaekGrowthState.body` 자리만 비워 뒀고 근육 SP 계산과 섞이지 않는다.

## BODY STATE — 근육 + 지방 + 식단/회복 → 단백이 신체 파라미터

WORKOUT CORE와 GROWTH ENGINE은 그대로 두고(공식/threshold/세션 UI/Exercise 모델 무수정) 그 위에 표현 레이어만 얹었다. 실제 캐릭터 그림은 아직 바꾸지 않는다.

- [x] `DanbaekBodyState` 도입 — 세부 근육 stage(13) + 렌더링 묶음(8, `VisualMuscleGroup`) + 근육량 점수 + fatStage/definitionStage + 식단/회복/체중 추세 + 체형 label. 저장하지 않고 매번 계산한다
- [x] 축 분리 유지 — 근육과 지방은 서로를 바꾸지 않고 표현 레이어에서만 조합된다. PASS XP는 여전히 별개
- [x] 체지방 우선순위 — 실제 입력값 > (체중 추세 + 식단이 둘 다 있을 때) 게임 추정 > 중립 기본값. 결과에 `fatStageSource`가 항상 붙어 추정을 측정처럼 표시할 수 없다
- [x] 체중 추세(`computeWeightTrend`) — 21일 창 / 최소 2건 / 1kg 이상일 때만 gaining·losing. 하루 변동에 반응하지 않고 증감량을 주장하지 않는다
- [x] definition 공식 — `leanness × (base + gain × 근육량)`. 마른/선명/근돼/말랑 네 방향이 분기 없이 이 식에서 나온다. `shapeProfile`은 설명 label일 뿐 성장을 제한하지 않는다
- [x] `DanbaekBodyParameters` — 부위별 scale(가슴/어깨/팔/등 너비·두께/둔근/허벅지/종아리) + waist + abdomenDefinition + overallMass/fatSoftness/definition, 전부 0~1. 렌더러는 SP도 stage도 모른다
- [x] 비선형 성장 곡선 — stage→시각 스케일 `[0, 0.08, 0.2, 0.4, 0.68, 1]`. 초반은 미세하고 최종 단계에서 과장된다
- [x] Pump 분리 — `applyPumpToBodyParameters()`로 결과 화면에서만 잠깐 얹고 저장하지 않는다. 세션 요약의 `bodyParametersWithPump`가 연결점이며 재실행 후 남지 않는다
- [x] 식단/회복 입력 경로 — `NutritionState`/`RecoveryState`(good·normal·poor·unknown)와 `setNutritionState()`/`setRecoveryState()`. 새 식단 화면이나 음식 DB는 만들지 않았고, 이 값은 지방 추정·표현에만 쓰이며 근육 SP를 만들지 않는다
- [x] 저장은 기존 `DanbaekGrowthState.body` 안에서 — 입력(식단/회복)과 캐시(fat/definition/lastCalculatedAt)만 넣고 근육 stage는 중복 저장하지 않는다. 입력이 바뀔 때마다(세션 종료 / 신체 기록 / 식단·회복) 캐시를 함께 갱신한다
- [x] migration — body가 없던 기존 사용자는 중립 상태로 안전하게 동작하고, 깨진 값은 버린다. 근육 SP/운동 기록은 어떤 경우에도 초기화되지 않는다
- [x] `scripts/verify-body-state.ts`(`npm run verify:body`, 89개 시나리오) 추가 — 부위별 반영, 비선형 곡선, 체지방 우선순위, 네 가지 조합, 펌핑 비영속, 저장 왕복/migration. 기존 verify 5종도 계속 통과
- [x] 웹에서 실제 확인 — 세션 종료 시 body 캐시 생성, 실제 체지방률 입력 시 measured 우선, 신체 기록 변경이 지방 축만 바꾸고 근육 SP는 그대로

BODY STATE에서도 실제 캐릭터 그림/에셋, 애니메이션, 식단 화면, 음식 DB, 체지방 시뮬레이션은 만들지 않는다.

## M3 — 다음 단계 (아직 착수하지 않음)

- 실제 캐릭터/트레이너 아트 자산 반영 (이모지 → 실제 이미지, `TrainerProfile.portraitPlaceholder` 대체), 세트 완료/PR 연출에 실제 애니메이션 추가
- AI PT가 최근 WorkoutRecord/Routine/Exercise DB/이전 기록을 컨텍스트로 활용하도록 연결, AI 추천 루틴에서 "[이 루틴으로 운동 시작]"으로 바로 세션 진입
- AI PT 대화 로그를 세션 간 유지할지 여부 결정 (현재는 화면을 벗어나면 사라지는 로컬 state)
- 히스토리 전후 비교에 실제 신체 변화 지표(체지방률 등) 추가 검토
- 알림/리마인더 검토
- PR 판정을 단순 "이전보다 높은 중량" 이상으로 확장할지 검토 (1RM 추정 등, 데이터 모델은 이미 확장 가능하게 설계됨)
- 세션 중 앱이 완전히 종료(kill)됐다가 재실행됐을 때의 복구 경험 실기기 검증 (현재는 로컬 저장 기반 복구 로직만 구현, 실제 iOS/Android 백그라운드 kill 정책까지는 검증 못함)
- 실제 서비스 연동 착수 여부는 별도 논의 후 결정 (LLM API, 광고 SDK, 결제 SDK, 실제 추천 서버 등)
- 위 항목들은 모두 WEIGHT CORE로 잠긴 운동 CORE 구조 위에 추가하는 것을 전제로 한다 — 구조 자체를 다시 설계하지 않는다

### M3 구현 현황 메모 (2026-08-25 조사)

**위 항목을 바꾸거나 지우지 않는다.** 아래는 "지금 저장소에 실제로 무엇이 있는가"만 적은 상태 스냅샷이다 — 계획 변경이 아니라, 다음 작업을 고를 때 이미 된 것을 다시 고르지 않기 위한 메모다. 원본은 코드와 verify 스크립트다.

| M3 항목 | 현재 상태 | 근거 |
| --- | --- | --- |
| 캐릭터 아트 반영 | **반영됨** — CANON 렌더러가 BodyParameters로 그린다 | `ec40521`, `npm run verify:character-body` |
| 트레이너 아트 반영 | **미완** — `portraitPlaceholder`가 여전히 이모지 | `src/config/trainers.ts` |
| 세트 완료/PR 연출 | **부분** — 반응/결과 연출은 있고 실제 애니메이션 클립은 없다 | `5a2ae72`, `0dfbe4e`, `verify:workout-character-motion`, `verify:growth-reveal` |
| AI PT 컨텍스트 연결 | **구현됨** — 최근 기록/PR/루틴/Exercise/진행 중 세션이 압축 컨텍스트로 전달된다 | `src/utils/pt-context.ts`, `src/services/trainer/*`, `npm run verify:pt` |
| "[이 루틴으로 운동 시작]" | **미착수** — AI가 구조화된 루틴을 돌려주는 계약이 없다. 제품 설계 + LLM 연결 결정이 선행돼야 한다([[decision-log]] `DEC-003`) | `src/app/ai-chat.tsx`, `src/services/trainer/offline-trainer-service.ts` |
| 대화 로그 세션 간 유지 | **결정 미정 그대로** — 로컬 state뿐 | `src/components/trainer/ai-pt-panel.tsx` |
| 히스토리 신체 지표 | **반영됨** — 체지방률/골격근량 입력과 표시가 있다(전후 비교 확장은 별개) | `src/app/(tabs)/history.tsx` |
| 알림/리마인더 | **부분** — 앱 안 알림 화면은 있고, 실제 푸시/리마인더는 없다(`expo-notifications` 미설치) | `src/app/notifications.tsx`, `package.json` |
| PR 판정 확장 | **미착수** — 여전히 "이전보다 높은 중량" 단순 기준 | `src/utils/exercise-history.ts` |
| kill 복구 실기기 검증 | **절차만 확보** — 재현 가능한 수동 절차가 있고 아직 수행되지 않았다 | `scripts/verify-storage-recovery.ts` 하단 |
| 실제 서비스 연동 | **경계까지만** — remote PT 어댑터/entitlement/광고 어댑터 경계는 있고 실제 연결은 없다. `DEC-003` 유지 | `b2a3f65`, `10e4169`, `4b23f17` |
