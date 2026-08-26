import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { AppConfig } from '@/config/app-config';
import { Exercises, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels } from '@/config/muscle-groups';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import {
  addBodyHistoryEntry as addBodyHistoryEntryRepo,
  getBodyHistory,
  hasReachedDailyPhotoLimit,
} from '@/data/body-history-repository';
import { getOpenEventPassState, saveOpenEventPassState } from '@/data/event-repository';
import { getGrowthState, saveGrowthState } from '@/data/growth-repository';
import { getPassState, savePassState } from '@/data/pass-repository';
import {
  getOnboardingComplete,
  getUserProfile,
  saveUserProfile,
  setOnboardingComplete as setOnboardingCompleteRepo,
} from '@/data/profile-repository';
import { getReferralState } from '@/data/referral-repository';
import {
  deleteRoutine as deleteRoutineRepo,
  getRoutines,
  saveRoutine as saveRoutineRepo,
  updateRoutine as updateRoutineRepo,
} from '@/data/routine-repository';
import {
  claimStreakReward as claimStreakRewardRepo,
  getStreakState,
  registerRecordDate,
  registerTodayRecord,
} from '@/data/streak-repository';
import {
  clearPendingSessionCompletion,
  getPendingSessionCompletion,
  savePendingSessionCompletion,
} from '@/data/session-completion-repository';
import { getSubscriptionState } from '@/data/subscription-repository';
import { grantRewardedPtUses, getTrainerUsageState, consumeRewardedPtUse } from '@/data/trainer-usage-repository';
import {
  addWorkoutRecord as addWorkoutRecordRepo,
  deleteWorkoutRecord as deleteWorkoutRecordRepo,
  getThisWeekRecords,
  getWorkoutRecords,
} from '@/data/workout-repository';
import {
  clearActiveSession,
  getActiveSession,
  saveActiveSession,
} from '@/data/workout-session-repository';
import { clearAllKeys } from '@/services/storage/local-storage';
import { StorageKeys } from '@/services/storage/keys';
import { rewardedAdService } from '@/services/ads/mock-rewarded-ad-service';
import { referralService } from '@/services/referral/mock-referral-service';
import { subscriptionService } from '@/services/subscription/mock-subscription-service';
import { growthEngine } from '@/services/growth';
import { aiTrainerService } from '@/services/trainer';
import {
  AiQuickActionId,
  AiTrainerHistoryEntry,
  AiTrainerMessage,
} from '@/services/trainer/ai-trainer-service';
import { BodyHistoryEntry } from '@/types/body';
import { OpenEventPassState } from '@/types/event';
import { MuscleGroup } from '@/types/exercise';
import { PassState } from '@/types/pass';
import { ReferralState, ReferralRedemptionResult } from '@/types/referral';
import { Routine } from '@/types/routine';
import { StreakState } from '@/types/streak';
import { SubscriptionState } from '@/types/subscription';
import { TrainerUsageState } from '@/types/ads';
import { UserProfile } from '@/types/user';
import { WorkoutCategory, WorkoutRecord } from '@/types/workout';
import { WorkoutSession } from '@/types/workout-session';
import type { SessionCompletionReceipt } from '@/types/session-completion';
import { DanbaekGrowthState, GrowthApplicationResult, WorkoutSessionResult } from '@/types/growth';
import {
  DanbaekBodyParameters,
  DanbaekBodyState,
  NutritionState,
  RecoveryState,
} from '@/types/body-state';
import { todayDateString, tomorrowDateString } from '@/utils/date';
import { PrEvent, detectPRs } from '@/utils/exercise-history';
import { createId } from '@/utils/id';
import { addXp, computePassLevelProgress } from '@/utils/pass';
import { CharacterAppearance, characterAppearanceFromProfile } from '@/utils/character-appearance';
import { buildPtContext, buildPtExerciseBrief, matchExerciseInText, PtContext } from '@/utils/pt-context';
import { buildDanbaekLearningProfile, diffLearningProfiles, type LearningGain } from '@/utils/danbaek-learning';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { buildWorkoutSessionResult } from '@/utils/workout-session-result';
import { createDefaultGrowthState, updateBodyComposition } from '@/utils/growth-state';
import { buildDanbaekBodyState } from '@/utils/body-state';
import { applyPumpToBodyParameters, toDanbaekBodyParameters } from '@/utils/body-parameters';
import { mutateSessionIfActive, runSessionCompletion } from '@/utils/core-loop';
import {
  addExerciseToSession as addExerciseToSessionPure,
  addSetToExercise as addSetToExercisePure,
  adjustSet as adjustSetPure,
  changeSessionCategory as changeSessionCategoryPure,
  clearRest as clearRestPure,
  completeSession,
  computeCompletedExerciseCount,
  completeSet as completeSetPure,
  completeSetAndStartRest as completeSetAndStartRestPure,
  computeCompletedSetsCount,
  computeTotalVolumeKg,
  createSession,
  ensurePendingSet as ensurePendingSetPure,
  heartbeatSession,
  isRoutineCompleted,
  pauseSession,
  pauseSessionForBackground,
  recoverStaleSession,
  resumeIfRecentBackground,
  resumeSession,
  sessionToWorkoutRecordInput,
  SessionExerciseInput,
  setCurrentExercise as setCurrentExercisePure,
  startRest as startRestPure,
  updateSet as updateSetPure,
} from '@/utils/workout-session';

interface AppDataState {
  loading: boolean;
  onboardingComplete: boolean;
  profile: UserProfile | null;
  bodyHistory: BodyHistoryEntry[];
  workoutRecords: WorkoutRecord[];
  streak: StreakState;
  subscription: SubscriptionState;
  trainerUsage: TrainerUsageState;
  referral: ReferralState;
  openEventPass: OpenEventPassState;
  activeSession: WorkoutSession | null;
  routines: Routine[];
  pass: PassState;
  /**
   * 실제 운동으로 쌓인 부위별 성장(Muscle SP). PASS XP와 별개의 축이며,
   * 사용자의 실제 신체 수치와도 무관하다.
   */
  growth: DanbaekGrowthState;
}

export interface EndSessionSummary {
  durationMinutes: number;
  category: WorkoutCategory;
  weeklyCount: number;
  streak: number;
  exerciseCount: number;
  completedSets: number;
  totalVolumeKg: number;
  prs: PrEvent[];
  xpAwarded: number;
  passLevel: number;
  routineCompleted: boolean;
  /**
   * GrowthEngine이 쓰는 세션 결과. 화면은 위의 요약값을 쓰고, 이 필드는 성장 계산
   * 입력으로만 존재한다 — 실제 신체 수치는 여기서 나오지 않는다.
   */
  sessionResult: WorkoutSessionResult;
  /**
   * 이번 세션이 부위별 성장에 반영된 결과. 성장할 것이 없었으면(부위를 알 수 없는
   * 즉석 운동뿐이거나 완료한 세트가 없음) null이다.
   * 다음 단계의 성장 연출/DanbaekRenderer가 이 값만 보고 화면을 만들 수 있다.
   */
  growth: GrowthApplicationResult | null;
  /** GrowthEngine 적용 직전의 영구 외형. Result 비교용 스냅샷이며 저장하지 않는다. */
  bodyParametersBefore: DanbaekBodyParameters;
  /** GrowthEngine 적용 직후의 영구 외형. HOME이 다시 계산해 보여주는 값과 같은 입력이다. */
  bodyParametersAfter: DanbaekBodyParameters;
  /**
   * 세션 직후의 단백이 렌더링 파라미터에 이번 운동의 펌핑을 얹은 값.
   * **일시값이다** — 저장되지 않고, 다음에 앱을 켜면 홈의 영구 상태로 돌아간다.
   * 결과 화면/성장 연출이 이 값만 그대로 쓰면 된다.
   */
  bodyParametersWithPump: DanbaekBodyParameters;
  /**
   * 이번 운동으로 단백이가 무엇을 배웠는가 (rebuild 학습 계약).
   *
   * GrowthEngine 결과(`growth`)와 **별개의 축**이다 — 성장 계산은 그대로 두고, 같은 운동
   * 기록을 학습의 눈으로 한 번 더 읽은 것뿐이다. 배운 것이 없으면 빈 배열이다.
   */
  learning: LearningGain[];
}

interface AppDataContextValue extends AppDataState {
  hasSubscriptionAccess: boolean;
  hasAiPtAccess: boolean;
  /** 오늘 사진 기반 신체 기록을 추가할 수 있는지 (DEV 빌드에서는 항상 true) */
  canAddPhotoToday: boolean;
  /** canAddPhotoToday가 false일 때, 다음으로 가능한 날짜 (YYYY-MM-DD) */
  nextPhotoAvailableDate: string;
  passProgress: ReturnType<typeof computePassLevelProgress>;
  /** 캐릭터 렌더러(PlayerCharacter)에 그대로 넘기는 외형 view-model. */
  characterAppearance: CharacterAppearance;
  /**
   * 근육 성장 + 실제 신체 기록 + 식단/회복을 하나로 합친 "지금 단백이 몸" 상태.
   * 저장하지 않고 매번 계산한다 — 입력이 바뀌면 즉시 따라온다.
   */
  bodyState: DanbaekBodyState;
  /** 위 상태를 렌더러가 읽는 0~1 수치로 변환한 값. 그림 쪽은 SP/stage를 모른다. */
  bodyParameters: DanbaekBodyParameters;
  completeOnboarding: (input: {
    profile: Omit<UserProfile, 'id' | 'createdAt'>;
    photoUri?: string;
    /** 온보딩에서 "알고 있으면" 넣는 선택 값. 모르면 넘기지 않는다 — 기본값을 지어내지 않는다. */
    bodyFatPercent?: number;
    skeletalMuscleKg?: number;
  }) => Promise<void>;
  /**
   * 설정 > 내 정보에서 프로필 일부(운동 목표 등)를 고친다.
   * id/createdAt은 바꿀 수 없고, 프로필이 없으면 아무 일도 하지 않는다.
   */
  updateProfile: (patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>) => Promise<void>;
  addWorkoutRecord: (
    input: Parameters<typeof addWorkoutRecordRepo>[0]
  ) => Promise<{ workoutRecords: WorkoutRecord[]; streak: StreakState }>;
  deleteWorkoutRecord: (recordId: string) => Promise<void>;
  addBodyHistoryEntry: (input: Parameters<typeof addBodyHistoryEntryRepo>[0]) => Promise<void>;
  claimStreakReward: () => Promise<void>;
  watchRewardedAd: () => Promise<void>;
  startWorkoutSession: (
    category: WorkoutCategory,
    options?: {
      primaryMuscleGroup?: MuscleGroup;
      routineId?: string;
      routineName?: string;
      initialExercises?: SessionExerciseInput[];
    }
  ) => Promise<void>;
  pauseWorkoutSession: () => Promise<void>;
  resumeWorkoutSession: () => Promise<void>;
  changeSessionCategory: (category: WorkoutCategory) => Promise<void>;
  addExerciseToSession: (exercise: SessionExerciseInput) => Promise<void>;
  setCurrentSessionExercise: (exerciseEntryId: string) => Promise<void>;
  addSetToExercise: (
    exerciseEntryId: string,
    initial?: { weightKg?: number; reps?: number }
  ) => Promise<void>;
  updateSessionSet: (
    exerciseEntryId: string,
    setId: string,
    patch: { weightKg?: number; reps?: number }
  ) => Promise<void>;
  /** 스테퍼(+/-)용 증감 갱신. 절대값이 아니라 증감이라 빠르게 연타해도 한 번도 씹히지 않는다. */
  adjustSessionSet: (
    exerciseEntryId: string,
    setId: string,
    delta: { weightKg?: number; reps?: number }
  ) => Promise<void>;
  /**
   * 세트 완료. restSeconds를 주면 같은 변경 안에서 휴식까지 바로 시작한다
   * (확인 팝업 없이 "완료 → 휴식 → 다음 세트"로 이어지는 흐름의 한 걸음).
   */
  completeSessionSet: (
    exerciseEntryId: string,
    setId: string,
    options?: { restSeconds?: number }
  ) => Promise<void>;
  /**
   * 지금 조작할 세트를 하나 보장한다 — 이미 있으면 아무 일도 하지 않는다.
   * 세션 화면이 "세트 시작" 탭을 요구하지 않기 위해 부르는 진입점이다.
   */
  ensureSessionPendingSet: (
    exerciseEntryId: string,
    defaults?: { weightKg?: number; reps?: number }
  ) => Promise<void>;
  startSessionRest: (seconds: number) => Promise<void>;
  skipSessionRest: () => Promise<void>;
  /** 완료 세트가 없는 세션을 어떤 기록/보상도 만들지 않고 폐기한다. */
  discardWorkoutSession: () => Promise<void>;
  endWorkoutSession: () => Promise<EndSessionSummary | null>;
  saveRoutine: (input: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRoutine: (routineId: string, input: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeRoutine: (routineId: string) => Promise<void>;
  /** PT에게 넘길 압축 컨텍스트. 화면과 서비스가 같은 값을 본다. */
  ptContext: PtContext;
  /**
   * 저장된 운동 기록에서 읽어낸 단백이의 학습 상태 (읽기 전용 스냅샷).
   *
   * 화면들이 각자 다시 계산하면 같은 순간에 서로 다른 학습을 말할 수 있다 — HOME과 PT가
   * 같은 값을 보게 여기서 한 번만 만든다. **성장(Growth/HELL PASS)과 별개 축이고**,
   * 이 값이 기록이나 성장 계산을 바꾸는 경로는 없다 (기록을 읽기만 한다).
   */
  danbaekLearning: DanbaekLearningProfile;
  /** 실제 AI 백엔드가 연결돼 있는지. false면 화면이 "AI 연결 전"임을 알린다. */
  aiConnected: boolean;
  /**
   * PT에게 한 마디 보낸다. 접근 권한이 없으면 null, 요청이 실패하면 AiTrainerRequestError를
   * 던진다 (화면이 대화를 유지한 채 재시도를 안내한다).
   */
  sendPtMessage: (input: {
    text: string;
    quickActionId?: AiQuickActionId;
    history: AiTrainerHistoryEntry[];
  }) => Promise<AiTrainerMessage | null>;
  subscribeMock: (tierId: string) => Promise<void>;
  cancelSubscriptionMock: () => Promise<void>;
  redeemReferralCode: (code: string) => Promise<ReferralRedemptionResult>;
  activateOpenEventPass: () => Promise<void>;
  /**
   * 하루 식단 평가를 남긴다. 상세 음식 기록이 아니라 한 줄 평가값이며, 이 값은
   * 지방 추정과 회복 표현에만 쓰인다 — **근육 SP를 만들지 않는다**.
   */
  setNutritionState: (nutritionState: NutritionState) => Promise<void>;
  /** 수면/컨디션 평가. 현재는 표현과 트레이너 대사용이며 SP 공식에 개입하지 않는다. */
  setRecoveryState: (recoveryState: RecoveryState) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const initialState: AppDataState = {
  loading: true,
  onboardingComplete: false,
  profile: null,
  bodyHistory: [],
  workoutRecords: [],
  streak: { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false },
  subscription: { status: 'none' },
  trainerUsage: { rewardedPtUsesRemaining: 0 },
  referral: { bonusDaysGranted: 0 },
  openEventPass: { active: false },
  activeSession: null,
  routines: [],
  pass: { xp: 0 },
  growth: createDefaultGrowthState(new Date(0).toISOString()),
};

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(initialState);

  /**
   * 항상 "가장 최신 세션"을 가리킨다. 세션 종료처럼 한 번만 일어나야 하는 동작이
   * 렌더 클로저에 잡힌 오래된 세션을 읽어 마지막 세트를 흘리지 않게 한다.
   */
  const activeSessionRef = useRef<WorkoutSession | null>(null);
  /** 세션 종료 처리 중인지. 완료 버튼이 연타돼도 기록이 두 번 저장되지 않게 한다. */
  const endingSessionRef = useRef(false);

  useEffect(() => {
    activeSessionRef.current = state.activeSession;
  }, [state.activeSession]);

  /**
   * 세션 변경은 반드시 최신 세션에서 출발해야 한다. 스테퍼를 빠르게 두 번 누르는 것처럼
   * 한 렌더 안에서 연속 호출되면, 클로저에 잡힌 state.activeSession은 직전 변경을 모른 채
   * 덮어써서 입력이 조용히 사라진다(중량을 넣고 바로 횟수를 바꾸면 중량이 날아갔다).
   * 함수형 갱신으로 최신값에서 계산하고, 저장도 그 결과로 한다 — heartbeat/AppState 효과가
   * 이미 쓰던 것과 같은 패턴이다.
   */
  const mutateActiveSession = useCallback(
    (mutate: (session: WorkoutSession) => WorkoutSession) => {
      setState((prev) => {
        if (!prev.activeSession) return prev;
        const updated = mutate(prev.activeSession);
        if (updated === prev.activeSession) return prev;
        activeSessionRef.current = updated;
        saveActiveSession(updated);
        return { ...prev, activeSession: updated };
      });
    },
    []
  );

  /** paused 세션의 진행 상태는 UI뿐 아니라 context 경계에서도 절대 변경하지 않는다. */
  const mutateRunningSession = useCallback(
    (mutate: (session: WorkoutSession) => WorkoutSession) => {
      mutateActiveSession((session) => mutateSessionIfActive(session, mutate));
    },
    [mutateActiveSession]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [
        onboardingComplete,
        profile,
        bodyHistory,
        workoutRecords,
        streak,
        subscription,
        trainerUsage,
        referral,
        openEventPass,
        activeSession,
        routines,
        pass,
        growth,
      ] = await Promise.all([
        getOnboardingComplete(),
        getUserProfile(),
        getBodyHistory(),
        getWorkoutRecords(),
        getStreakState(),
        getSubscriptionState(),
        getTrainerUsageState(),
        getReferralState(),
        getOpenEventPassState(),
        getActiveSession(),
        getRoutines(),
        getPassState(),
        getGrowthState(),
      ]);

      if (cancelled) return;

      // 기존 사용자 보호: 온보딩이 새로 생기기 전에 이미 프로필을 만든 사용자가 첫 화면에
      // 다시 갇히지 않도록, 핵심 데이터(체중)가 있으면 완료로 간주하고 플래그를 채워준다.
      // 기존 데이터는 건드리지 않는다 — 플래그만 보강한다.
      let resolvedOnboardingComplete = onboardingComplete;
      if (!onboardingComplete && profile && profile.weightKg > 0) {
        resolvedOnboardingComplete = true;
        await setOnboardingCompleteRepo(true);
      }

      // 세션이 'active'로 저장된 채 오래 방치됐다면(백그라운드/강제종료) 마지막으로 확인된
      // 시각을 기준으로 자동 일시정지한다 — 그렇지 않으면 방치된 시간이 그대로 운동 시간에
      // 더해진다("1217분 버그"). 세션 화면을 거치지 않고도 앱 시작 시점에 바로잡는다.
      //
      // 앱을 처음 로드하는 시점은 AppState 'change' 이벤트가 발생하지 않는다(전환할
      // 이전 상태가 없다 — 강제 종료 후 재실행, 또는 이 테스트의 페이지 리로드가 그렇다).
      // 그래서 백그라운드 전환 직전에 자동 일시정지됐던 세션(pausedByAppBackground)도
      // 여기서 함께 확인해, 짧게 벗어났다 돌아온 경우라면 조용히 다시 재개한다.
      let recoveredSession = activeSession;
      if (activeSession) {
        const nowMs = Date.now();
        const staleThresholdMs = AppConfig.staleActiveSessionThresholdMinutes * 60 * 1000;
        let recovered = recoverStaleSession(activeSession, nowMs, staleThresholdMs);
        recovered = resumeIfRecentBackground(recovered, nowMs, staleThresholdMs);
        if (recovered !== activeSession) {
          await saveActiveSession(recovered);
          recoveredSession = recovered;
        }
      }

      setState({
        loading: false,
        onboardingComplete: resolvedOnboardingComplete,
        profile,
        bodyHistory,
        workoutRecords,
        streak,
        subscription,
        trainerUsage,
        referral,
        openEventPass,
        activeSession: recoveredSession,
        routines,
        pass,
        growth,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 앱이 백그라운드로 전환되는 순간 활성 세션을 즉시 일시정지해, 방치된 시간이 운동 시간에
  // 섞이지 않게 한다("1217분 버그"의 근본 원인). 짧게 백그라운드에 있었다가 곧바로 돌아오면
  // (예: 알림 확인) 사용자가 다시 [재개]를 누르지 않아도 되도록 자동으로 이어서 재개한다 —
  // 단, 이 화면이 자동으로 일시정지시킨 경우에만 그렇게 한다(사용자가 직접 일시정지한
  // 세션은 절대 자동으로 재개하지 않는다). "자동으로 일시정지시켰다"는 사실은 메모리가
  // 아니라 세션 자체(pausedByAppBackground)에 저장한다 — 그래야 백그라운드 중 앱이
  // 재시작되어 JS 컨텍스트가 새로 만들어져도(예: 강제 종료 후 재실행) 판단이 살아남는다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const nowMs = Date.now();
      if (nextAppState !== 'active') {
        setState((prev) => {
          if (!prev.activeSession || prev.activeSession.status !== 'active') return prev;
          const updated = pauseSessionForBackground(prev.activeSession, nowMs);
          saveActiveSession(updated);
          return { ...prev, activeSession: updated };
        });
      } else {
        setState((prev) => {
          if (!prev.activeSession) return prev;
          const updated = resumeIfRecentBackground(
            prev.activeSession,
            nowMs,
            AppConfig.staleActiveSessionThresholdMinutes * 60 * 1000
          );
          if (updated === prev.activeSession) return prev;
          saveActiveSession(updated);
          return { ...prev, activeSession: updated };
        });
      }
    });

    return () => subscription.remove();
  }, []);

  // 앱이 완전히 강제 종료되는 경우 위 background 이벤트가 못 울릴 수 있으므로,
  // "마지막으로 살아있던 시각"을 주기적으로 저장해둔다 — 다음 실행 시 recoverStaleSession이
  // 이 값을 기준으로 방치된 구간을 잘라낸다.
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev.activeSession || prev.activeSession.status !== 'active') return prev;
        const updated = heartbeatSession(prev.activeSession, Date.now());
        saveActiveSession(updated);
        return { ...prev, activeSession: updated };
      });
    }, AppConfig.sessionHeartbeatIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, []);

  const completeOnboarding = useCallback<AppDataContextValue['completeOnboarding']>(
    async ({ profile, photoUri, bodyFatPercent, skeletalMuscleKg }) => {
      const newProfile: UserProfile = {
        ...profile,
        id: `profile-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(newProfile);
      await setOnboardingCompleteRepo(true);

      // 온보딩에서 받은 신체 수치는 기존 BodyHistoryEntry에 그대로 들어간다 —
      // 히스토리의 [몸 변화]가 첫날부터 같은 소스를 읽는다.
      const bodyHistory = await addBodyHistoryEntryRepo({
        date: todayDateString(),
        weightKg: newProfile.weightKg,
        bodyFatPercent,
        skeletalMuscleKg,
        bodyPresetId: newProfile.bodyPresetId,
        bodyParameters: newProfile.bodyParameters,
        source: photoUri ? 'photo' : 'manual',
        photoReference: photoUri,
      });

      setState((prev) => ({
        ...prev,
        onboardingComplete: true,
        profile: newProfile,
        bodyHistory,
      }));
    },
    []
  );

  // 저장소를 source of truth로 읽어서 합친다 — setState 업데이터 안에서 저장을 일으키지 않는다.
  const updateProfile = useCallback<AppDataContextValue['updateProfile']>(async (patch) => {
    const current = await getUserProfile();
    if (!current) return;
    const next: UserProfile = { ...current, ...patch };
    await saveUserProfile(next);
    setState((prev) => ({ ...prev, profile: next }));
  }, []);

  const addWorkoutRecord = useCallback<AppDataContextValue['addWorkoutRecord']>(async (input) => {
    const workoutRecords = await addWorkoutRecordRepo(input);
    const streak = await registerTodayRecord();
    setState((prev) => ({ ...prev, workoutRecords, streak }));
    return { workoutRecords, streak };
  }, []);

  const deleteWorkoutRecord = useCallback<AppDataContextValue['deleteWorkoutRecord']>(async (recordId) => {
    const workoutRecords = await deleteWorkoutRecordRepo(recordId);
    setState((prev) => ({ ...prev, workoutRecords }));
  }, []);

  /**
   * 지방/컨디션 축의 저장값만 갱신한다. 근육 SP/stage는 건드리지 않는다 —
   * 식단이 좋다고 근육이 생기는 경로를 만들지 않는다.
   *
   * 입력(식단/회복/신체 기록)이 바뀔 때마다 지방·데피니션 캐시도 같이 다시 계산한다.
   * 캐시가 입력보다 오래된 값을 들고 있으면 트레이너 대사가 지난 상태를 말하게 된다.
   * (화면이 쓰는 것은 언제나 실시간으로 계산되는 bodyState이며, 이 캐시가 아니다.)
   */
  const patchBodyComposition = useCallback(
    (
      patch: Parameters<typeof updateBodyComposition>[1],
      overrides?: { bodyHistory?: BodyHistoryEntry[] }
    ) => {
      const nowIso = new Date().toISOString();
      // 저장은 갱신 함수 안에서 한다 — setState는 즉시 실행되지 않으므로 바깥에서
      // 결과를 읽으면 아직 비어 있다 (mutateActiveSession이 쓰는 것과 같은 패턴).
      setState((prev) => {
        const bodyHistory = overrides?.bodyHistory ?? prev.bodyHistory;
        const computed = buildDanbaekBodyState({
          growth: { ...prev.growth, body: { ...(prev.growth.body ?? {}), ...patch } },
          bodyHistory,
          nowIso,
        });
        const nextGrowth = updateBodyComposition(
          prev.growth,
          {
            ...patch,
            fatStage: computed.fatStage,
            fatStageSource: computed.fatStageSource,
            definitionStage: computed.definitionStage,
          },
          nowIso
        );
        saveGrowthState(nextGrowth);
        return { ...prev, growth: nextGrowth };
      });
    },
    []
  );

  const addBodyHistoryEntry = useCallback<AppDataContextValue['addBodyHistoryEntry']>(
    async (input) => {
      const bodyHistory = await addBodyHistoryEntryRepo(input);
      setState((prev) => ({ ...prev, bodyHistory }));
      // 체중/체지방률이 바뀌면 지방·데피니션 캐시도 새 기록 기준으로 다시 계산한다.
      // 근육 SP/stage는 이 경로에서 절대 바뀌지 않는다.
      patchBodyComposition({}, { bodyHistory });
    },
    [patchBodyComposition]
  );

  const claimStreakReward = useCallback(async () => {
    const streak = await claimStreakRewardRepo();
    setState((prev) => ({ ...prev, streak }));
  }, []);

  const startWorkoutSession = useCallback<AppDataContextValue['startWorkoutSession']>(
    async (category, options) => {
      const current = activeSessionRef.current;
      if (current && current.status !== 'completed') return;
      const session = createSession(category, createId('session'), new Date().toISOString(), options);
      activeSessionRef.current = session;
      await saveActiveSession(session);
      setState((prev) => ({ ...prev, activeSession: session }));
    },
    []
  );

  const pauseWorkoutSession = useCallback(async () => {
    mutateActiveSession((session) => pauseSession(session, Date.now()));
  }, [mutateActiveSession]);

  const resumeWorkoutSession = useCallback(async () => {
    mutateActiveSession((session) => resumeSession(session, new Date().toISOString()));
  }, [mutateActiveSession]);

  const changeSessionCategory = useCallback<AppDataContextValue['changeSessionCategory']>(
    async (category) => {
      mutateRunningSession((session) => changeSessionCategoryPure(session, category));
    },
    [mutateRunningSession]
  );

  const addExerciseToSession = useCallback<AppDataContextValue['addExerciseToSession']>(
    async (exercise) => {
      const id = createId('session-ex');
      mutateRunningSession((session) => addExerciseToSessionPure(session, { id, ...exercise }));
    },
    [mutateRunningSession]
  );

  const setCurrentSessionExercise = useCallback<AppDataContextValue['setCurrentSessionExercise']>(
    async (exerciseEntryId) => {
      mutateRunningSession((session) => setCurrentExercisePure(session, exerciseEntryId));
    },
    [mutateRunningSession]
  );

  const addSetToExercise = useCallback<AppDataContextValue['addSetToExercise']>(
    async (exerciseEntryId, initial) => {
      const setId = createId('set');
      mutateRunningSession((session) => addSetToExercisePure(session, exerciseEntryId, setId, initial));
    },
    [mutateRunningSession]
  );

  const updateSessionSet = useCallback<AppDataContextValue['updateSessionSet']>(
    async (exerciseEntryId, setId, patch) => {
      mutateRunningSession((session) => updateSetPure(session, exerciseEntryId, setId, patch));
    },
    [mutateRunningSession]
  );

  const adjustSessionSet = useCallback<AppDataContextValue['adjustSessionSet']>(
    async (exerciseEntryId, setId, delta) => {
      mutateRunningSession((session) => adjustSetPure(session, exerciseEntryId, setId, delta));
    },
    [mutateRunningSession]
  );

  const completeSessionSet = useCallback<AppDataContextValue['completeSessionSet']>(
    async (exerciseEntryId, setId, options) => {
      const restSeconds = options?.restSeconds ?? 0;
      mutateRunningSession((session) =>
        restSeconds > 0
          ? completeSetAndStartRestPure(session, exerciseEntryId, setId, restSeconds, Date.now())
          : completeSetPure(session, exerciseEntryId, setId)
      );
    },
    [mutateRunningSession]
  );

  const ensureSessionPendingSet = useCallback<AppDataContextValue['ensureSessionPendingSet']>(
    async (exerciseEntryId, defaults) => {
      const setId = createId('set');
      mutateRunningSession((session) => ensurePendingSetPure(session, exerciseEntryId, setId, defaults));
    },
    [mutateRunningSession]
  );

  const startSessionRest = useCallback<AppDataContextValue['startSessionRest']>(
    async (seconds) => {
      mutateRunningSession((session) => startRestPure(session, seconds, Date.now()));
    },
    [mutateRunningSession]
  );

  const skipSessionRest = useCallback(async () => {
    mutateRunningSession((session) => clearRestPure(session));
  }, [mutateRunningSession]);

  /** 세션 하나를 receipt 단계에 따라 기록/보상으로 정확히 한 번 확정한다. */
  const finishSession = useCallback(async (session: WorkoutSession): Promise<EndSessionSummary> => {
    const nowIso = new Date().toISOString();
    const completed = completeSession(session, nowIso, Date.now());
    const bodyParametersBefore = toDanbaekBodyParameters(
      buildDanbaekBodyState({
        growth: state.growth,
        bodyHistory: state.bodyHistory,
        nowIso,
      })
    );

    // 학습 비교용 스냅샷 — 이 세션이 저장되기 **전**의 기록이다.
    const recordsBeforeSession = state.workoutRecords;

    const prs = detectPRs(completed, state.workoutRecords);

    /**
     * 다음 단계 GrowthEngine이 쓸 결과. **이번 세션이 기록으로 저장되기 전에** 만든다 —
     * PR 판정 기준이 "이번 세션 이전까지의 최고 중량"이어야 하기 때문이다.
     * 체중은 실제로 입력된 값(최근 신체 기록 > 프로필)만 넘기고, 없으면 넘기지 않는다.
     */
    const latestBodyWeightKg = state.bodyHistory.reduce<BodyHistoryEntry | undefined>(
      (latest, entry) => (!latest || entry.date > latest.date ? entry : latest),
      undefined
    )?.weightKg;
    const sessionResult = buildWorkoutSessionResult({
      session: completed,
      exerciseDb: Exercises,
      records: state.workoutRecords,
      bodyWeightKg: latestBodyWeightKg ?? state.profile?.weightKg,
    });

    const titleLabel = completed.primaryMuscleGroup
      ? MuscleGroupLabels[completed.primaryMuscleGroup]
      : WorkoutCategoryLabels[completed.primaryCategory];
    const recordInput = sessionToWorkoutRecordInput(completed, titleLabel);

    // 루틴 완료 보너스도 실제로 수행한 운동만 인정한다 — 체크만 하고 횟수가 없는 세트로는
    // 루틴이 완료되지 않는다 (기록/XP/streak과 같은 유효 세트 기준).
    let routineCompleted = false;
    if (completed.routineId) {
      const routine = state.routines.find((r) => r.id === completed.routineId);
      if (routine) routineCompleted = isRoutineCompleted(completed, routine.exerciseIds);
    }

    const xpAwarded =
      AppConfig.passXpPerSession +
      prs.length * AppConfig.passXpPerPr +
      (routineCompleted ? AppConfig.passXpPerRoutineCompletion : 0);
    const newXp = addXp(state.pass.xp, xpAwarded);

    const initialReceipt: SessionCompletionReceipt = {
      version: 1,
      sessionId: completed.id,
      completedAt: nowIso,
      growthApplied: false,
      workoutRecordSaved: false,
      rewardsSaved: false,
      snapshot: {
        sessionResult,
        recordInput,
        durationMinutes: recordInput.durationMinutes ?? 0,
        category: completed.primaryCategory,
        exerciseCount: computeCompletedExerciseCount(completed),
        completedSets: computeCompletedSetsCount(completed),
        totalVolumeKg: computeTotalVolumeKg(completed),
        prs,
        xpAwarded,
        passXpAfter: newXp,
        passLevel: computePassLevelProgress(newXp).level,
        routineCompleted,
        bodyParametersBefore,
      },
    };

    const completion = await runSessionCompletion(initialReceipt, {
      loadReceipt: getPendingSessionCompletion,
      saveReceipt: savePendingSessionCompletion,
      clearReceipt: clearPendingSessionCompletion,
      applyGrowth: async (snapshot) => {
        const growth = await growthEngine.applySessionResult(snapshot.sessionResult);
        const growthState = await getGrowthState();
        const bodyAfter = buildDanbaekBodyState({
          growth: growthState,
          bodyHistory: state.bodyHistory,
          nowIso: snapshot.sessionResult.endedAt,
        });
        const growthAfter = updateBodyComposition(
          growthState,
          {
            fatStage: bodyAfter.fatStage,
            fatStageSource: bodyAfter.fatStageSource,
            definitionStage: bodyAfter.definitionStage,
          },
          snapshot.sessionResult.endedAt
        );
        await saveGrowthState(growthAfter);
        setState((prev) => ({ ...prev, growth: growthAfter }));

        const bodyParametersAfter = toDanbaekBodyParameters(
          buildDanbaekBodyState({
            growth: growthAfter,
            bodyHistory: state.bodyHistory,
            nowIso: snapshot.sessionResult.endedAt,
          })
        );
        return {
          growth,
          bodyParametersAfter,
          bodyParametersWithPump: applyPumpToBodyParameters(
            bodyParametersAfter,
            growth?.pumpByMuscle ?? {}
          ),
        };
      },
      saveWorkoutRecord: async (snapshot) => {
        const workoutRecords = await addWorkoutRecordRepo(snapshot.recordInput);
        setState((prev) => ({ ...prev, workoutRecords }));
      },
      saveRewards: async (snapshot) => {
        // 목표 XP 절대값 저장이라 성공 뒤 receipt 갱신 전에 실패해도 재시도가 중복 가산하지 않는다.
        await savePassState({ xp: snapshot.passXpAfter });
        const streak = await registerRecordDate(snapshot.recordInput.date);
        const workoutRecords = await getWorkoutRecords();
        setState((prev) => ({
          ...prev,
          workoutRecords,
          streak,
          pass: { xp: snapshot.passXpAfter },
        }));
        return {
          weeklyCount: getThisWeekRecords(workoutRecords, snapshot.recordInput.date).length,
          streak: streak.currentStreakDays,
        };
      },
      cleanupSession: async (snapshot) => {
        const persistedGrowth = await getGrowthState();
        if (
          persistedGrowth.pendingCompletionResult?.sessionId ===
          snapshot.sessionResult.sessionId
        ) {
          const cleanedGrowth = {
            ...persistedGrowth,
            pendingCompletionResult: undefined,
          };
          await saveGrowthState(cleanedGrowth);
          setState((prev) => ({ ...prev, growth: cleanedGrowth }));
        }
        await clearActiveSession();
      },
    });

    activeSessionRef.current = null;
    setState((prev) => ({ ...prev, activeSession: null }));
    const snapshot = completion.snapshot;
    if (
      snapshot.weeklyCount === undefined ||
      snapshot.streak === undefined ||
      !snapshot.bodyParametersAfter ||
      !snapshot.bodyParametersWithPump
    ) {
      throw new Error('Session completion receipt is missing its final result snapshot.');
    }

    // 저장이 끝난 뒤의 기록으로 다시 읽는다. 학습은 기록에서만 나오므로, 기록이 남지
    // 않았다면 배운 것도 없다.
    const learning = diffLearningProfiles(
      buildDanbaekLearningProfile({ records: recordsBeforeSession, generatedAt: nowIso }),
      buildDanbaekLearningProfile({ records: await getWorkoutRecords(), generatedAt: nowIso })
    );

    return {
      durationMinutes: snapshot.durationMinutes,
      category: snapshot.category,
      weeklyCount: snapshot.weeklyCount,
      streak: snapshot.streak,
      exerciseCount: snapshot.exerciseCount,
      completedSets: snapshot.completedSets,
      totalVolumeKg: snapshot.totalVolumeKg,
      prs: snapshot.prs,
      xpAwarded: snapshot.xpAwarded,
      passLevel: snapshot.passLevel,
      routineCompleted: snapshot.routineCompleted,
      sessionResult: snapshot.sessionResult,
      growth: snapshot.growth ?? null,
      bodyParametersBefore: snapshot.bodyParametersBefore,
      bodyParametersAfter: snapshot.bodyParametersAfter,
      bodyParametersWithPump: snapshot.bodyParametersWithPump,
      learning,
    };
  }, [state.workoutRecords, state.routines, state.pass, state.bodyHistory, state.profile, state.growth]);

  const endWorkoutSession = useCallback<AppDataContextValue['endWorkoutSession']>(async () => {
    // [종료하고 기록]이 연타되거나 두 손가락으로 눌려도 기록은 정확히 한 번만 저장된다.
    // 세션은 ref에서 읽는다 — 방금 완료한 마지막 세트가 렌더 클로저에는 아직 없을 수 있다.
    if (endingSessionRef.current) return null;
    const session = activeSessionRef.current;
    if (!session) return null;
    // UI를 우회해 직접 호출해도 빈 세션은 기록/연속/XP/Growth 완료 경로에 들어갈 수 없다.
    if (computeCompletedSetsCount(session) === 0) return null;
    endingSessionRef.current = true;

    try {
      return await finishSession(session);
    } finally {
      endingSessionRef.current = false;
    }
  }, [finishSession]);

  const discardWorkoutSession = useCallback<AppDataContextValue['discardWorkoutSession']>(async () => {
    const session = activeSessionRef.current;
    if (!session || computeCompletedSetsCount(session) > 0) return;
    await clearActiveSession();
    activeSessionRef.current = null;
    setState((prev) => ({ ...prev, activeSession: null }));
  }, []);

  const saveRoutine = useCallback<AppDataContextValue['saveRoutine']>(async (input) => {
    const routines = await saveRoutineRepo(input);
    setState((prev) => ({ ...prev, routines }));
  }, []);

  const updateRoutine = useCallback<AppDataContextValue['updateRoutine']>(async (routineId, input) => {
    const routines = await updateRoutineRepo(routineId, input);
    setState((prev) => ({ ...prev, routines }));
  }, []);

  const removeRoutine = useCallback<AppDataContextValue['removeRoutine']>(async (routineId) => {
    const routines = await deleteRoutineRepo(routineId);
    setState((prev) => ({ ...prev, routines }));
  }, []);

  const watchRewardedAd = useCallback(async () => {
    const result = await rewardedAdService.showRewardedAd();
    if (result.granted) {
      const trainerUsage = await grantRewardedPtUses(result.rewardUnits);
      setState((prev) => ({ ...prev, trainerUsage }));
    }
  }, []);

  const isSubscribed = state.subscription.status === 'active';
  const hasAiPtAccess = isSubscribed || state.trainerUsage.rewardedPtUsesRemaining > 0;

  /**
   * 유료 구독과 광고 보상 AI PT는 접근 방식만 다르고 AI 기능 자체는 동일하다
   * (제품 기획 6/7장) — 이 함수 하나로 접근 가능 여부 확인 + 이용권 차감을 공유한다.
   */
  const consumeAiAccess = useCallback(async (): Promise<boolean> => {
    if (isSubscribed) return true;
    if (state.trainerUsage.rewardedPtUsesRemaining <= 0) return false;
    const trainerUsage = await consumeRewardedPtUse();
    setState((prev) => ({ ...prev, trainerUsage }));
    return true;
  }, [isSubscribed, state.trainerUsage.rewardedPtUsesRemaining]);

  /**
   * PT에게 넘기는 컨텍스트. 실제 저장된 기록만 들어가고, 없는 값은 null이다.
   * 화면(무료 브리핑)과 AI 요청이 같은 값을 보기 때문에 둘이 서로 다른 숫자를 말할 수 없다.
   */
  /**
   * 단백이의 학습 스냅샷. 기록이 바뀔 때만 다시 만든다 — 저장된 기록이 유일한 근거이므로
   * 다른 상태(성장/PASS/세션)가 바뀌었다고 학습이 달라지지 않는다.
   */
  const danbaekLearning = useMemo(
    () =>
      buildDanbaekLearningProfile({
        records: state.workoutRecords,
        generatedAt: new Date().toISOString(),
      }),
    [state.workoutRecords]
  );

  const ptContext = useMemo(
    () =>
      buildPtContext({
        profile: state.profile,
        bodyHistory: state.bodyHistory,
        workoutRecords: state.workoutRecords,
        streak: state.streak,
        routines: state.routines,
        activeSession: state.activeSession,
        scheduledRoutine: getTodaysScheduledRoutine(state.routines, new Date().getDay()),
      }),
    [state.profile, state.bodyHistory, state.workoutRecords, state.streak, state.routines, state.activeSession]
  );

  const sendPtMessage = useCallback<AppDataContextValue['sendPtMessage']>(
    async ({ text, quickActionId, history }) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const allowed = await consumeAiAccess();
      if (!allowed) return null;

      // 질문에서 앱 운동 DB의 운동이 잡히면 그 운동 데이터(설명/주의/내 기록)도 함께 넘긴다 —
      // PT가 운동 상세 화면과 다른 설명을 하지 않게 하기 위한 것이다.
      const matched = matchExerciseInText(trimmed, Exercises, searchExercises);
      const exercise = matched ? buildPtExerciseBrief(matched, state.workoutRecords) : null;

      return aiTrainerService.send({
        text: trimmed,
        quickActionId,
        context: ptContext,
        exercise,
        history: history.slice(-AppConfig.aiHistoryMessageLimit),
      });
    },
    [consumeAiAccess, ptContext, state.workoutRecords]
  );

  const subscribeMock = useCallback(async (tierId: string) => {
    const subscription = await subscriptionService.subscribe(tierId);
    setState((prev) => ({ ...prev, subscription }));
  }, []);

  const cancelSubscriptionMock = useCallback(async () => {
    const subscription = await subscriptionService.cancel();
    setState((prev) => ({ ...prev, subscription }));
  }, []);

  const redeemReferralCode = useCallback(async (code: string) => {
    const result = await referralService.redeemCode(code);
    if (result.success) {
      const referral = await getReferralState();
      const currentPass = await getOpenEventPassState();
      const now = new Date();
      const baseExpiry =
        currentPass.active && currentPass.expiresAt ? new Date(currentPass.expiresAt) : now;
      baseExpiry.setDate(baseExpiry.getDate() + (result.bonusDaysGranted ?? 0));

      const openEventPass: OpenEventPassState = {
        active: true,
        activatedAt: currentPass.activatedAt ?? now.toISOString(),
        expiresAt: baseExpiry.toISOString(),
      };
      await saveOpenEventPassState(openEventPass);

      setState((prev) => ({ ...prev, referral, openEventPass }));
    }
    return result;
  }, []);

  const activateOpenEventPass = useCallback(async () => {
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + AppConfig.openEventPassDays);
    const openEventPass: OpenEventPassState = {
      active: true,
      activatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    await saveOpenEventPassState(openEventPass);
    setState((prev) => ({ ...prev, openEventPass }));
  }, []);


  const setNutritionState = useCallback<AppDataContextValue['setNutritionState']>(
    async (nutritionState) => {
      patchBodyComposition({ nutritionState });
    },
    [patchBodyComposition]
  );

  const setRecoveryState = useCallback<AppDataContextValue['setRecoveryState']>(
    async (recoveryState) => {
      patchBodyComposition({ recoveryState });
    },
    [patchBodyComposition]
  );

  const resetAllData = useCallback(async () => {
    await clearAllKeys(Object.values(StorageKeys));
    setState({ ...initialState, loading: false });
  }, []);

  const today = todayDateString();
  const canAddPhotoToday = __DEV__ || !hasReachedDailyPhotoLimit(state.bodyHistory, today);

  // 캐릭터 외형은 프로필에서만 나온다 — 운동 기록/PASS로 전신이 자동 성장하지 않는다.
  const characterAppearance = characterAppearanceFromProfile(state.profile);

  /**
   * 단백이 몸 상태와 렌더링 파라미터. 저장하지 않고 입력(근육 stage / 신체 기록 /
   * 식단·회복)에서 매번 계산한다 — 파생값을 영속화하면 입력과 어긋날 수 있다.
   * pump는 여기 들어가지 않는다: 세션 결과에서만 잠깐 얹는 일시값이다.
   */
  const bodyState = useMemo(
    () =>
      buildDanbaekBodyState({
        growth: state.growth,
        bodyHistory: state.bodyHistory,
        nowIso: new Date().toISOString(),
      }),
    [state.growth, state.bodyHistory]
  );
  const bodyParameters = useMemo(() => toDanbaekBodyParameters(bodyState), [bodyState]);

  const value: AppDataContextValue = {
    ...state,
    hasSubscriptionAccess: isSubscribed,
    hasAiPtAccess,
    canAddPhotoToday,
    nextPhotoAvailableDate: tomorrowDateString(today),
    passProgress: computePassLevelProgress(state.pass.xp),
    characterAppearance,
    bodyState,
    bodyParameters,
    setNutritionState,
    setRecoveryState,
    completeOnboarding,
    updateProfile,
    addWorkoutRecord,
    deleteWorkoutRecord,
    addBodyHistoryEntry,
    claimStreakReward,
    watchRewardedAd,
    startWorkoutSession,
    pauseWorkoutSession,
    resumeWorkoutSession,
    changeSessionCategory,
    addExerciseToSession,
    setCurrentSessionExercise,
    addSetToExercise,
    updateSessionSet,
    adjustSessionSet,
    completeSessionSet,
    ensureSessionPendingSet,
    startSessionRest,
    skipSessionRest,
    discardWorkoutSession,
    endWorkoutSession,
    saveRoutine,
    updateRoutine,
    removeRoutine,
    ptContext,
    danbaekLearning,
    aiConnected: aiTrainerService.isAiConnected,
    sendPtMessage,
    subscribeMock,
    cancelSubscriptionMock,
    redeemReferralCode,
    activateOpenEventPass,
    resetAllData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
