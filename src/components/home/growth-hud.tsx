import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface GrowthHudProps {
  passLevel: number;
  passXpIntoLevel: number;
  passXpForLevel: number;
  passProgress: number;
  onPress?: () => void;
}

/**
 * 홈 상단의 얇은 성장 스트립. 캐릭터 옆에 세로로 쌓던 HUD를 가로 1줄로 눕혔다 —
 * 세로 공간을 캐릭터에 돌려주기 위해서다.
 *
 * 여기 있는 진행도는 HELL PASS 하나뿐이다. 체중/체지방 같은 "실제 몸" 수치는
 * 여기 섞지 않는다 (REAL BODY != GAME PROGRESSION). 몸 변화는 HISTORY의 BODY GROWTH에서 본다.
 */
export function GrowthHud({
  passLevel,
  passXpIntoLevel,
  passXpForLevel,
  passProgress,
  onPress,
}: GrowthHudProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}
      accessibilityRole="button"
      accessibilityLabel={`HELL PASS 레벨 ${passLevel}`}>
      <ThemedText type="captionBold" style={{ color: theme.gold }}>
        HELL PASS
      </ThemedText>
      <ThemedText type="smallBold">Lv.{passLevel}</ThemedText>
      <View style={styles.bar}>
        <ProgressBar
          progress={passProgress}
          height={6}
          color={theme.gold}
          trackColor={theme.backgroundSelected}
        />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {passXpIntoLevel}/{passXpForLevel}
      </ThemedText>
      <ThemedText type="captionBold" style={{ color: theme.gold }}>
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    minHeight: Layout.compactRowHeight - 8,
  },
  bar: {
    flex: 1,
  },
});
