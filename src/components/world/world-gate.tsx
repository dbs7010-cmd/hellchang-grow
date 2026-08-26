import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface WorldGateProps {
  state: 'closed' | 'open';
}

export const WorldGateWidth = 138;
export const WorldGateHeight = 176;

/**
 * 첫 구간의 문.
 *
 * 상태표("● 막힌 문") 대신 **눈으로 보이는 상황**을 만든다. 닫힌 문은 잠긴 판 하나,
 * 열린 문은 양쪽으로 젖혀진 문짝과 그 사이로 새어 나오는 빛이다. 두 상태를 서로 다른
 * 형태로 그리는 이유는 같은 요소를 변형하는 것보다 플랫폼 간 결과가 예측 가능하기
 * 때문이다 — 첫 구간에 애니메이션 프레임워크를 들이지 않는다.
 *
 * 이 문은 장식이다. 판정도, 진행도도 여기서 나오지 않는다 — 실제 학습 기록에서 계산된
 * scene 상태를 받아 그리기만 한다. 주인공은 언제나 앞에 서 있는 단백이다.
 */
export function WorldGate({ state }: WorldGateProps) {
  const theme = useTheme();
  const open = state === 'open';

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        {
          borderColor: open ? theme.gold : theme.border,
          backgroundColor: open ? theme.goldBright : theme.backgroundDeep,
        },
      ]}>
      {open ? (
        <>
          <View style={[styles.leaf, styles.leafLeft, { backgroundColor: theme.backgroundElement, borderColor: theme.gold }]} />
          <View style={[styles.leaf, styles.leafRight, { backgroundColor: theme.backgroundElement, borderColor: theme.gold }]} />
        </>
      ) : (
        <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.seam, { backgroundColor: theme.border }]} />
          <View style={[styles.lock, { backgroundColor: theme.backgroundDeep, borderColor: theme.border }]}>
            <ThemedText style={styles.lockGlyph}>🔒</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: WorldGateWidth,
    height: WorldGateHeight,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderTopLeftRadius: WorldGateWidth / 2,
    borderTopRightRadius: WorldGateWidth / 2,
    overflow: 'hidden',
  },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  lock: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: {
    fontSize: 20,
  },
  /** 열린 뒤 벽쪽으로 젖혀진 문짝. 사이로 프레임 배경(빛)이 보인다. */
  leaf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 26,
    borderWidth: 1,
  },
  leafLeft: {
    left: 0,
    borderTopLeftRadius: WorldGateWidth / 2,
  },
  leafRight: {
    right: 0,
    borderTopRightRadius: WorldGateWidth / 2,
  },
});
