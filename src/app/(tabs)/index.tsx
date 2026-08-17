import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BodyAvatarPreview } from '@/components/body-avatar-preview';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { AppConfig } from '@/config/app-config';
import { BodyPresetLabels, BodyPresetId } from '@/config/body-presets';
import { StanleyTrainer } from '@/config/trainers';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords, getTodayRecords } from '@/data/workout-repository';
import { getGreetingLine } from '@/utils/trainer-dialogue';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, workoutRecords, streak, openEventPass, activeSession, claimStreakReward, startWorkoutSession } =
    useAppData();

  const hasRecordedToday = getTodayRecords(workoutRecords).length > 0;
  const weeklyCount = getThisWeekRecords(workoutRecords).length;
  // workoutRecords.length를 키에 포함해 기록을 남길 때마다 트레이너 반응이 새로 뽑히게 한다.
  const greeting = useMemo(
    () => getGreetingLine(StanleyTrainer.dialogueSet, { hasRecordedToday, currentStreakDays: streak.currentStreakDays }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasRecordedToday, streak.currentStreakDays, workoutRecords.length]
  );
  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;
  const sessionInProgress = activeSession && activeSession.status !== 'completed';

  const handleStartPress = async () => {
    if (sessionInProgress) {
      router.push('/session');
      return;
    }
    const defaultCategory = workoutRecords[0]?.category ?? 'strength';
    await startWorkoutSession(defaultCategory);
    router.push('/session');
  };

  return (
    <ScreenScroll>
      {!openEventPass.active && (
        <SectionCard>
          <ThemedText type="small" themeColor="textSecondary">
            🎉 오픈 이벤트: 지금 시작하면 무료 패스 {AppConfig.openEventPassDays}일을 받을 수
            있어요.
          </ThemedText>
          <PrimaryButton
            label="무료 패스 받기"
            variant="secondary"
            onPress={() => router.push('/settings')}
          />
        </SectionCard>
      )}

      <View style={styles.characterSection}>
        {profile && (
          <BodyAvatarPreview
            genderExpression={profile.genderExpression}
            size={profile.bodyParameters.size}
            tone={profile.bodyParameters.tone}
          />
        )}
        <ThemedText type="smallBold">
          {profile ? BodyPresetLabels[profile.bodyPresetId as BodyPresetId] : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.trainerLine}>
          {StanleyTrainer.portraitPlaceholder} {greeting.text}
        </ThemedText>
      </View>

      <PrimaryButton
        label={sessionInProgress ? '운동으로 돌아가기' : '운동 시작'}
        size="large"
        onPress={handleStartPress}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.statsLine}>
        이번 주 {weeklyCount}회 · 연속 {streak.currentStreakDays}일째
      </ThemedText>

      {canClaimReward && (
        <SectionCard title="꾸준함 보상 도착">
          <ThemedText type="small" themeColor="textSecondary">
            {AppConfig.streakRewardDays}일 연속 기록 달성! 특별 트레이너 이용권을 받을 수 있어요.
          </ThemedText>
          <PrimaryButton label="보상 받기" onPress={claimStreakReward} />
        </SectionCard>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  characterSection: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  trainerLine: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  statsLine: {
    textAlign: 'center',
  },
});
