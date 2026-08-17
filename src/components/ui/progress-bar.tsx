import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ProgressBarProps {
  /** 0~1 */
  progress: number;
  height?: number;
}

export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { height, backgroundColor: theme.backgroundElement }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, height, backgroundColor: theme.blueAccent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: Spacing.one,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Spacing.one,
  },
});
