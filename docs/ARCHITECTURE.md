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
    _layout.tsx                루트: Provider + Stack.Protected(onboarding|tabs)
    (onboarding)/               온보딩 스택 (온보딩 미완료 시에만 접근 가능)
      _layout.tsx
      index.tsx                 시작 방법 선택 (무료 체형 / 내 사진)
      photo-start.tsx            "내 사진으로 시작" placeholder
      gender.tsx                 성별 표현 선택
      body-preset.tsx            체형 프리셋 선택
      body-adjust.tsx            체형 미세 조절 placeholder + 온보딩 완료
    (tabs)/                     메인 탭 (온보딩 완료 후에만 접근 가능)
      _layout.tsx                 AppTabs (NativeTabs / web variant)
      index.tsx                   홈
      workout.tsx                  운동 기록
      trainer.tsx                   트레이너
      history.tsx                    히스토리
      settings.tsx                    내 정보/설정
  components/                 재사용 UI (테마 wrapper + 신규 ui 프리미티브)
  config/                      중앙 설정 (숫자/문자열 상수)
  types/                       도메인 타입
  services/                    외부 연동 인터페이스 + mock 구현
  data/                        로컬 저장 기반 repository (CRUD)
  context/                     AppDataProvider (앱 전역 상태)
```

## 2. 도메인 타입 (`src/types`)

| 파일 | 타입 | 비고 |
|---|---|---|
| `user.ts` | `UserProfile`, `GenderExpression`, `SetupMethod` | 온보딩 결과. `setupMethod: 'preset' \| 'photo'`로 향후 업그레이드 가능 |
| `body.ts` | `BodyParameters`, `BodyHistoryEntry`, `BodyHistorySource` | `source: 'manual' \| 'photo' \| 'future_ai'`. 구독 종료돼도 삭제되지 않음 |
| `workout.ts` | `WorkoutRecord`, `WorkoutCategory`, `WorkoutExercise` | `category: strength\|home\|running\|walking\|cycling\|other` |
| `trainer.ts` | `TrainerProfile`, `TrainerDialogueSet`, `TrainerUnlockRule`, `TrainerMonetizationRule` | 스탠리 전용 구조가 아니라 다수 트레이너를 표현할 수 있는 일반 구조 |
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

무료 NPC 대사(스탠리 기본 PT)는 별도 서비스가 아니라 `TrainerProfile.dialogueSet`에서 바로 읽는 정적 데이터다 — AI 호출이 아니다.

## 5. 저장 구조 (`src/data`, `src/services/storage`)

V1은 `@react-native-async-storage/async-storage` 기반 로컬 저장만 사용한다 (`npx expo install`로 SDK 호환 버전 설치). `src/services/storage/local-storage.ts`가 `readJSON<T>` / `writeJSON<T>` / `removeKey`로 얇게 감싸고, 각 도메인별 repository(`src/data/*-repository.ts`)가 이를 사용해 CRUD를 제공한다. 저장 키는 `src/services/storage/keys.ts`에서 버전 접미사(`.v1`)와 함께 중앙 관리한다.

Repository 목록: `profile-repository`, `body-history-repository`, `workout-repository`, `streak-repository`, `trainer-usage-repository`, `subscription-repository`, `referral-repository`, `event-repository`.

`src/context/app-data-context.tsx`의 `AppDataProvider`가 앱 시작 시 모든 repository를 읽어 상태로 올리고, 화면은 `useAppData()` 훅으로 상태와 액션(예: `addWorkoutRecord`, `completeOnboarding`, `watchRewardedAd`)에 접근한다. 화면 컴포넌트가 repository를 직접 호출하지 않는다.

## 6. 화면 구조 / 네비게이션

루트 `_layout.tsx`는 `AppDataProvider`로 감싼 뒤, `onboardingComplete` 값에 따라 `Stack.Protected`로 `(onboarding)`과 `(tabs)` 중 하나만 마운트한다 (expo-router SDK 53+ Protected Routes 패턴).

- **(onboarding)**: 시작 방법 선택 → (사진 경로는 placeholder 화면만) → 성별 표현 → 체형 프리셋 → 체형 미세 조절 → 완료 시 `UserProfile` 저장 + `onboardingComplete = true`.
- **(tabs)**: 홈 / 운동 기록 / 트레이너 / 히스토리 / 설정. 홈은 대시보드가 아니라 게임 홈 화면 톤 유지 — 카드 수를 최소화한다.

## 7. V1에서 mock/placeholder로 남는 것

이미지 생성 API, LLM API, 광고 SDK, 인앱결제, 추천 서버, 계정 서버는 모두 인터페이스 + mock 상태로만 존재한다 ([[product-spec]] 15장 참고). 아트는 이모지/도형 placeholder를 쓰고, 이미지 파일 경로에 UI 구조가 종속되지 않게 한다.
