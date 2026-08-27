import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface WorldStonePathProps {
  state: 'blocked' | 'cleared';
}

export const WorldStonePathHeight = 142;

/**
 * 세 번째 구간의 흔들리는 돌길. 판정은 learning evidence가 하고, 이 컴포넌트는
 * 휘어진 발판이 몸을 낮춰 중심을 잡은 뒤 안정된 길로 바뀌는 payoff만 그린다.
 */
export function WorldStonePath({ state }: WorldStonePathProps) {
  const theme = useTheme();
  const cleared = state === 'cleared';
  const rotations = cleared
    ? ['0deg', '0deg', '0deg', '0deg']
    : ['-13deg', '11deg', '-9deg', '14deg'];

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.scene}>
      <View style={[styles.drop, { backgroundColor: theme.backgroundDeep }]} />
      <View style={styles.stones}>
        {rotations.map((rotation, index) => (
          <View
            key={`${rotation}-${index}`}
            style={[
              styles.stone,
              {
                backgroundColor: cleared ? theme.goldBright : theme.backgroundElement,
                borderColor: cleared ? theme.gold : theme.border,
                transform: [{ rotate: rotation }],
              },
              index % 2 === 0 ? styles.stoneHigh : styles.stoneLow,
            ]}
          />
        ))}
      </View>
      <ThemedText style={[styles.glyph, { color: cleared ? theme.gold : theme.textSecondary }]}>
        {cleared ? '✓' : '↝'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: 204,
    height: WorldStonePathHeight,
    justifyContent: 'flex-end',
  },
  drop: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 0,
    height: 70,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  stones: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stone: {
    width: 42,
    height: 20,
    borderWidth: 2,
    borderRadius: Radius.medium,
  },
  stoneHigh: { marginBottom: 34 },
  stoneLow: { marginBottom: 16 },
  glyph: {
    position: 'absolute',
    right: 8,
    top: 0,
    fontSize: 28,
  },
});
