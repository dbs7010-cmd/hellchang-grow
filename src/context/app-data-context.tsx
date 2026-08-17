import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { AppConfig } from '@/config/app-config';
import {
  addBodyHistoryEntry as addBodyHistoryEntryRepo,
  getBodyHistory,
} from '@/data/body-history-repository';
import { getOpenEventPassState, saveOpenEventPassState } from '@/data/event-repository';
import {
  getOnboardingComplete,
  getUserProfile,
  saveUserProfile,
  setOnboardingComplete as setOnboardingCompleteRepo,
} from '@/data/profile-repository';
import { getReferralState } from '@/data/referral-repository';
import { claimStreakReward as claimStreakRewardRepo, getStreakState, registerTodayRecord } from '@/data/streak-repository';
import { getSubscriptionState } from '@/data/subscription-repository';
import { grantRewardedPtUses, getTrainerUsageState, consumeRewardedPtUse } from '@/data/trainer-usage-repository';
import { addWorkoutRecord as addWorkoutRecordRepo, getWorkoutRecords } from '@/data/workout-repository';
import { clearAllKeys } from '@/services/storage/local-storage';
import { StorageKeys } from '@/services/storage/keys';
import { rewardedAdService } from '@/services/ads/mock-rewarded-ad-service';
import { referralService } from '@/services/referral/mock-referral-service';
import { subscriptionService } from '@/services/subscription/mock-subscription-service';
import { aiTrainerService } from '@/services/trainer/mock-ai-trainer-service';
import { AiQuickActionId, AiTrainerMessage } from '@/services/trainer/ai-trainer-service';
import { BodyHistoryEntry } from '@/types/body';
import { OpenEventPassState } from '@/types/event';
import { ReferralState, ReferralRedemptionResult } from '@/types/referral';
import { StreakState } from '@/types/streak';
import { SubscriptionState } from '@/types/subscription';
import { TrainerUsageState } from '@/types/ads';
import { UserProfile } from '@/types/user';
import { WorkoutRecord } from '@/types/workout';
import { todayDateString } from '@/utils/date';

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
}

interface AppDataContextValue extends AppDataState {
  hasSubscriptionAccess: boolean;
  completeOnboarding: (input: {
    profile: Omit<UserProfile, 'id' | 'createdAt'>;
  }) => Promise<void>;
  addWorkoutRecord: (input: Parameters<typeof addWorkoutRecordRepo>[0]) => Promise<void>;
  addBodyHistoryEntry: (input: Parameters<typeof addBodyHistoryEntryRepo>[0]) => Promise<void>;
  claimStreakReward: () => Promise<void>;
  watchRewardedAd: () => Promise<void>;
  sendAiQuickAction: (actionId: AiQuickActionId) => Promise<AiTrainerMessage | null>;
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
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = useCallback<AppDataContextValue['completeOnboarding']>(
    async ({ profile }) => {
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
        source: 'manual',
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

  const watchRewardedAd = useCallback(async () => {
    const result = await rewardedAdService.showRewardedAd();
    if (result.granted) {
      const trainerUsage = await grantRewardedPtUses(result.rewardUnits);
      setState((prev) => ({ ...prev, trainerUsage }));
    }
  }, []);

  const sendAiQuickAction = useCallback<AppDataContextValue['sendAiQuickAction']>(
    async (actionId) => {
      const isSubscribed = state.subscription.status === 'active';
      const hasFreeUse = state.trainerUsage.rewardedPtUsesRemaining > 0;
      if (!isSubscribed && !hasFreeUse) {
        return null;
      }

      if (!isSubscribed) {
        const trainerUsage = await consumeRewardedPtUse();
        setState((prev) => ({ ...prev, trainerUsage }));
      }

      return aiTrainerService.sendQuickAction(actionId);
    },
    [state.subscription.status, state.trainerUsage.rewardedPtUsesRemaining]
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

  const value: AppDataContextValue = {
    ...state,
    hasSubscriptionAccess: state.subscription.status === 'active',
    completeOnboarding,
    addWorkoutRecord,
    addBodyHistoryEntry,
    claimStreakReward,
    watchRewardedAd,
    sendAiQuickAction,
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
