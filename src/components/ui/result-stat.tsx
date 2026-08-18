import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface ResultStatProps {
  label: string;
  value: string;
  /** WORKOUT RESULT 화면에서 순서대로 나타나도록 하는 stagger 인덱스 */
  index: number;
  emphasize?: boolean;
}

const STAGGER_STEP_MS = 100;

/** 운동 종료 결과 화면 전용. 항목이 순서대로 fade+rise 되며 나타난다. */
export function ResultStat({ label, value, index, emphasize }: ResultStatProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = index * STAGGER_STEP_MS;
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 220 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type={emphasize ? 'subtitle' : 'smallBold'}>{value}</ThemedText>
    </Animated.View>
  );
}

export function ResultStatList({ children }: { children: React.ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
