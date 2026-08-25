import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { HomeColors, Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { buildGymBattleProgress } from '@/utils/gym-battle';

export default function GymBattleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workoutRecords, activeSession } = useAppData();
  const battles = useMemo(() => buildGymBattleProgress(workoutRecords), [workoutRecords]);
  const sessionInProgress = Boolean(activeSession && activeSession.status !== 'completed');

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ThemedText type="smallBold">‹ 홈</ThemedText>
        </Pressable>
        <ThemedText type="heading">GYM BATTLE</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.heroCopy}>
          <ThemedText type="smallBold">운동한 만큼 공격한다</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            별도 조작은 없어요. 실제 세트를 끝내면 해당 운동의 몬스터 HP가 깎입니다.
          </ThemedText>
        </View>

        {battles.map((battle) => {
          const hpRatio = battle.enemy.hp > 0 ? battle.remainingHp / battle.enemy.hp : 0;
          return (
            <View key={battle.enemy.id} style={styles.enemyCard}>
              <View style={styles.enemyTopRow}>
                <View style={styles.enemyIdentity}>
                  <ThemedText type="heading">{battle.enemy.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {battle.enemy.attackName}로 공격
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: battle.defeated ? HomeColors.gold : HomeColors.text }}>
                  {battle.defeated ? '격파 ✓' : `HP ${battle.remainingHp}/${battle.enemy.hp}`}
                </ThemedText>
              </View>

              <View style={styles.hpTrack}>
                <View style={[styles.hpFill, { width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }]} />
              </View>

              {battle.attacks > 0 ? (
                <View style={styles.battleLog}>
                  <ThemedText type="captionBold">누적 피해 {battle.damage} · 공격 {battle.attacks}회</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    최근 {battle.latestExerciseName} → {battle.latestDamage} DAMAGE
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="caption" themeColor="textSecondary">
                  아직 공격 기록이 없어요. {battle.enemy.attackName} 세트를 완료하면 전투가 시작됩니다.
                </ThemedText>
              )}
            </View>
          );
        })}

        <PrimaryButton
          label={sessionInProgress ? '운동으로 돌아가기' : '운동해서 공격하기'}
          subLabel="실제 운동 기록이 전투력이 됩니다"
          variant="homeGold"
          size="large"
          onPress={() => router.push(sessionInProgress ? '/session' : '/workout-start')}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HomeColors.background },
  header: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: 32 },
  content: { paddingHorizontal: Layout.screenPaddingX, gap: Spacing.three },
  heroCopy: { gap: Spacing.one, paddingVertical: Spacing.two },
  enemyCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
    backgroundColor: HomeColors.surfaceMuted,
  },
  enemyTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  enemyIdentity: { flex: 1, gap: 2 },
  hpTrack: { height: 12, borderRadius: Radius.pill, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.10)' },
  hpFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: HomeColors.danger },
  battleLog: { gap: 2 },
});
