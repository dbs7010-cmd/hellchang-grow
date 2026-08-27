import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface WorldCliffProps {
  state: 'blocked' | 'cleared';
}

export const WorldCliffHeight = 176;

/**
 * 두 번째 구간의 절벽. 진행도를 저장하거나 판정하지 않고 현재 scene을 눈에 보이게만 한다.
 * 막혔을 때는 손이 닿지 않는 바위턱, 통과 뒤에는 위까지 이어진 밧줄과 발판을 보여 준다.
 */
export function WorldCliff({ state }: WorldCliffProps) {
  const theme = useTheme();
  const cleared = state === 'cleared';

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.scene}>
      <View style={[styles.cliff, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={[styles.ledge, { backgroundColor: theme.gold }]} />
        <View style={[styles.crack, styles.crackOne, { backgroundColor: theme.border }]} />
        <View style={[styles.crack, styles.crackTwo, { backgroundColor: theme.border }]} />
      </View>
      <View
        style={[
          styles.rope,
          { backgroundColor: cleared ? theme.gold : theme.textSecondary },
          !cleared && styles.ropeOutOfReach,
        ]}
      />
      {cleared ? (
        <>
          <View style={[styles.grip, styles.gripTop, { backgroundColor: theme.gold }]} />
          <View style={[styles.grip, styles.gripBottom, { backgroundColor: theme.gold }]} />
          <ThemedText style={styles.stateGlyph}>✓</ThemedText>
        </>
      ) : (
        <ThemedText style={styles.stateGlyph}>↟</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: 148,
    height: WorldCliffHeight,
  },
  cliff: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 94,
    height: WorldCliffHeight,
    borderWidth: 2,
    borderTopLeftRadius: Radius.large,
    overflow: 'hidden',
  },
  ledge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  crack: {
    position: 'absolute',
    width: 34,
    height: 2,
    transform: [{ rotate: '-28deg' }],
  },
  crackOne: { top: 58, right: 16 },
  crackTwo: { top: 112, left: 14 },
  rope: {
    position: 'absolute',
    top: 8,
    left: 52,
    width: 4,
    height: 146,
    borderRadius: Radius.pill,
    transform: [{ rotate: '5deg' }],
  },
  ropeOutOfReach: {
    top: 8,
    height: 72,
  },
  grip: {
    position: 'absolute',
    left: 43,
    width: 24,
    height: 4,
    borderRadius: Radius.pill,
  },
  gripTop: { top: 58 },
  gripBottom: { top: 108 },
  stateGlyph: {
    position: 'absolute',
    left: 4,
    bottom: 8,
    fontSize: 28,
  },
});
