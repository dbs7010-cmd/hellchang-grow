import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PassProgress } from '@/components/ui/pass-progress';
import { PrimaryButton } from '@/components/ui/primary-button';
import { CompactStat, StatRow } from '@/components/ui/stat-row';
import { AppConfig } from '@/config/app-config';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * 16 SCREEN 중 "HELL PASS". 게임성이 가장 강해도 되는 화면 — 단, 별도 캐릭터 레벨은
 * 만들지 않는다. 이 화면이 보여주는 진행도는 홈 HUD와 동일한 passProgress 하나뿐이다.
 */
export default function PassScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { passProgress, streak, claimStreakReward } = useAppData();

  const [claimed, setClaimed] = useState(streak.rewardClaimed);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const canClaim = streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;

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
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={{ color: theme.gold }}>
          HELL PASS
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

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
          { backgroundColor: theme.backgroundElement, shadowColor: theme.gold },
          cardAnimatedStyle,
        ]}>
        <ThemedText type="smallBold">다음 마일스톤</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {AppConfig.streakRewardDays}일 연속 기록 달성 시 특별 트레이너 이용권 {AppConfig.rewardTrainerSessionCount}회
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          현재 연속 기록: {streak.currentStreakDays}일 / {AppConfig.streakRewardDays}일
        </ThemedText>
        {claimed ? (
          <ThemedText type="small" style={{ color: theme.gold }}>
            보상을 받았어요.
          </ThemedText>
        ) : canClaim ? (
          <PrimaryButton label="보상 받기" variant="gold" haptic="success" onPress={handleClaim} />
        ) : (
          <PrimaryButton label="업그레이드" variant="secondary" onPress={() => router.push('/settings')} />
        )}
      </Animated.View>

      <ThemedView type="backgroundElement" style={styles.earnCard}>
        <ThemedText type="smallBold">XP 적립 방법</ThemedText>
        <StatRow>
          <CompactStat label="운동 세션 완료" value={`+${AppConfig.passXpPerSession} XP`} />
          <CompactStat label="PR 달성" value={`+${AppConfig.passXpPerPr} XP`} />
          <CompactStat label="루틴 전체 완료" value={`+${AppConfig.passXpPerRoutineCompletion} XP`} />
        </StatRow>
        <ThemedText type="small" themeColor="textSecondary">
          HELL PASS XP는 게임 진행도예요. 실제 체중/체형은 직접 바꾸지 않아요 — 몸 변화는 항상 실제
          기록에만 근거해요.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
  },
  rewardCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  earnCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
