import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface GrowthHudProps {
  passLevel: number;
  passXpIntoLevel: number;
  passXpForLevel: number;
  passProgress: number;
  onPress?: () => void;
}

/**
 * 홈 하단의 얇은 HELL PASS 줄.
 *
 * HELL PASS는 진행 정보이지 홈의 주인공이 아니다 — 채워진 pill 카드로 상단에 두면
 * 캐릭터/운동 시작과 시선을 다툰다. 그래서 배경 없이, 라벨은 secondary로 두고
 * Gold는 "진행"을 뜻하는 progress bar에만 남긴다.
 *
 * 여기 있는 진행도는 HELL PASS 하나뿐이다. 체중/체지방 같은 실제 몸 수치는 섞지 않는다
 * (REAL BODY != GAME PROGRESSION). 몸 변화는 히스토리의 [몸 변화]에서 본다.
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
      style={styles.container}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`HELL PASS 레벨 ${passLevel}, 성장 리포트 열기`}>
      <ThemedText type="caption" themeColor="textSecondary">
        HELL PASS
      </ThemedText>
      <ThemedText type="captionBold">Lv.{passLevel}</ThemedText>
      <View style={styles.bar}>
        <ProgressBar
          progress={passProgress}
          height={4}
          color={theme.gold}
          trackColor={theme.backgroundSelected}
        />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {passXpIntoLevel}/{passXpForLevel}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
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
  },
  bar: {
    flex: 1,
  },
});
