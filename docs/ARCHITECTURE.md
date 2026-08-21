# 헬창키우기 (가칭) — V1 아키텍처

기획 원문은 [[product-spec]] 참고. 이 문서는 그 기획을 코드로 옮기기 위한 데이터 모델, 서비스 경계, 저장 구조, 화면 구조를 정의한다.

## 0. 기존 저장소 스캐폴드

`create-expo-app` 기본 템플릿(SDK 57, expo-router, TypeScript, NativeTabs)을 그대로 사용한다.

- 라우터 루트: `src/app` (expo-router가 자동 인식)
- 경로 별칭: `@/*` → `src/*`, `@/assets/*` → `assets/*`
- 디자인 토큰: `src/constants/theme.ts` (`Colors`, `Spacing`, `Fonts`)의 `ThemedText` / `ThemedView` / `useTheme()`를 그대로 재사용한다. 새 색상 팔레트를 새로 만들지 않는다.
- 템플릿 데모 화면(`Welcome to Expo`, `Explore` 탭)과 데모 전용 컴포넌트(`hint-row`, `web-badge`, `collapsible`)는 실제 앱 화면으로 교체하면서 제거한다. `animated-icon`(스플래시), `app-tabs`(탭 네비게이션 셸), `external-link`은 재사용한다.

## 1. 폴더 구조

```
src/
  app/                        expo-router 라우트
    _layout.tsx                루트: Provider + Stack.Protected(onboarding|tabs+session)
    (onboarding)/               온보딩 스택 (온보딩 미완료 시에만 접근 가능)
      _layout.tsx
      index.tsx                 시작 방법 선택 (무료 체형 / 내 사진)
      photo-start.tsx            "내 사진으로 시작" — 실제 사진 선택/미리보기 (M2)
      gender.tsx                 성별 표현 선택
      body-preset.tsx            체형 프리셋 선택
      body-adjust.tsx            체형 미세 조절 + 실시간 실루엣 preview + 온보딩 완료
    (tabs)/                     메인 탭 (온보딩 완료 후에만 접근 가능)
      _layout.tsx                 AppTabs (NativeTabs / web variant)
      index.tsx                   홈 — PASS 진행도 + 캐릭터 + 오늘 제안 + 매우 큰 [운동 시작]
      workout.tsx                  운동 — 내 루틴(생성/편집) + 운동 DB 탐색(부위별/검색/상세)
      trainer.tsx                   트레이너
      history.tsx                    히스토리 (통합 뷰 + 전후 비교 + 놓친 기록 수동 추가)
      settings.tsx                    내 정보/설정
    session.tsx                 실시간 운동 세션 전체화면 — (tabs)와 같은 Stack.Protected 아래
                                 있지만 탭이 아닌 형제 Stack.Screen (탭바 없이 몰입 화면)
    workout-start.tsx           [운동 시작] 직후 진입하는 사전 선택 화면 — (tabs)/session과 같은
                                 Stack.Protected 아래의 형제 Stack.Screen. 계획형/즉흥형/추천형
                                 세 경로 모두 여기서 WorkoutSession 시작으로 수렴한다 (5.5-A장)
  components/                 재사용 UI (테마 wrapper + 신규 ui 프리미티브)
    body-avatar-preview.tsx     체형 보정값을 도형으로 즉시 반영하는 실루엣 preview
    trainer/ai-pt-panel.tsx     AI PT 빠른 질문 + 자유 입력 채팅형 패널
    ui/photo-slot.tsx           사진 유무를 명확히 구분하는 사진 슬롯 (깨진 이미지 방지)
    ui/progress-bar.tsx         PASS 진행도 표시용 단순 진행 바
  config/                      중앙 설정 (숫자/문자열 상수)
    exercises.ts                 Exercise DB (정적 데이터, 44개) + 조회/검색 헬퍼
    muscle-groups.ts             MuscleGroup 목록 + 표시 라벨
    weekdays.ts                  루틴 요일 표시 라벨 (Date.getDay() 순서와 동일)
  types/                       도메인 타입
  services/                    외부 연동 인터페이스 + mock 구현
  data/                        로컬 저장 기반 repository (CRUD)
    routine-repository.ts        Routine CRUD
    pass-repository.ts           PassState 읽기/쓰기
  context/                     AppDataProvider / OnboardingDraftProvider (앱 전역 상태)
  utils/                       순수 함수 유틸 (streak/세션 계산, 날짜, 히스토리 병합, 트레이너 대사 선택)
    exercise-history.ts          이전 기록 조회(findPreviousPerformance) + PR 판정(detectPRs)
    workout-recommendation.ts    "오늘 뭐 하지?" 결정론적 부위 추천
    routine.ts                   요일 예약 루틴 조회
    pass.ts                      PASS XP 누적 + 레벨 계산
```

## 2. 도메인 타입 (`src/types`)

| 파일 | 타입 | 비고 |
|---|---|---|
| `user.ts` | `UserProfile`, `GenderExpression`, `SetupMethod` | 온보딩 결과. `setupMethod: 'preset' \| 'photo'`로 향후 업그레이드 가능 |
| `body.ts` | `BodyParameters`, `BodyHistoryEntry`, `BodyHistorySource` | `source: 'manual' \| 'photo' \| 'future_ai'`. 구독 종료돼도 삭제되지 않음 |
| `workout.ts` | `WorkoutRecord`, `WorkoutCategory`, `WorkoutExercise`, `WorkoutSetEntry` | `category: strength\|home\|running\|walking\|cycling\|sports\|other`. 대부분 `WorkoutSession` 종료 시 자동 생성됨. `WorkoutExercise`에 `exerciseId?`, `setDetails?: WorkoutSetEntry[]`를 **추가만** 해서(둘 다 optional) 기존 저장 데이터와 호환 유지 |
| `workout-session.ts` | `WorkoutSession`, `SessionExerciseEntry`, `WorkoutSessionStatus` | 실시간 세션. `exercises: SessionExerciseEntry[]`가 세션 중 운동별 세트를 담는다(WEIGHT CORE에서 `activities`를 대체). `currentExerciseId?`, `restUntilMs?`, `primaryMuscleGroup?`, `routineId?` 추가 |
| `exercise.ts` | `ExerciseDefinition`, `MuscleGroup`, `Equipment`, `ExerciseTrackingType` | 정적 Exercise DB의 항목 타입. `trackingType: weight_reps\|reps_only\|duration` |
| `routine.ts` | `Routine` | `{id, name, exerciseIds, scheduledDays?, createdAt, updatedAt}`. `scheduledDays`는 선택 — 없으면 자동 제안되지 않을 뿐 언제든 수동 선택 가능 |
| `pass.ts` | `PassState` | `{xp: number}`. 레벨은 저장하지 않고 항상 `computePassLevelProgress(xp)`로 계산 |
| `trainer.ts` | `TrainerProfile`, `TrainerDialogueSet`, `TrainerUnlockRule`, `TrainerMonetizationRule` | 스탠리 전용 구조가 아니라 다수 트레이너를 표현할 수 있는 일반 구조. `dialogueSet.streakPraise`로 streak 조건형 대사, `session*` 필드들로 세션 상태 조건형 대사 지원 |
| `streak.ts` | `StreakState` | 연속 기록일수, 보상 수령 여부 |
| `subscription.ts` | `SubscriptionState` | mock 구독 상태 (가격 하드코딩 없음) |
| `referral.ts` | `ReferralState` | 추천인 코드 등록 결과, 중복 방지 필드 포함 |
| `ads.ts` | `RewardedAdResult`, `TrainerUsageState` | 광고 시청으로 얻는 AI PT 이용권 상태 |
| `event.ts` | `OpenEventPassState` | 오픈 이벤트 무료 패스 상태 |

체형 프리셋은 **ID와 표시 문자열을 분리**한다: `src/config/body-presets.ts`의 `BodyPresetId`(`lean` \| `balanced` \| `sturdy`)와 `BodyPresetLabels`(중립적 한국어 표시명)를 따로 둔다. 보상 트레이너 등 민감할 수 있는 설정도 `rewardTrainerId`, `rewardTrainerSessionCount` 같은 일반화된 이름만 코드에 남긴다 (외형 묘사를 ID/코드에 넣지 않는다).

## 3. 중앙 설정 (`src/config/app-config.ts`)

변경 가능성이 높은 숫자를 한 곳에 모은다:

```ts
streakRewardDays          // 꾸준함 보상 연속 기록 기준일
rewardTrainerId           // 보상으로 풀리는 트레이너 ID (일반화된 이름)
rewardTrainerSessionCount // 보상 이용권 횟수
referralBonusDays         // 추천인 등록 시 추가되는 패스 일수
dailyPhotoLimit           // 사진 기반 업데이트 일일 최대 횟수
rewardedPtUses            // 광고 1회 시청으로 얻는 AI PT 이용 횟수
openEventPassDays         // 오픈 이벤트 무료 패스 기간
passXpPerSession          // 세션 완료 시 지급되는 PASS XP
passXpPerPr               // PR 1건당 추가 PASS XP
passXpPerRoutineCompletion // 루틴 전체 완료 시 추가 PASS XP
passXpPerLevel            // 레벨당 필요 XP (레벨 = floor(xp / 이 값) + 1)
restTimerPresetsSeconds   // 휴식 타이머 프리셋 [60, 90, 120]
defaultRestSeconds        // 커스텀 입력 없을 때 기본 휴식 시간
```

화면 코드에서 이 숫자들을 직접 쓰지 않고 항상 `AppConfig`를 통해 참조한다.

## 4. 서비스 경계 (`src/services`)

각 외부 연동은 **인터페이스 + mock 구현**으로 분리한다. 실제 SDK/API를 붙일 때 인터페이스를 구현하는 새 클래스만 추가하면 되고, 호출부(Context/화면)는 바뀌지 않는다.

| 인터페이스 | mock 구현 | 향후 교체 대상 |
|---|---|---|
| `RewardedAdService` (`ads/`) | `MockRewardedAdService` | 실제 AdMob SDK |
| `SubscriptionService` (`subscription/`) | `MockSubscriptionService` | 실제 인앱결제 SDK |
| `ReferralService` (`referral/`) | `MockReferralService` (로컬 상태 기반) | 실제 추천인 서버 |
| `AITrainerService` (`trainer/`) | `MockAITrainerService` (캔드 응답) | 실제 LLM API |

`AITrainerService`는 `sendQuickAction(actionId)`(빠른 질문 버튼)과 `sendMessage(text)`(자유 입력) 두 메서드를 노출한다. 구독 이용자와 광고 보상 이용자는 동일한 이 인터페이스를 호출한다 — 응답 품질 차이는 없고, `AppDataProvider`의 `consumeAiAccess()`가 접근 방식(구독 vs 이용권 차감)만 분기한다.

무료 NPC 대사(스탠리 기본 PT)는 별도 서비스가 아니라 `TrainerProfile.dialogueSet`에서 바로 읽는 정적 데이터다 — AI 호출이 아니다. `src/utils/trainer-dialogue.ts`의 `getGreetingLine()`이 오늘 기록 여부와 streak 값에 따라 조건형으로 대사를 고르며, 화면마다 이 조건 분기를 중복 구현하지 않는다.

## 5. 저장 구조 (`src/data`, `src/services/storage`)

V1은 `@react-native-async-storage/async-storage` 기반 로컬 저장만 사용한다 (`npx expo install`로 SDK 호환 버전 설치). `src/services/storage/local-storage.ts`가 `readJSON<T>` / `writeJSON<T>` / `removeKey`로 얇게 감싸고, 각 도메인별 repository(`src/data/*-repository.ts`)가 이를 사용해 CRUD를 제공한다. 저장 키는 `src/services/storage/keys.ts`에서 버전 접미사(`.v1`)와 함께 중앙 관리한다.

Repository 목록: `profile-repository`, `body-history-repository`, `workout-repository`, `workout-session-repository`, `streak-repository`, `trainer-usage-repository`, `subscription-repository`, `referral-repository`, `event-repository`, `routine-repository`, `pass-repository`.

`src/context/app-data-context.tsx`의 `AppDataProvider`가 앱 시작 시 모든 repository를 읽어 상태로 올리고, 화면은 `useAppData()` 훅으로 상태와 액션(예: `addWorkoutRecord`, `completeOnboarding`, `watchRewardedAd`)에 접근한다. 화면 컴포넌트가 repository를 직접 호출하지 않는다.

**streak 계산은 순수 함수로 분리돼 있다.** `src/utils/streak.ts`의 `computeStreakUpdate(state, today)`가 IO 없이 다음 상태만 계산하고, `data/streak-repository.ts`의 `registerTodayRecord()`가 이를 감싸 저장까지 처리한다. 화면에서는 이 로직을 다시 구현하지 않고 항상 `useAppData().addWorkoutRecord`를 거친다. `scripts/verify-streak.ts`(`npm run verify:streak`)가 같은 날 중복 기록/다음 날 연속/하루 건너뜀/월말/연말 경계 케이스를 검증한다.

**신체 히스토리와 운동 기록은 저장 구조를 분리한 채로 화면에서만 합쳐서 보여준다.** `src/utils/history.ts`의 `buildHistoryDays()`가 두 배열을 날짜 기준으로 병합한 `HistoryDay[]`를 순수하게 계산한다 — 새로운 저장 스키마나 무료/유료 분리 없이 기존 데이터를 그대로 재사용한다 ([[product-spec]] 6장).

**사진 하루 1회 제한**은 `AppConfig.dailyPhotoLimit`과 `data/body-history-repository.ts`의 `hasReachedDailyPhotoLimit()`(순수 함수)로 계산하고, `AppDataProvider`가 `canAddPhotoToday` / `nextPhotoAvailableDate`로 노출한다. `__DEV__`(개발 빌드)에서는 이 제한을 자동으로 우회해서 반복 테스트를 막지 않는다.

## 5.5. WorkoutSession lifecycle (실시간 운동 세션)

제품 핵심 루프([[product-spec]] 0장)의 중심 도메인. **진행 중인 세션은 최대 1개**만 존재하며 `data/workout-session-repository.ts`가 단일 객체로 저장한다(`StorageKeys.activeWorkoutSession`) — 세션 히스토리를 위한 별도 저장소를 새로 만들지 않는다. 완료된 세션은 즉시 기존 `WorkoutRecord`로 변환되어 `workout-repository`에 저장되고, active session 슬롯은 비워진다.

**상태 전이 (`src/utils/workout-session.ts`, 전부 순수 함수 — 현재 시각은 항상 인자로 받는다):**

```
createSession(category, id, nowIso, options?)     → status: 'active', activeSince: nowIso
                                                     options: {primaryMuscleGroup?, routineId?, initialExercises?}
                                                     로 exercises를 미리 채워 시작 가능
  ↓ pauseSession(session, nowMs)                  → status: 'paused', accumulatedSeconds 확정, activeSince 제거
  ↓ resumeSession(session, nowIso)                → status: 'active', activeSince: nowIso (재개 시각)
  ↓ changeSessionCategory(session, category)      → primaryCategory만 변경, 시간 계산에 영향 없음
  ↓ addExerciseToSession(session, exercise)       → exercises에 추가, 필요하면 currentExerciseId도 함께 지정
  ↓ setCurrentExercise(session, exerciseId)        → currentExerciseId 변경 (모르는 id는 no-op)
  ↓ addSetToExercise(session, exerciseId)          → 지난 세트 값을 기본값으로 새 WorkoutSetEntry 추가
  ↓ updateSet / completeSet(session, ..., setId)   → 세트별 중량/횟수 수정, 완료 처리
  ↓ startRest(session, seconds, nowMs)             → restUntilMs = nowMs + seconds*1000
  ↓ getRestSecondsRemaining(session, nowMs)        → restUntilMs 기준 매번 재계산 (드리프트 없음)
  ↓ completeSession(session, nowIso, nowMs)       → status: 'completed', 최종 accumulatedSeconds 확정
  ↓ sessionToWorkoutRecordInput(session, label)   → 세트 단위 exercises를 집계해 기존 WorkoutRecord 입력으로 변환
```

**경과 시간 계산이 핵심이다.** `computeElapsedSeconds(session, nowMs)`는 `activeSince`(마지막 재개 시각) 기준으로 매번 새로 계산한다 — 화면의 `setInterval` 카운터를 그대로 누적하지 않는다. 그래서 앱이 백그라운드에 오래 있었거나 기기가 잠들었다 깨어나도, 다음 렌더에서 `computeElapsedSeconds(session, Date.now())`를 다시 부르기만 하면 시간이 정확하다(드리프트 없음). 휴식 타이머(`restUntilMs`)도 같은 절대-시각 패턴을 재사용한다. `scripts/verify-workout-session.ts`(`npm run verify:session`)가 90초/45분 백그라운드 점프, 여러 번의 일시정지-재개, 세션 완료 시 분 단위 반올림, 세트/휴식 타이머 관련 케이스를 검증한다.

**AppDataProvider 연동.** `state.activeSession: WorkoutSession | null`을 다른 상태와 함께 앱 시작 시 로드한다. `startWorkoutSession`/`pauseWorkoutSession`/`resumeWorkoutSession`/`changeSessionCategory`/`addExerciseToSession`/`setCurrentSessionExercise`/`addSetToExercise`/`updateSessionSet`/`completeSessionSet`/`startSessionRest`/`skipSessionRest`/`endWorkoutSession` 액션이 위 순수 함수들을 감싸 저장까지 처리한다. `endWorkoutSession()`은 **새 저장소를 만들지 않고** 기존 `addWorkoutRecord` 액션을 그대로 호출해 `WorkoutRecord` 생성 + `registerTodayRecord()`(streak 갱신)까지 재사용하며, 추가로 `detectPRs()`로 PR을 판정하고 루틴 완료 여부를 계산해 `PassState`에 XP를 적립한다(`EndSessionSummary`로 화면에 반환). 같은 날 두 번째 세션을 끝내도 streak는 기존 `computeStreakUpdate`의 `lastRecordDate` 가드 덕분에 하루 1일만 증가한다(추가 코드 없음).

**화면 배치.** `src/app/session.tsx`는 `(tabs)`와 같은 `Stack.Protected` 아래 있지만 탭바가 없는 형제 `Stack.Screen`이다(전체화면 몰입). 홈의 [운동 시작] 버튼은 세션이 없으면 `/workout-start`로 이동하고(5.5-A장), 그 화면에서 `startWorkoutSession()` 호출 후 `/session`으로 replace한다. `activeSession`이 이미 있으면 홈/운동 탭 모두 "세션으로 돌아가기" 도선으로 바뀌고, `workout-start`에 진입해도 즉시 `/session`으로 redirect돼 새 세션을 만들지 않는다(`startWorkoutSession` 자체도 방어적으로 기존 세션이 있으면 no-op).

**Stanley 실시간 반응.** `session.tsx`가 1초 `setInterval` 안에서 경과 분(10/20/30/45분)을 확인해 아직 보여주지 않은 임계값을 넘으면 `TrainerDialogueSet`의 `session*` 대사 풀에서 한 줄을 뽑는다(마지막으로 보여준 임계값은 `useRef`로 추적, effect 바깥 렌더 중에는 절대 ref를 읽거나 쓰지 않는다 — React Compiler 프로젝트라 `react-hooks/refs` 규칙이 이를 막는다). 세트 완료/PR/운동 변경/휴식 시작/일시정지/재개/종료 대사는 각 이벤트 핸들러에서 직접 고른다 — `hasXxx` 같은 상태를 지켜보는 effect 안에서 setState하지 않는다(M2에서 겪은 "effect 안 setState" 린트 버그와 같은 클래스의 실수를 반복하지 않기 위함). 세션 종료 요약에 실릴 트레이너 대사는 컴포넌트 state(`SessionSummaryWithLine.trainerLine`)로만 다룬다 — 모듈 스코프의 가변 참조로 화면 간 상태를 넘기지 않는다.

## 5.5-A. Exercise DB / 세션 진입 경로 / 이전 기록 / PR / PASS

**Exercise 공통 데이터 규격 (`src/types/exercise.ts`, `src/utils/exercise-spec.ts`).** 프리웨이트/머신/케이블/맨몸을 별도 시스템으로 나누지 않는다 — 전부 하나의 `ExerciseDefinition`이고 `equipment` 값만 다르다. 화면과 GrowthEngine이 소비하는 것은 원본이 아니라 `resolveExercise(exercise, db)`가 만든 **`ResolvedExercise`**(optional이 하나도 없는 형태)다: `id / name / category / equipment / animationFamily / primaryMuscles / secondaryMuscles / spDistribution / usesWeight / usesBodyWeight / uses1RM / defaultSets / defaultReps / defaultRestSeconds / difficulty / guideId / alternativeExerciseIds`. DB에 적혀 있지 않은 필드는 기존 필드(equipment/trackingType/근육군)에서 **결정론적으로 유도**한다 — 44개 항목을 다시 쓰지 않기 위해서다. 유도 규칙이 맞지 않는 운동만 DB에서 개별적으로 덮어쓴다. 세트/횟수/휴식의 기본 숫자는 `AppConfig.exerciseDefaults` 한 곳에만 있다. `spDistribution`은 **게임 진행도(부위별 SP) 분배 비율**이며 실제 체성분과 무관하다.

**Motion Family (`src/types/exercise.ts`, `src/config/motion-families.ts`).** 종목마다 애니메이션을 만들지 않는다. 캐릭터가 재생하는 모션은 15개 공통 family(`horizontal_press` … `cardio`)가 전부이고, Exercise는 `animationFamily`로 그중 하나를 가리킨다. 세션 화면은 종목 이름이 아니라 이 값만 보고 모션을 고른다(`CharacterMotionStage`). V1의 모션은 실제 클립이 아니라 축/진폭/반복 길이 **파라미터**이며, 실제 스프라이트가 준비되면 바꿀 곳은 motion family registry와 character asset registry 두 곳뿐이다.

**Exercise DB (`src/config/exercises.ts`).** 정적 `ExerciseDefinition[]`로 서버 DB 없이 관리한다. `getExerciseById`, `getExercisesByMuscleGroup`, `searchExercises`(이름/별칭 기준)를 통해서만 조회하고, 화면 컴포넌트에 운동 목록을 하드코딩하지 않는다. DB에 없는 운동은 `workout-start.tsx`/`session.tsx`의 [직접 운동 추가]로 `exerciseId`를 `custom-exercise-*` 형태로 즉석 생성해 보완한다.

**세 가지 세션 진입 경로 (`src/app/workout-start.tsx`).** 후보 계산은 전부 `buildQuickStartPlan()`(`src/utils/workout-start.ts`, 순수 함수)이 하고 화면은 그 결과를 한 줄씩 그리기만 한다. 세 경로 모두 같은 `startWorkoutSession()` 호출로 수렴한다.
- **1) 지난 루틴 계속하기 (계획형)**: 오늘 예약된 루틴(`getTodaysScheduledRoutine`) → 마지막으로 수행한 루틴(기록 제목 = 루틴 이름 매칭) → 지난 세션 그대로(가장 최근 기록의 운동 구성) 순으로 하나만 고른다. 누르면 곧바로 세션이 시작된다 — 중간 화면이 없다.
- **2) 오늘 추천 (추천형)**: `recommendMuscleGroup()`(가장 오래 안 한 부위 우선)으로 부위를 정하고, 그 부위에서 **사용자가 실제로 해본 운동을 먼저** 채워 `AppConfig.recommendedExerciseCount`개를 담아 바로 시작한다. 실제 LLM 없이 동작하며, 나중에 AI PT가 이 자리를 대체할 수 있도록 순수 함수로 분리돼 있다.
- **3) 직접 선택 (즉흥형)**: 부위 Chip → 운동 다중 선택(+ DB에 없는 운동 직접 추가) → [N개로 시작]. 루틴이 없는 사용자의 기본 경로이며, 아무것도 고르지 않고도 시작할 수 있다.
- 어떤 경로로 담기든 운동에는 Exercise DB의 `defaultSets`/`defaultRestSeconds`가 함께 실린다(`SessionExerciseInput`) — 세션 화면이 "3 / 5 세트"와 자동 휴식을 그 값으로 처리한다.
- 웨이트가 아닌 운동은 "[+ 유산소 추가]" 섹션(`CARDIO_CATEGORIES`)에서 카테고리만 골라 바로 세션을 시작한다 — 러닝/걷기/자전거/스포츠/기타는 부위 선택 없이 진입한다.

**이전 기록 조회 (`src/utils/exercise-history.ts`).** `findPreviousPerformance(exerciseId, records)`가 Exercise ID 기준으로 가장 최근 세션의 날짜/세트 구성/최고 중량을 반환한다. `setDetails`가 없는 과거(legacy) 기록은 요약 필드(`sets`/`reps`/`weightKg`)로부터 단일 세트를 근사해 fallback한다 — 데이터 마이그레이션 없이 과거 기록도 그대로 조회된다. `session.tsx`의 `PreviousPerformanceLine`과 `workout.tsx`의 운동 상세 패널이 이 함수 하나를 공유한다.

**PR 판정.** `detectPRs(session, records)`는 완료된 세트만 대상으로, 같은 `exerciseId`의 과거 최고 중량보다 **엄격히 높은** 중량을 기록한 경우만 PR로 판정한다(동률은 PR 아님, 1RM 계산 없음). `endWorkoutSession()`이 세션 종료 시 한 번 호출하고, 결과(`PrEvent[]`)가 종료 요약 화면에 "NEW PR" 카드로 노출된다.

**PASS 진행도 (`src/utils/pass.ts`, `src/types/pass.ts`).** `PassState`는 누적 XP(`xp`)만 저장하고, 레벨/진행률은 항상 `computePassLevelProgress(xp)`(`level = floor(xp / passXpPerLevel) + 1`)로 계산해 저장하지 않는다. `endWorkoutSession()`이 세션 완료 시 `passXpPerSession` + (PR 개수 × `passXpPerPr`) + (루틴 완료 시 `passXpPerRoutineCompletion`)을 더해 저장한다. 홈 화면 상단의 작은 진행 바(`ProgressBar` + "HELL PASS Lv.N")가 유일한 노출 지점이며, **PASS XP는 실제 사용자의 체중/체형 파라미터를 직접 변경하지 않는다** — 2장의 성장 원칙을 PASS에도 동일하게 적용한다.

## 5.5-B. 세션 조작 규칙 / WorkoutSessionResult / GrowthEngine 경계

**세션 중 사용자가 하는 일은 세 가지뿐이다** — 중량 확인/수정 → 횟수 확인/수정 → [세트 완료]. 이를 위해:
- `ensurePendingSet()`이 "지금 채울 세트"를 항상 하나 유지한다. 세트를 끝낼 때마다 [+ 세트 시작]을 다시 누르지 않는다. 기본값은 이번 세션의 직전 세트 → 지난번 같은 운동의 마지막 세트(`findPreviousPerformance`) 순이다.
- `completeSetAndStartRest()`이 기록과 휴식 시작을 **한 번의 상태 변경**으로 처리한다. 확인 팝업은 없다. 휴식 길이는 `getAutoRestSeconds()`가 운동별 `defaultRestSeconds` → `AppConfig.defaultRestSeconds` 순으로 고른다.
- 휴식이 끝나면 대기 세트가 이미 준비된 ACTIVE 화면으로 돌아온다. 휴식 중 [다음 세트 시작]은 남은 휴식을 건너뛴다.
- 화면에 항상 보이는 정보: 현재 운동명 · `getSetProgress()`의 "N / M 세트" · 중량 · 횟수 · 지난 기록 한 줄 · 휴식 상태 · 다음 운동 · [운동 종료].

**WorkoutSessionResult (`src/types/growth.ts`, `src/utils/workout-session-result.ts`).** 세션과 성장 계산 사이의 **유일한 계약**이다. `buildWorkoutSessionResult()`는 순수 함수이며 완료된 세트만 담는다: `sessionId / startedAt / endedAt / activeSeconds / exercises(세트 상세·부위·SP 비율 포함) / totalSets / totalReps / totalVolumeKg / personalRecords / bodyWeightKg / volumeByMuscleGroup`. PR 판정 기준은 기존 `detectPRs`와 같은 누적 최고 중량이며, **이번 세션이 기록으로 저장되기 전에** 계산한다. `bodyWeightKg`는 실제 입력된 값(최근 신체 기록 → 프로필)만 읽어 넘기고 없으면 비운다 — 결과가 실제 신체 수치를 만들지 않는다.

**GrowthEngine 경계 (`src/services/growth/`).** 흐름은 `WorkoutSession → WorkoutSessionResult → GrowthEngine → Muscle SP → 캐릭터`다. 현재는 인터페이스와 no-op 구현만 있고(`noopGrowthEngine`), `endWorkoutSession()`이 결과를 넘기는 호출부는 이미 살아 있다 — 다음 작업에서 엔진 구현만 채우면 되고 호출부는 바뀌지 않는다. 엔진이 돌려주는 것은 게임 진행도(부위별 SP)이며, **실제 체중/체지방률/골격근량이나 캐릭터 외형 파라미터를 만들거나 바꾸지 않는다**(2장의 성장 원칙).

## 6. 화면 구조 / 네비게이션

루트 `_layout.tsx`는 `AppDataProvider`로 감싼 뒤, `onboardingComplete` 값에 따라 `Stack.Protected`로 `(onboarding)`과 `(tabs)+session` 중 하나만 마운트한다 (expo-router SDK 53+ Protected Routes 패턴). `session`은 `(tabs)`와 같은 guard 아래 있는 형제 `Stack.Screen`이라 온보딩 완료 후에만 접근 가능하지만, 탭 네비게이터 밖에 있어 탭바 없이 전체화면으로 뜬다.

- **(onboarding)**: 시작 방법 선택 → (사진 경로는 `expo-image-picker`로 실제 선택/미리보기) → 성별 표현 → 체형 프리셋 → 체형 미세 조절(실시간 실루엣 preview) → 완료 시 `UserProfile` 저장 + `onboardingComplete = true`. `OnboardingDraftProvider`가 화면 간 임시 입력값(성별/프리셋/보정값/체중/키/사진 URI)을 들고 있다가 마지막 화면에서 `completeOnboarding()`으로 한 번에 커밋한다.
- **(tabs)**: 홈 / 운동 / 트레이너 / 히스토리 / 설정.
- **session** (탭 아님): 실시간 운동 세션 전체화면. 자세한 내용은 5.5장.
- **workout-start** (탭 아님): [운동 시작] 직후 진입하는 사전 선택 화면. 자세한 내용은 5.5-A장.

핵심 화면별 최신 상태:

- **홈**: 상단의 작은 PASS 진행 바 + 캐릭터(`BodyAvatarPreview`) + Stanley 한 줄 + 오늘 제안 한 줄("오늘 · {루틴 이름}" 또는 "오늘은 뭐 조질까?") + **매우 큰 [운동 시작] 버튼**(`PrimaryButton size="large"`) + "이번 주 N회 · 연속 M일째" 한 줄이 전부다. 세션이 이미 진행 중이면 버튼이 "운동으로 돌아가기"로 바뀌고 오늘 제안 줄은 숨긴다. 오픈 이벤트 패스가 아직 활성화되지 않았을 때만 상단에 짧은 배너를 보여준다 (설정 화면 깊숙한 곳에만 있지 않도록).
- **운동**: 더 이상 기록 입력 화면이 아니다. "내 루틴"(목록 + 요일 토글/운동 다중 선택으로 만들기) + "운동 DB 탐색"(부위 Chip + 검색 + 펼치면 방법/주의사항/`findPreviousPerformance` 이전 기록까지 보여주는 `ExerciseListItem`) 두 섹션으로 구성된다.
- **트레이너**: AI PT 영역은 `AiPtPanel` 컴포넌트가 담당 — 빠른 질문 버튼 + 자유 입력창 + 대화 로그(로컬 state, 저장하지 않음)로 구성된다. UI는 `AITrainerService`만 호출하고 mock/실제 구현을 구분하지 않는다.
- **히스토리**: `buildHistoryDays()`로 만든 통합 목록(운동 시간/부위/운동 개수/세트 수 포함)을 보여준다. 체중/사진을 함께 기록하는 입력 폼, 두 날짜를 골라 비교하는 "전후 비교" 섹션(사진 없는 날짜는 `PhotoSlot`이 명확한 placeholder를 보여줌), 그리고 실시간 세션 없이 지나간 운동을 채우는 "놓친 운동 기록 수동으로 추가"(M2에서 `workout.tsx`에 있던 폼을 이전) 폼이 같은 화면에 있다.

## 7. V1/M2에서 mock/placeholder로 남는 것

이미지 생성 API, LLM API, 광고 SDK, 인앱결제, 추천 서버, 계정 서버는 모두 인터페이스 + mock 상태로만 존재한다 ([[product-spec]] 15장 참고). 사진 선택/미리보기 UI 자체는 M2에서 실제로 동작하지만, 선택한 사진을 AI로 변환하는 기능은 여전히 없다. 트레이너 아트는 이모지 placeholder를 쓰고, 체형 preview는 3D/이미지 생성 없이 View 도형 + Reanimated로만 표현한다. 이미지 파일 경로에 UI 구조가 종속되지 않게 하고, 트레이너 관련 표시 정보(이름/성격/portraitPlaceholder)는 전부 `src/config/trainers.ts` 한 곳에서 관리한다.
