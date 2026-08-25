import { Pressable, StyleSheet, View } from 'react-native';

import { HomeGymRewardStrip } from '@/components/home/home-gym-reward-strip';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { HomeColors, Spacing } from '@/constants/theme';

export interface GrowthHudProps {
  passLevel: number;
  passXpIntoLevel: number;
  passXpForLevel: number;
  passProgress: number;
  onPress?: () => void;
}

/**
 * 홈의 게임 진행 HUD. HELL PASS는 기존 진행축을 그대로 유지한다.
 * 홈짐 보상은 별도 strip이 저장된 실제 WorkoutRecord를 읽어 계산하므로
 * HOME CANON과 Workout/Growth 코어의 계약을 바꾸지 않는다.
 */
export function GrowthHud({
  passLevel,
  passXpIntoLevel,
  passXpForLevel,
  passProgress,
  onPress,
}: GrowthHudProps) {
  return (
    <View>
      <Pressable
        onPress={onPress}
        style={styles.container}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`HELL PASS 레벨 ${passLevel}, 성장 리포트 열기`}>
        <ThemedText type="caption" style={styles.label}>
          HELL PASS
        </ThemedText>
        <ThemedText type="captionBold" style={styles.level}>Lv.{passLevel}</ThemedText>
        <View style={styles.bar}>
          <ProgressBar
            progress={passProgress}
            height={5}
            color={HomeColors.goldStrong}
            trackColor={HomeColors.surfaceGold}
          />
        </View>
        <ThemedText type="captionBold" style={styles.xpValue}>
          {passXpIntoLevel}/{passXpForLevel}
        </ThemedText>
        <ThemedText type="caption" style={styles.arrow}>
          ›
        </ThemedText>
      </Pressable>
      <HomeGymRewardStrip />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bar: {
    flex: 1,
  },
  label: { color: HomeColors.textSecondary },
  level: { color: HomeColors.goldStrong, fontWeight: 800 },
  xpValue: { color: HomeColors.goldStrong, fontVariant: ['tabular-nums'] },
  arrow: { color: HomeColors.textSecondary },
});
