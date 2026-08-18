import { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenScrollProps {
  children: ReactNode;
  /** 섹션 사이 간격. 기본 Layout.sectionGap */
  gap?: number;
}

/** 탭 화면(운동 허브 / 히스토리 / 트레이너 / 설정) 공통 스크롤 셸. */
export function ScreenScroll({ children, gap = Layout.sectionGap }: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      contentInset={{ top: insets.top }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <ThemedView
        style={[
          styles.container,
          {
            gap,
            paddingTop: insets.top + Spacing.two,
            paddingBottom: BottomTabInset + insets.bottom + Spacing.four,
          },
        ]}>
        {children}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Layout.screenPaddingX,
  },
});
