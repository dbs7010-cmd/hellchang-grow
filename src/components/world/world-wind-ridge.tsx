import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface WorldWindRidgeProps {
  state: 'blocked' | 'cleared';
}

export const WorldWindRidgeHeight = 164;

/**
 * 네 번째 구간의 강풍 능선. blocked에서는 바람이 길 전체를 밀어내고, cleared에서는
 * 낮게 버티며 지나갈 수 있는 중앙 통로와 도착 표식이 드러난다. 판정/진행도는 갖지 않는다.
 */
export function WorldWindRidge({ state }: WorldWindRidgeProps) {
  const theme = useTheme();
  const cleared = state === 'cleared';

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.scene}>
      <View style={[styles.ridge, { backgroundColor: theme.backgroundDeep, borderColor: theme.border }]} />
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.gust,
            {
              backgroundColor: cleared ? theme.gold : theme.textSecondary,
              top: 24 + index * 34,
              width: cleared ? 58 : 174 - index * 18,
              left: cleared ? (index % 2 === 0 ? 8 : 146) : 20 + index * 12,
            },
          ]}>
          <View
            style={[
              styles.gustTip,
              {
                borderLeftColor: cleared ? theme.gold : theme.textSecondary,
              },
            ]}
          />
        </View>
      ))}
      <View
        style={[
          styles.marker,
          {
            backgroundColor: cleared ? theme.gold : theme.border,
            transform: [{ rotate: cleared ? '0deg' : '18deg' }],
          },
        ]}
      />
      <View style={[styles.flag, { backgroundColor: cleared ? theme.goldBright : theme.backgroundElement }]} />
      <ThemedText style={[styles.glyph, { color: cleared ? theme.gold : theme.textSecondary }]}>
        {cleared ? '✓' : '≋'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: 220,
    height: WorldWindRidgeHeight,
  },
  ridge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 54,
    borderWidth: 2,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  gust: {
    position: 'absolute',
    height: 4,
    borderRadius: Radius.pill,
  },
  gustTip: {
    position: 'absolute',
    right: -10,
    top: -5,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  marker: {
    position: 'absolute',
    right: 28,
    bottom: 34,
    width: 5,
    height: 78,
    borderRadius: Radius.pill,
    transformOrigin: 'bottom',
  },
  flag: {
    position: 'absolute',
    right: 0,
    bottom: 82,
    width: 34,
    height: 22,
    borderTopRightRadius: Radius.medium,
    borderBottomRightRadius: Radius.medium,
  },
  glyph: {
    position: 'absolute',
    left: 4,
    bottom: 8,
    fontSize: 28,
  },
});
