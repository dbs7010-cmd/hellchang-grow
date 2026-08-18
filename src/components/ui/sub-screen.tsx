import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

export interface SubScreenProps {
  title: string;
  accent?: boolean;
  right?: ReactNode;
  /**
   * false면 본문이 스크롤되지 않는 고정 레이아웃이 된다 (HELL PASS처럼 항상 한 화면에
   * 들어가야 하는 화면). 기본값 true — 목록/상세/편집 화면은 반드시 스크롤돼야 한다.
   */
  scroll?: boolean;
  /** 스크롤 영역 밖에 고정되는 하단 CTA (예: [루틴 저장]) */
  footer?: ReactNode;
  contentGap?: number;
  children: ReactNode;
}

/**
 * 탭이 아닌 스택 화면 공통 셸: safe-area + 공통 헤더 + 스크롤 본문 + (선택) 고정 footer.
 *
 * 이전에는 exercise-select / exercise-detail / routine-edit이 본문을 그냥 <View>에 쌓아서,
 * 내용이 화면보다 길어지면 아래쪽이 잘린 채 접근할 방법이 아예 없었다 (운동 45개 중 화면에
 * 들어가는 몇 개만 볼 수 있었다). 여기서 한 번에 스크롤을 보장한다.
 */
export function SubScreen({
  title,
  accent,
  right,
  scroll = true,
  footer,
  contentGap = Layout.sectionGap,
  children,
}: SubScreenProps) {
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { gap: contentGap, paddingBottom: (footer ? Spacing.three : Spacing.six) + insets.bottom },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { gap: contentGap }]}>{children}</View>
  );

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.two }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <View style={styles.inner}>
          <ScreenHeader title={title} accent={accent} right={right} />
          {body}
          {footer && (
            <View style={[styles.footer, { paddingBottom: Spacing.three + insets.bottom }]}>{footer}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenPaddingX,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    paddingTop: Spacing.two,
  },
});
