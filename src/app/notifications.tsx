import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppConfig } from '@/config/app-config';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * 16 SCREEN 중 "NOTIFICATIONS". 홈을 지저분하게 만드는 이벤트/보상 정보를 이 화면으로 뺐다.
 * CANON은 "작은 아이콘 + 제목 + 보조 텍스트 + 시간"의 compact event feed 구조를 요구한다 —
 * 다만 알림 로그를 저장하는 별도 구조가 아직 없어서, 실제 존재하지 않는 타임스탬프를
 * 지어내지 않는다. 대신 아이콘/제목/보조텍스트를 한 줄 feed row로 통일하고, 각 알림의
 * 액션을 row 안의 작은 버튼으로 축소해 반복되는 큰 카드 구조를 없앴다.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openEventPass, streak, claimStreakReward } = useAppData();

  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;
  const showEventItem = !openEventPass.active;
  const hasAny = showEventItem || canClaimReward;

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
      </View>
    </ThemedView>
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
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {secondary}
        </ThemedText>
      </View>
      <Pressable
        onPress={onAction}
        hitSlop={8}
        style={[styles.itemAction, { borderColor: gold ? theme.gold : theme.border }]}>
        <ThemedText type="smallBold" style={{ color: gold ? theme.gold : theme.text }}>
          {actionLabel}
        </ThemedText>
      </Pressable>
    </View>
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
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 44,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemText: {
    flex: 1,
    gap: Spacing.half,
  },
  itemAction: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
