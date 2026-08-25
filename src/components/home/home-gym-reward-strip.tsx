import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HomeColors, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import {
  availableHomeGymCoins,
  buyStarterRack,
  getHomeGymState,
  HomeGymItemIds,
  type HomeGymState,
  STARTER_RACK_COST,
} from '@/data/home-gym-repository';

export function HomeGymRewardStrip() {
  const { workoutRecords } = useAppData();
  const [state, setState] = useState<HomeGymState | null>(null);
  const [saving, setSaving] = useState(false);
  const completedWorkoutCount = workoutRecords.length;

  useEffect(() => {
    let cancelled = false;
    getHomeGymState().then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const coins = useMemo(
    () => (state ? availableHomeGymCoins(state, completedWorkoutCount) : 0),
    [completedWorkoutCount, state]
  );
  const ownsRack = state?.ownedItemIds.includes(HomeGymItemIds.starterRack) ?? false;
  const rackPlaced = state?.placedItemIds.includes(HomeGymItemIds.starterRack) ?? false;

  if (!state || completedWorkoutCount === 0) return null;

  const handleBuy = async () => {
    if (saving || ownsRack || coins < STARTER_RACK_COST) return;
    setSaving(true);
    try {
      const next = await buyStarterRack(state, completedWorkoutCount);
      if (next) setState(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <ThemedText type="captionBold" style={styles.title}>
            🪙 홈짐 {coins}
          </ThemedText>
          <ThemedText type="caption" style={styles.subtitle}>
            {rackPlaced ? '운동으로 만든 내 홈짐' : '운동 1회 = 홈짐 코인 10'}
          </ThemedText>
        </View>
        {!ownsRack && (
          <Pressable
            onPress={handleBuy}
            disabled={saving || coins < STARTER_RACK_COST}
            style={[styles.buyButton, coins < STARTER_RACK_COST && styles.buyButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel={`덤벨 랙 구매, ${STARTER_RACK_COST} 코인`}>
            <ThemedText type="captionBold" style={styles.buyText}>
              {coins >= STARTER_RACK_COST ? `덤벨 랙 ${STARTER_RACK_COST}` : `${coins}/${STARTER_RACK_COST}`}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {rackPlaced && (
        <View style={styles.placedObject} accessibilityLabel="내 홈짐에 배치된 덤벨 랙">
          <View style={styles.rackVisual} pointerEvents="none">
            <View style={styles.rackPost} />
            <View style={[styles.rackPost, styles.rackPostRight]} />
            <View style={styles.rackShelf} />
            <View style={[styles.dumbbell, styles.dumbbellLeft]} />
            <View style={[styles.dumbbell, styles.dumbbellRight]} />
          </View>
          <View style={styles.objectCopy}>
            <ThemedText type="smallBold" style={styles.objectName}>덤벨 랙</ThemedText>
            <ThemedText type="caption" style={styles.subtitle}>내 홈짐에 배치됨 · 영구 소유</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: HomeColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  copy: { flex: 1, gap: 2 },
  title: { color: HomeColors.goldStrong },
  subtitle: { color: HomeColors.textSecondary },
  buyButton: {
    borderRadius: Radius.pill,
    backgroundColor: HomeColors.surfaceGold,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  buyButtonDisabled: { opacity: 0.45 },
  buyText: { color: HomeColors.goldStrong },
  placedObject: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: HomeColors.surfaceMuted,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  rackVisual: {
    width: 58,
    height: 42,
    position: 'relative',
  },
  rackPost: {
    position: 'absolute',
    left: 8,
    top: 3,
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: HomeColors.textSecondary,
  },
  rackPostRight: { left: 46 },
  rackShelf: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.textSecondary,
  },
  dumbbell: {
    position: 'absolute',
    top: 16,
    width: 17,
    height: 8,
    borderRadius: 4,
    backgroundColor: HomeColors.goldStrong,
  },
  dumbbellLeft: { left: 13 },
  dumbbellRight: { right: 13 },
  objectCopy: { flex: 1, gap: 1 },
  objectName: { color: HomeColors.text },
});
