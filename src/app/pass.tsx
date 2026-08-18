import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MetricGrid, MetricTile } from '@/components/ui/metric-tile';
import { PassProgress } from '@/components/ui/pass-progress';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { AppConfig } from '@/config/app-config';
import { Layout, Motion, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * 11 HELL PASS. 게임성이 가장 강해도 되는 화면 — 단, 별도 캐릭터 레벨은 만들지 않는다.
 * 이 화면이 보여주는 진행도는 홈 HUD와 동일한 passProgress 하나뿐이다.
 */
export default function PassScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { passProgress, streak, claimStreakReward } = useAppData();

  const [claimed, setClaimed] = useState(streak.rewardClaimed);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const canClaim = streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;
  const streakProgress = Math.min(1, streak.currentStreakDays / AppConfig.streakRewardDays);

  const handleClaim = async () => {
    await claimStreakReward();
    setClaimed(true);
    scale.value = withSequence(
      withTiming(1.03, { duration: Motion.rewardGlowMs / 2 }),
      withTiming(1, { duration: Motion.rewardGlowMs / 2 })
    );
    glow.value = withSequence(
      withTiming(1, { duration: Motion.rewardGlowMs / 2 }),
      withTiming(0, { duration: Motion.rewardGlowMs / 2 })
    );
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.6,
  }));

  return (
    <SubScreen title="HELL PASS" accent>
      <ThemedView type="backgroundElement" style={styles.progressCard}>
        <PassProgress
          level={passProgress.level}
          xpIntoLevel={passProgress.xpIntoLevel}
          xpForLevel={passProgress.xpForLevel}
          progress={passProgress.progress}
          size="detailed"
        />
      </ThemedView>

      <Animated.View
        style={[
          styles.rewardCard,
          { backgroundColor: theme.backgroundElement, shadowColor: theme.gold, borderColor: theme.gold },
          cardAnimatedStyle,
        ]}>
        <ThemedText type="sectionTitle">다음 마일스톤</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {AppConfig.streakRewardDays}일 연속 기록 달성 시 특별 트레이너 이용권{' '}
          {AppConfig.rewardTrainerSessionCount}회
        </ThemedText>
        <View style={styles.streakRow}>
          <ProgressBar
            progress={streakProgress}
            height={8}
            color={theme.gold}
            trackColor={theme.backgroundSelected}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            연속 {streak.currentStreakDays}일 / {AppConfig.streakRewardDays}일
          </ThemedText>
        </View>
        {claimed ? (
          <ThemedText type="smallBold" style={{ color: theme.gold }}>
            보상을 받았어요.
          </ThemedText>
        ) : canClaim ? (
          <PrimaryButton label="보상 받기" variant="gold" haptic="success" onPress={handleClaim} />
        ) : (
          <PrimaryButton label="업그레이드" variant="secondary" onPress={() => router.push('/settings')} />
        )}
      </Animated.View>

      <Section title="XP 적립 방법">
        <MetricGrid>
          <MetricTile label="운동 세션 완료" value={`+${AppConfig.passXpPerSession}`} />
          <MetricTile label="PR 달성" value={`+${AppConfig.passXpPerPr}`} />
          <MetricTile label="루틴 전체 완료" value={`+${AppConfig.passXpPerRoutineCompletion}`} />
          <MetricTile label="최고 연속" value={`${streak.longestStreakDays}일`} />
        </MetricGrid>
        <ThemedText type="caption" themeColor="textSecondary">
          HELL PASS XP는 게임 진행도예요. 실제 체중/체형은 직접 바꾸지 않아요 — 몸 변화는 항상 내가
          입력한 실제 기록에만 근거해요.
        </ThemedText>
      </Section>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: Radius.large,
    padding: Layout.cardPadding,
  },
  rewardCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Layout.cardPadding,
    gap: Spacing.two,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  streakRow: {
    gap: Spacing.one,
  },
});
