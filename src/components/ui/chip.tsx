import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  /** 처리 중처럼 잠시 누를 수 없는 상태 (중복 전송 방지) */
  disabled?: boolean;
  onPress: () => void;
}

/** 선택 상태는 Gold 테두리로만 표시한다 — 배경을 통째로 gold로 칠하지 않는다. */
export function Chip({ label, selected, disabled, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={4} disabled={disabled} style={disabled && styles.disabled}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.chip, selected && { borderWidth: 1.5, borderColor: theme.gold }]}>
        <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'} style={selected && { color: theme.gold }}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * 높이는 터치 하한선(44)에 맞춘다. 예전에는 글자 높이 + padding으로 36~38px이라,
   * 운동 중에 한 손으로 부위/휴식 프리셋을 고르다 자꾸 빗나갔다. 칩은 히스토리 기간,
   * 부위 선택, 휴식 프리셋, 목표, 빠른 질문까지 앱 전체에서 쓰이므로 여기서 한 번만 고친다.
   */
  chip: {
    minHeight: Layout.compactRowHeight,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
});
