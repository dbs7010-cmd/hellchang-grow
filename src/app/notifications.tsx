import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SubScreen } from '@/components/ui/sub-screen';
import { AppConfig } from '@/config/app-config';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * 15 NOTIFICATIONS. 홈을 지저분하게 만드는 이벤트/보상 정보를 이 화면으로 뺐다.
 * 알림 로그를 저장하는 구조가 아직 없어서 존재하지 않는 타임스탬프를 지어내지 않는다 —
 * 아이콘 + 제목 + 보조 텍스트 + 작은 액션 버튼의 한 줄 feed row로만 통일한다.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const { openEventPass, streak, claimStreakReward } = useAppData();

  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;
  const showEventItem = !openEventPass.active;
  const hasAny = showEventItem || canClaimReward;

  return (
    <SubScreen title="알림" contentGap={Spacing.two}>
      {showEventItem && (
        <NotificationRow
          icon="🎉"
          title="이벤트"
          secondary={`지금 시작하면 무료 패스 ${AppConfig.openEventPassDays}일`}
          actionLabel="받기"
          onAction={() => router.push('/settings')}
        />
      )}

      {canClaimReward && (
        <NotificationRow
          icon="🏆"
          title="HELL PASS"
          secondary={`${AppConfig.streakRewardDays}일 연속 기록 달성 · 트레이너 이용권`}
          actionLabel="받기"
          gold
          onAction={claimStreakReward}
        />
      )}

      {!hasAny && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          새로운 알림이 없어요.
        </ThemedText>
      )}
    </SubScreen>
  );
}

function NotificationRow({
  icon,
  title,
  secondary,
  actionLabel,
  onAction,
  gold,
}: {
  icon: string;
  title: string;
  secondary: string;
  actionLabel: string;
  onAction: () => void;
  gold?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.itemIcon}>{icon}</ThemedText>
      <View style={styles.itemText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
          {secondary}
        </ThemedText>
      </View>
      <Pressable
        onPress={onAction}
        hitSlop={8}
        style={[styles.itemAction, { borderColor: gold ? theme.gold : theme.border }]}>
        <ThemedText type="captionBold" style={{ color: gold ? theme.gold : theme.text }}>
          {actionLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    minHeight: Layout.compactRowHeight,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemText: {
    flex: 1,
  },
  itemAction: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
