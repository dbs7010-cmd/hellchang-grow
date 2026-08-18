import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BarChartItem {
  label: string;
  value: number;
}

export interface BarChartProps {
  items: BarChartItem[];
  height?: number;
}

/** SVG/차트 라이브러리 없이 순수 View만으로 그리는 막대그래프. */
export function BarChart({ items, height = 90 }: BarChartProps) {
  const theme = useTheme();
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <View style={[styles.row, { height: height + 24 }]}>
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.column}>
          <View style={[styles.track, { height, backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(2, (item.value / max) * height),
                  backgroundColor: theme.gold,
                },
              ]}
            />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {item.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  track: {
    width: '100%',
    borderRadius: Radius.small,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: Radius.small,
  },
});
