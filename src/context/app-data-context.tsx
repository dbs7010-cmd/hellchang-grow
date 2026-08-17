import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { AppConfig } from '@/config/app-config';
import { MuscleGroupLabels } from '@/config/muscle-groups';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import {
  addBodyHistoryEntry as addBodyHistoryEntryRepo,
  getBodyHistory,
  hasReachedDailyPhotoLimit,
} from '@/data/body-history-repository';
import { getOpenEventPassState, saveOpenEventPassState } from '@/data/event-repository';
import { getPassState, savePassState } from '@/data/pass-repository';
import {
  getOnboardingComplete,
  getUserProfile,
  saveUserProfile,
  setOnboardingComplete as setOnboardingCompleteRepo,
} from '@/data/profile-repository';
import { getReferralState } from '@/data/referral-repository';
import { deleteRoutine as deleteRoutineRepo, getRoutines, saveRoutine as saveRoutineRepo } from '@/data/routine-repository';
import { claimStreakReward as claimStreakRewardRepo, getStreakState, registerTodayRecord } from '@/data/streak-repository';
import { getSubscriptionState } from '@/data/subscription-repository';
import { grantRewardedPtUses, getTrainerUsageState, consumeRewardedPtUse } from '@/data/trainer-usage-repository';
import {
  addWorkoutRecord as addWorkoutRecordRepo,
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
import { aiTrainerService } from '@/services/trainer/mock-ai-trainer-service';
import { AiQuickActionId, AiTrainerMessage } from '@/services/trainer/ai-trainer-service';
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
import { todayDateString, tomorrowDateString } from '@/utils/date';
import { PrEvent, detectPRs } from '@/utils/exercise-history';
import { createId } from '@/utils/id';
import { addXp, computePassLevelProgress } from '@/utils/pass';
import {
  addExerciseToSession as addExerciseToSessionPure,
  addSetToExercise as addSetToExercisePure,
  changeSessionCategory as changeSessionCategoryPure,
  clearRest as clearRestPure,
  completeSession,
  completeSet as completeSetPure,
  computeCompletedSetsCount,
  computeTotalVolumeKg,
  createSession,
  pauseSession,
  resumeSession,
  sessionToWorkoutRecordInput,
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
}

interface AppDataContextValue extends AppDataState {
  hasSubscriptionAccess: boolean;
  hasAiPtAccess: boolean;
  /** 오늘 사진 기반 신체 기록을 추가할 수 있는지 (DEV 빌드에서는 항상 true) */
  canAddPhotoToday: boolean;
  /** canAddPhotoToday가 false일 때, 다음으로 가능한 날짜 (YYYY-MM-DD) */
  nextPhotoAvailableDate: string;
  passProgress: ReturnType<typeof computePassLevelProgress>;
  completeOnboarding: (input: {
    profile: Omit<UserProfile, 'id' | 'createdAt'>;
    photoUri?: string;
  }) => Promise<void>;
  addWorkoutRecord: (
    input: Parameters<typeof addWorkoutRecordRepo>[0]
  ) => Promise<{ workoutRecords: WorkoutRecord[]; streak: StreakState }>;
  addBodyHistoryEntry: (input: Parameters<typeof addBodyHistoryEntryRepo>[0]) => Promise<void>;
  claimStreakReward: () => Promise<void>;
  watchRewardedAd: () => Promise<void>;
  startWorkoutSession: (
    category: WorkoutCategory,
    options?: {
      primaryMuscleGroup?: MuscleGroup;
      routineId?: string;
      initialExercises?: { exerciseId: string; exerciseName: string }[];
    }
  ) => Promise<void>;
  pauseWorkoutSession: () => Promise<void>;
  resumeWorkoutSession: () => Promise<void>;
  changeSessionCategory: (category: WorkoutCategory) => Promise<void>;
  addExerciseToSession: (exercise: { exerciseId: string; exerciseName: string }) => Promise<void>;
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
  completeSessionSet: (exerciseEntryId: string, setId: string) => Promise<void>;
  startSessionRest: (seconds: number) => Promise<void>;
  skipSessionRest: () => Promise<void>;
  endWorkoutSession: () => Promise<EndSessionSummary | null>;
  saveRoutine: (input: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeRoutine: (routineId: string) => Promise<void>;
  sendAiQuickAction: (actionId: AiQuickActionId) => Promise<AiTrainerMessage | null>;
  sendAiMessage: (text: string) => Promise<AiTrainerMessage | null>;
  subscribeMock: (tierId: string) => Promise<void>;
  cancelSubscriptionMock: () => Promise<void>;
  redeemReferralCode: (code: string) => Promise<ReferralRedemptionResult>;
  activateOpenEventPass: () => Promise<void>;
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
};

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(initialState);

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
      ]);

      if (cancelled) return;

      setState({
        loading: false,
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
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = useCallback<AppDataContextValue['completeOnboarding']>(
    async ({ profile, photoUri }) => {
      const newProfile: UserProfile = {
        ...profile,
        id: `profile-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(newProfile);
      await setOnboardingCompleteRepo(true);

      const bodyHistory = await addBodyHistoryEntryRepo({
        date: todayDateString(),
        weightKg: newProfile.weightKg,
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

  const addWorkoutRecord = useCallback<AppDataContextValue['addWorkoutRecord']>(async (input) => {
    const workoutRecords = await addWorkoutRecordRepo(input);
    const streak = await registerTodayRecord();
    setState((prev) => ({ ...prev, workoutRecords, streak }));
    return { workoutRecords, streak };
  }, []);

  const addBodyHistoryEntry = useCallback<AppDataContextValue['addBodyHistoryEntry']>(
    async (input) => {
      const bodyHistory = await addBodyHistoryEntryRepo(input);
      setState((prev) => ({ ...prev, bodyHistory }));
    },
    []
  );

  const claimStreakReward = useCallback(async () => {
    const streak = await claimStreakRewardRepo();
    setState((prev) => ({ ...prev, streak }));
  }, []);

  const startWorkoutSession = useCallback<AppDataContextValue['startWorkoutSession']>(
    async (category, options) => {
      if (state.activeSession && state.activeSession.status !== 'completed') return;
      const session = createSession(category, createId('session'), new Date().toISOString(), options);
      await saveActiveSession(session);
      setState((prev) => ({ ...prev, activeSession: session }));
    },
    [state.activeSession]
  );

  const pauseWorkoutSession = useCallback(async () => {
    if (!state.activeSession) return;
    const updated = pauseSession(state.activeSession, Date.now());
    await saveActiveSession(updated);
    setState((prev) => ({ ...prev, activeSession: updated }));
  }, [state.activeSession]);

  const resumeWorkoutSession = useCallback(async () => {
    if (!state.activeSession) return;
    const updated = resumeSession(state.activeSession, new Date().toISOString());
    await saveActiveSession(updated);
    setState((prev) => ({ ...prev, activeSession: updated }));
  }, [state.activeSession]);

  const changeSessionCategory = useCallback<AppDataContextValue['changeSessionCategory']>(
    async (category) => {
      if (!state.activeSession) return;
      const updated = changeSessionCategoryPure(state.activeSession, category);
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const addExerciseToSession = useCallback<AppDataContextValue['addExerciseToSession']>(
    async (exercise) => {
      if (!state.activeSession) return;
      const updated = addExerciseToSessionPure(state.activeSession, {
        id: createId('session-ex'),
        ...exercise,
      });
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const setCurrentSessionExercise = useCallback<AppDataContextValue['setCurrentSessionExercise']>(
    async (exerciseEntryId) => {
      if (!state.activeSession) return;
      const updated = setCurrentExercisePure(state.activeSession, exerciseEntryId);
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const addSetToExercise = useCallback<AppDataContextValue['addSetToExercise']>(
    async (exerciseEntryId, initial) => {
      if (!state.activeSession) return;
      const updated = addSetToExercisePure(state.activeSession, exerciseEntryId, createId('set'), initial);
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const updateSessionSet = useCallback<AppDataContextValue['updateSessionSet']>(
    async (exerciseEntryId, setId, patch) => {
      if (!state.activeSession) return;
      const updated = updateSetPure(state.activeSession, exerciseEntryId, setId, patch);
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const completeSessionSet = useCallback<AppDataContextValue['completeSessionSet']>(
    async (exerciseEntryId, setId) => {
      if (!state.activeSession) return;
      const updated = completeSetPure(state.activeSession, exerciseEntryId, setId);
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const startSessionRest = useCallback<AppDataContextValue['startSessionRest']>(
    async (seconds) => {
      if (!state.activeSession) return;
      const updated = startRestPure(state.activeSession, seconds, Date.now());
      await saveActiveSession(updated);
      setState((prev) => ({ ...prev, activeSession: updated }));
    },
    [state.activeSession]
  );

  const skipSessionRest = useCallback(async () => {
    if (!state.activeSession) return;
    const updated = clearRestPure(state.activeSession);
    await saveActiveSession(updated);
    setState((prev) => ({ ...prev, activeSession: updated }));
  }, [state.activeSession]);

  const endWorkoutSession = useCallback<AppDataContextValue['endWorkoutSession']>(async () => {
    if (!state.activeSession) return null;
    const nowIso = new Date().toISOString();
    const completed = completeSession(state.activeSession, nowIso, Date.now());

    const prs = detectPRs(completed, state.workoutRecords);

    const titleLabel = completed.primaryMuscleGroup
      ? MuscleGroupLabels[completed.primaryMuscleGroup]
      : WorkoutCategoryLabels[completed.primaryCategory];
    const recordInput = sessionToWorkoutRecordInput(completed, titleLabel);

    const { workoutRecords, streak } = await addWorkoutRecord(recordInput);

    let routineCompleted = false;
    if (completed.routineId) {
      const routine = state.routines.find((r) => r.id === completed.routineId);
      if (routine) {
        const doneExerciseIds = new Set(
          completed.exercises.filter((e) => e.sets.some((s) => s.completed)).map((e) => e.exerciseId)
        );
        routineCompleted =
          routine.exerciseIds.length > 0 && routine.exerciseIds.every((id) => doneExerciseIds.has(id));
      }
    }

    const xpAwarded =
      AppConfig.passXpPerSession +
      prs.length * AppConfig.passXpPerPr +
      (routineCompleted ? AppConfig.passXpPerRoutineCompletion : 0);
    const newXp = addXp(state.pass.xp, xpAwarded);
    await savePassState({ xp: newXp });

    await clearActiveSession();
    setState((prev) => ({ ...prev, activeSession: null, pass: { xp: newXp } }));

    return {
      durationMinutes: recordInput.durationMinutes ?? 0,
      category: completed.primaryCategory,
      weeklyCount: getThisWeekRecords(workoutRecords).length,
      streak: streak.currentStreakDays,
      exerciseCount: completed.exercises.length,
      completedSets: computeCompletedSetsCount(completed),
      totalVolumeKg: computeTotalVolumeKg(completed),
      prs,
      xpAwarded,
      passLevel: computePassLevelProgress(newXp).level,
      routineCompleted,
    };
  }, [state.activeSession, state.workoutRecords, state.routines, state.pass, addWorkoutRecord]);

  const saveRoutine = useCallback<AppDataContextValue['saveRoutine']>(async (input) => {
    const routines = await saveRoutineRepo(input);
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

  const sendAiQuickAction = useCallback<AppDataContextValue['sendAiQuickAction']>(
    async (actionId) => {
      const allowed = await consumeAiAccess();
      if (!allowed) return null;
      return aiTrainerService.sendQuickAction(actionId);
    },
    [consumeAiAccess]
  );

  const sendAiMessage = useCallback<AppDataContextValue['sendAiMessage']>(
    async (text) => {
      const allowed = await consumeAiAccess();
      if (!allowed) return null;
      return aiTrainerService.sendMessage(text);
    },
    [consumeAiAccess]
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

  const resetAllData = useCallback(async () => {
    await clearAllKeys(Object.values(StorageKeys));
    setState({ ...initialState, loading: false });
  }, []);

  const today = todayDateString();
  const canAddPhotoToday = __DEV__ || !hasReachedDailyPhotoLimit(state.bodyHistory, today);

  const value: AppDataContextValue = {
    ...state,
    hasSubscriptionAccess: isSubscribed,
    hasAiPtAccess,
    canAddPhotoToday,
    nextPhotoAvailableDate: tomorrowDateString(today),
    passProgress: computePassLevelProgress(state.pass.xp),
    completeOnboarding,
    addWorkoutRecord,
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
    completeSessionSet,
    startSessionRest,
    skipSessionRest,
    endWorkoutSession,
    saveRoutine,
    removeRoutine,
    sendAiQuickAction,
    sendAiMessage,
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
