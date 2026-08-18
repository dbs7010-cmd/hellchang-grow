import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GymTheme, Spacing } from '@/constants/theme';

export interface GrowthHudProps {
  passLevel: number;
  passXpIntoLevel: number;
  passXpForLevel: number;
  passProgress: number;
  weightKg?: number;
  bodyFatPercent?: number;
  workoutCount: number;
}

/**
 * 캐릭터 왼쪽의 얇은 성장 HUD. 카드로 쌓지 않고 텍스트 라인 + 얇은 바 정도로만 구성한다.
 * 표시 항목은 실제 저장된 데이터가 있는 것만 보여준다 (없는 지표를 지어내지 않는다).
 */
export function GrowthHud({
  passLevel,
  passXpIntoLevel,
  passXpForLevel,
  passProgress,
  weightKg,
  bodyFatPercent,
  workoutCount,
}: GrowthHudProps) {
  return (
    <View style={styles.container}>
      <View style={styles.passBlock}>
        <View style={styles.passHeader}>
          <ThemedText type="smallBold" style={styles.passLabel}>
            HELL PASS
          </ThemedText>
          <ThemedText type="small" style={styles.passLevel}>
            Lv.{passLevel}
          </ThemedText>
        </View>
        <ProgressBar progress={passProgress} height={6} color={GymTheme.gold} trackColor={GymTheme.surfaceElevated} />
        <ThemedText type="small" style={styles.passXp}>
          {passXpIntoLevel} / {passXpForLevel}
        </ThemedText>
      </View>

      <View style={styles.statList}>
        {weightKg !== undefined && (
          <View style={styles.statRow}>
            <ThemedText type="small" style={styles.statLabel}>
              체중
            </ThemedText>
            <ThemedText type="smallBold" style={styles.statValue}>
              {weightKg}kg
            </ThemedText>
          </View>
        )}
        {bodyFatPercent !== undefined && (
          <View style={styles.statRow}>
            <ThemedText type="small" style={styles.statLabel}>
              체지방률
            </ThemedText>
            <ThemedText type="smallBold" style={styles.statValue}>
              {bodyFatPercent}%
            </ThemedText>
          </View>
        )}
        <View style={styles.statRow}>
          <ThemedText type="small" style={styles.statLabel}>
            운동 기록
          </ThemedText>
          <ThemedText type="smallBold" style={styles.statValue}>
            {workoutCount}회
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    maxWidth: 150,
  },
  passBlock: {
    gap: Spacing.half,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  passLabel: {
    color: GymTheme.gold,
    fontSize: 12,
  },
  passLevel: {
    color: GymTheme.text,
  },
  passXp: {
    color: GymTheme.textSecondary,
    fontSize: 11,
  },
  statList: {
    gap: Spacing.one,
  },
  statRow: {
    gap: 0,
  },
  statLabel: {
    color: GymTheme.textSecondary,
    fontSize: 11,
  },
  statValue: {
    color: GymTheme.text,
  },
});
