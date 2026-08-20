import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
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
  chip: {
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
