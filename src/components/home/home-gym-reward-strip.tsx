import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HomeColors, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import {
  availableHomeGymCoins,
  buyStarterRack,
  getHomeGymState,
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
  const ownsRack = state?.ownedItemIds.includes('starter-dumbbell-rack') ?? false;

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
      <View style={styles.copy}>
        <ThemedText type="captionBold" style={styles.title}>
          🪙 홈짐 {coins}
        </ThemedText>
        <ThemedText type="caption" style={styles.subtitle}>
          {ownsRack ? '🏋️ 덤벨 랙 · 내 홈짐에 배치됨' : '운동 1회 = 홈짐 코인 10'}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: HomeColors.border,
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
});
