import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PassProgressProps {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  progress: number;
  size?: 'compact' | 'detailed';
}

/**
 * HELL PASS 진행도 표시. 캐릭터 별도 레벨 시스템이 아니라 HELL PASS 하나만 쓴다 —
 * 이 컴포넌트가 홈 HUD와 HELL PASS 상세 화면에서 동일한 진행도 소스를 공유한다.
 */
export function PassProgress({ level, xpIntoLevel, xpForLevel, progress, size = 'compact' }: PassProgressProps) {
  const theme = useTheme();
  const detailed = size === 'detailed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type={detailed ? 'smallBold' : 'small'} style={{ color: theme.gold }}>
          HELL PASS
        </ThemedText>
        <ThemedText type={detailed ? 'subtitle' : 'small'}>Lv.{level}</ThemedText>
      </View>
      <ProgressBar
        progress={progress}
        height={detailed ? 12 : 6}
        color={theme.gold}
        trackColor={theme.backgroundSelected}
      />
      <ThemedText type="small" themeColor="textSecondary" style={detailed && styles.xpDetailed}>
        {xpIntoLevel} / {xpForLevel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  xpDetailed: {
    fontSize: 14,
  },
});
