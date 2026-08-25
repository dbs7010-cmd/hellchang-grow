import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HomeColors, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import {
  availableHomeGymCoins,
  buyHomeGymItem,
  getHomeGymState,
  getNextHomeGymItem,
  HOME_GYM_REWARD_PER_WORKOUT,
  HomeGymItemIds,
  recentHomeGymRewardCoins,
  type HomeGymState,
} from '@/data/home-gym-repository';

export function HomeGymRewardStrip() {
  const { workoutRecords } = useAppData();
  const [state, setState] = useState<HomeGymState | null>(null);
  const [saving, setSaving] = useState(false);
  const [rewardDismissed, setRewardDismissed] = useState(false);
  const completedWorkoutCount = workoutRecords.length;

  useEffect(() => {
    let cancelled = false;
    getHomeGymState().then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => { cancelled = true; };
  }, []);

  const coins = useMemo(
    () => (state ? availableHomeGymCoins(state, completedWorkoutCount) : 0),
    [completedWorkoutCount, state]
  );
  const latestRecord = workoutRecords.reduce<(typeof workoutRecords)[number] | null>((latest, record) => {
    if (!latest) return record;
    return Date.parse(record.createdAt) > Date.parse(latest.createdAt) ? record : latest;
  }, null);
  const recentReward = rewardDismissed ? 0 : recentHomeGymRewardCoins(latestRecord?.createdAt);
  const nextItem = state ? getNextHomeGymItem(state) : null;
  const rackPlaced = state?.placedItemIds.includes(HomeGymItemIds.starterRack) ?? false;
  const benchPlaced = state?.placedItemIds.includes(HomeGymItemIds.flatBench) ?? false;

  if (!state || completedWorkoutCount === 0) return null;

  const handleBuy = async () => {
    if (saving || !nextItem || coins < nextItem.cost) return;
    setSaving(true);
    try {
      const next = await buyHomeGymItem(state, completedWorkoutCount, nextItem.id);
      if (next) setState(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {recentReward > 0 && (
        <Pressable
          onPress={() => setRewardDismissed(true)}
          accessibilityRole="button"
          accessibilityLabel={`방금 운동 보상 홈짐 코인 ${recentReward}, 닫기`}
          style={styles.rewardReceipt}>
          <View style={styles.rewardReceiptCopy}>
            <ThemedText type="captionBold" style={styles.title}>운동 보상 획득</ThemedText>
            <ThemedText type="caption" style={styles.subtitle}>방금 운동이 홈짐 성장으로 이어졌어요.</ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.rewardAmount}>+{recentReward} 🪙</ThemedText>
        </Pressable>
      )}

      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <ThemedText type="captionBold" style={styles.title}>🪙 홈짐 {coins}</ThemedText>
          <ThemedText type="caption" style={styles.subtitle}>
            {rackPlaced || benchPlaced ? '운동으로 만든 내 홈짐' : `운동 1회 = 홈짐 코인 ${HOME_GYM_REWARD_PER_WORKOUT}`}
          </ThemedText>
        </View>
        {nextItem && (
          <Pressable
            onPress={handleBuy}
            disabled={saving || coins < nextItem.cost}
            style={[styles.buyButton, coins < nextItem.cost && styles.buyButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel={`${nextItem.name} 구매, ${nextItem.cost} 코인`}>
            <ThemedText type="captionBold" style={styles.buyText}>
              {coins >= nextItem.cost ? `${nextItem.name} ${nextItem.cost}` : `${coins}/${nextItem.cost}`}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {(rackPlaced || benchPlaced) && (
        <View style={styles.gymFloor} accessibilityLabel="내 홈짐에 배치된 운동 기구">
          {rackPlaced && (
            <View style={styles.placedObject}>
              <View style={styles.rackVisual} pointerEvents="none">
                <View style={styles.rackPost} /><View style={[styles.rackPost, styles.rackPostRight]} />
                <View style={styles.rackShelf} /><View style={[styles.dumbbell, styles.dumbbellLeft]} />
                <View style={[styles.dumbbell, styles.dumbbellRight]} />
              </View>
              <ThemedText type="captionBold" style={styles.objectName}>덤벨 랙</ThemedText>
            </View>
          )}
          {benchPlaced && (
            <View style={styles.placedObject}>
              <View style={styles.benchVisual} pointerEvents="none">
                <View style={styles.benchPad} /><View style={[styles.benchLeg, styles.benchLegLeft]} />
                <View style={[styles.benchLeg, styles.benchLegRight]} />
              </View>
              <ThemedText type="captionBold" style={styles.objectName}>플랫 벤치</ThemedText>
            </View>
          )}
        </View>
      )}

      {state.ownedItemIds.length > 0 && (
        <ThemedText type="caption" style={styles.subtitle}>
          홈짐 기구 {state.ownedItemIds.length}/2 · 구매 즉시 영구 배치
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, marginTop: Spacing.one, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: HomeColors.border },
  rewardReceipt: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, borderRadius: Radius.medium, backgroundColor: HomeColors.surfaceGold, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  rewardReceiptCopy: { flex: 1, gap: 1 },
  rewardAmount: { color: HomeColors.goldStrong },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  copy: { flex: 1, gap: 2 },
  title: { color: HomeColors.goldStrong },
  subtitle: { color: HomeColors.textSecondary },
  buyButton: { borderRadius: Radius.pill, backgroundColor: HomeColors.surfaceGold, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  buyButtonDisabled: { opacity: 0.45 },
  buyText: { color: HomeColors.goldStrong },
  gymFloor: { minHeight: 70, flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three, borderRadius: Radius.medium, backgroundColor: HomeColors.surfaceMuted, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  placedObject: { flex: 1, alignItems: 'center', gap: 3 },
  rackVisual: { width: 58, height: 42, position: 'relative' },
  rackPost: { position: 'absolute', left: 8, top: 3, width: 4, height: 36, borderRadius: 2, backgroundColor: HomeColors.textSecondary },
  rackPostRight: { left: 46 },
  rackShelf: { position: 'absolute', left: 7, right: 7, top: 24, height: 4, borderRadius: 2, backgroundColor: HomeColors.textSecondary },
  dumbbell: { position: 'absolute', top: 16, width: 17, height: 8, borderRadius: 4, backgroundColor: HomeColors.goldStrong },
  dumbbellLeft: { left: 13 },
  dumbbellRight: { right: 13 },
  benchVisual: { width: 66, height: 42, position: 'relative' },
  benchPad: { position: 'absolute', left: 4, right: 4, top: 13, height: 10, borderRadius: 5, backgroundColor: HomeColors.goldStrong },
  benchLeg: { position: 'absolute', top: 22, width: 4, height: 16, borderRadius: 2, backgroundColor: HomeColors.textSecondary },
  benchLegLeft: { left: 15 },
  benchLegRight: { right: 15 },
  objectName: { color: HomeColors.text },
});
