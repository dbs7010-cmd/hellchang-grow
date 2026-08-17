import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { AppConfig } from '@/config/app-config';
import { BodyPresetLabels, BodyPresetId } from '@/config/body-presets';
import { StanleyTrainer } from '@/config/trainers';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, workoutRecords, streak, bodyHistory, claimStreakReward } = useAppData();

  const todayRecords = getTodayRecords(workoutRecords);
  const hasRecordedToday = todayRecords.length > 0;
  const greeting = hasRecordedToday
    ? StanleyTrainer.dialogueSet.greetingRecordedToday[0]
    : StanleyTrainer.dialogueSet.greetingNoRecordToday[0];
  const latestBodyEntry = bodyHistory[0];
  const previousBodyEntry = bodyHistory[1];
  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;

  return (
    <ScreenScroll>
      <View style={styles.avatarSection}>
        <ThemedText style={styles.avatarEmoji}>
          {profile?.genderExpression === 'female' ? '🧍‍♀️' : '🧍‍♂️'}
        </ThemedText>
        <ThemedText type="smallBold">
          {profile ? BodyPresetLabels[profile.bodyPresetId as BodyPresetId] : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          연속 {streak.currentStreakDays}일째
        </ThemedText>
      </View>

      <SectionCard title={hasRecordedToday ? '오늘 기록 완료' : '오늘 기록 없음'}>
        <ThemedText type="small" themeColor="textSecondary">
          {hasRecordedToday
            ? `오늘 ${todayRecords.length}개 기록했어요.`
            : '오늘 뭐라도 하고 기록을 남겨보세요.'}
        </ThemedText>
        <PrimaryButton label="운동 기록하기" onPress={() => router.push('/workout')} />
      </SectionCard>

      <SectionCard title={`${StanleyTrainer.displayName} ${StanleyTrainer.portraitPlaceholder}`}>
        <ThemedText type="small" themeColor="textSecondary">
          {greeting.text}
        </ThemedText>
        <PrimaryButton
          label="트레이너 만나기"
          variant="secondary"
          onPress={() => router.push('/trainer')}
        />
      </SectionCard>

      {canClaimReward && (
        <SectionCard title="꾸준함 보상 도착">
          <ThemedText type="small" themeColor="textSecondary">
            {AppConfig.streakRewardDays}일 연속 기록 달성! 특별 트레이너 이용권을 받을 수 있어요.
          </ThemedText>
          <PrimaryButton label="보상 받기" onPress={claimStreakReward} />
        </SectionCard>
      )}

      {latestBodyEntry && (
        <SectionCard title="최근 변화">
          <ThemedText type="small" themeColor="textSecondary">
            최근 체중 {latestBodyEntry.weightKg}kg
            {previousBodyEntry
              ? ` (지난 기록 대비 ${(latestBodyEntry.weightKg - previousBodyEntry.weightKg).toFixed(1)}kg)`
              : ''}
          </ThemedText>
        </SectionCard>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  avatarEmoji: {
    fontSize: 64,
  },
});
