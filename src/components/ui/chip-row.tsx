import { ReactNode } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Layout, Spacing } from '@/constants/theme';

export interface ChipRowProps {
  children: ReactNode;
  /** true면 줄바꿈되는 wrap 배치 (요일 선택처럼 개수가 적고 고정된 경우) */
  wrap?: boolean;
  /**
   * 화면 좌우 padding을 뚫고 가로로 흐르게 한다 — 스크롤 가능하다는 게 눈에 보이도록
   * 마지막 chip이 가장자리에서 잘려 보이게 하는 용도.
   */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 필터 chip은 두 줄로 wrapping되면 화면 세로를 잡아먹고 "선택된 게 어디 있는지" 찾기 어려워진다.
 * 기본은 가로 1줄 스크롤이다 (CANON 5).
 */
export function ChipRow({ children, wrap, bleed, style }: ChipRowProps) {
  if (wrap) {
    return <View style={[styles.wrap, style]}>{children}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, bleed && styles.bleed, style]}
      contentContainerStyle={[styles.scrollContent, bleed && styles.bleedContent]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  scroll: {
    flexGrow: 0,
  },
  bleed: {
    marginHorizontal: -Layout.screenPaddingX,
  },
  scrollContent: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingRight: Spacing.two,
  },
  bleedContent: {
    paddingHorizontal: Layout.screenPaddingX,
  },
});
