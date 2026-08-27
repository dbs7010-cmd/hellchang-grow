import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  /** 한 글자 이모지. 없으면 문구만 보여준다. */
  icon?: string;
  /** 지금 왜 비어 있는지 한 줄. 사과하거나 죄책감을 주지 않는다. */
  line: string;
  /** 채우는 방법 한 줄 (선택). */
  hint?: string;
  /** 여기서 바로 할 수 있는 일 (InlineAction 등, 선택). */
  action?: ReactNode;
}

/**
 * 아직 아무것도 없는 블록.
 *
 * 예전에는 빈 상태가 그냥 회색 문장 한 줄이었다. 화면에 아무 형태가 없으니
 * "아직 없음"이 아니라 "덜 만들어짐"으로 읽혔다 — 신규 사용자가 앱을 처음 열었을 때
 * 운동 탭과 히스토리가 정확히 그렇게 보였다.
 *
 * 점선 테두리는 "여기에 들어올 것이 있다"는 뜻이고, 채워진 카드(실제 데이터)와
 * 한눈에 구분된다. 없는 값을 지어내서 채우지 않는다.
 */
export function EmptyState({ icon, line, hint, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      {icon && <ThemedText style={styles.icon}>{icon}</ThemedText>}
      <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
        {line}
      </ThemedText>
      {hint && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.line}>
          {hint}
        </ThemedText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: {
    fontSize: 24,
    opacity: 0.55,
  },
  line: {
    textAlign: 'center',
  },
});
