import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface MetricTileProps {
  label: string;
  value: string;
  /** 값 아래 한 줄 (예: "이전 70kg") */
  note?: string;
  /** 이 블록에서 가장 중요한 수치 — Gold로 강조한다. 한 화면에 남발하지 않는다. */
  accent?: boolean;
  /** 주어지면 순서대로 fade+rise로 나타난다 (운동 결과 화면 연출). */
  index?: number;
}

const STAGGER_STEP_MS = 80;

/**
 * 라벨 + 큰 숫자 하나. 세로로 길게 나열되던 "라벨 ...... 값" 목록을 대체한다 —
 * 2열 그리드로 묶으면 같은 정보가 절반 높이에 들어간다 (CANON 10/11 compact metric layout).
 */
export function MetricTile({ label, value, note, accent, index }: MetricTileProps) {
  const theme = useTheme();
  const animated = index !== undefined;
  const opacity = useSharedValue(animated ? 0 : 1);
  const translateY = useSharedValue(animated ? 8 : 0);

  useEffect(() => {
    if (!animated) return;
    const delay = (index ?? 0) * STAGGER_STEP_MS;
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 220 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.tile,
        // PR처럼 실제로 달성한 것만 칠한다. 금색 테두리+금색 숫자는 옆 칸과 같은 무게로 읽혀서,
        // 오늘 세운 기록이 "총 세트"와 구분되지 않았다.
        accent ? { backgroundColor: theme.gold } : { backgroundColor: theme.backgroundElement },
        animatedStyle,
      ]}>
      <ThemedText
        type="caption"
        themeColor={accent ? undefined : 'textSecondary'}
        style={accent ? { color: theme.background, opacity: 0.75 } : undefined}
        numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        type="metric"
        style={accent ? { color: theme.background } : undefined}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </ThemedText>
      {note && (
        <ThemedText
          type="caption"
          themeColor={accent ? undefined : 'textSecondary'}
          style={accent ? { color: theme.background, opacity: 0.75 } : undefined}
          numberOfLines={1}>
          {note}
        </ThemedText>
      )}
    </Animated.View>
  );
}

/** MetricTile 2열 그리드. */
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 1,
  },
});
