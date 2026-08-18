import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AppConfig } from '@/config/app-config';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';

/**
 * 16 SCREEN 중 "NOTIFICATIONS". 홈을 지저분하게 만드는 이벤트/보상 정보를 이 화면으로 뺐다.
 * 실제 존재하는 신호(오픈 이벤트, 꾸준함 보상)만 표시한다 — PR/루틴/골드썬 알림 로그는
 * 아직 별도 저장 구조가 없어서 지어내지 않는다.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openEventPass, streak, claimStreakReward } = useAppData();

  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;

  const hasAny = !openEventPass.active || canClaimReward;

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold">알림</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.list}>
        {!openEventPass.active && (
          <ThemedView type="backgroundElement" style={styles.item}>
            <ThemedText type="small">🎉 이벤트</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              지금 시작하면 무료 패스 {AppConfig.openEventPassDays}일을 받을 수 있어요.
            </ThemedText>
            <PrimaryButton
              label="무료 패스 받기"
              variant="secondary"
              onPress={() => router.push('/settings')}
            />
          </ThemedView>
        )}

        {canClaimReward && (
          <ThemedView type="backgroundElement" style={styles.item}>
            <ThemedText type="small">🏆 HELL PASS</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {AppConfig.streakRewardDays}일 연속 기록 달성! 특별 트레이너 이용권을 받을 수 있어요.
            </ThemedText>
            <PrimaryButton label="보상 받기" onPress={claimStreakReward} />
          </ThemedView>
        )}

        {!hasAny && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            새로운 알림이 없어요.
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    gap: Spacing.three,
  },
  item: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
