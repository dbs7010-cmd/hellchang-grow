import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { SessionExerciseNavigationItem } from '@/utils/session-navigation';
import { formatExerciseNavigationProgress } from '@/utils/session-navigation';

interface SessionExerciseSelectorProps {
  items: SessionExerciseNavigationItem[];
  disabled?: boolean;
  compact?: boolean;
  onSelect: (exerciseEntryId: string) => void;
}

/**
 * Shared ACTIVE/REST exercise navigation.
 *
 * Routine order is deliberately absent: every exercise is a peer and can be
 * selected at any time. Progress describes work actually completed for that
 * exercise, never a mandatory position such as "2/5". `compact` only changes
 * density for REST; selection semantics stay identical in both states.
 */
export function SessionExerciseSelector({
  items,
  disabled = false,
  compact = false,
  onSelect,
}: SessionExerciseSelectorProps) {
  if (items.length <= 1) return null;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.headingRow}>
        <ThemedText type="captionBold">운동 선택</ThemedText>
        {!compact && (
          <ThemedText type="caption" themeColor="textSecondary">
            순서 상관없이 바로 바꿀 수 있어요
          </ThemedText>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: item.selected, disabled }}
            accessibilityLabel={`${item.exerciseName}, ${formatExerciseNavigationProgress(item)}${item.complete ? ', 목표 완료' : ''}`}
            disabled={disabled}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.item,
              compact && styles.itemCompact,
              item.selected && styles.itemSelected,
              item.complete && styles.itemComplete,
              disabled && styles.itemDisabled,
              pressed && !disabled && styles.itemPressed,
            ]}>
            <ThemedText type="captionBold" numberOfLines={1} style={styles.name}>
              {item.exerciseName}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatExerciseNavigationProgress(item)}{item.complete ? ' · 완료' : ''}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  containerCompact: {
    gap: 4,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.one,
    paddingRight: Spacing.two,
  },
  item: {
    minWidth: 132,
    maxWidth: 180,
    minHeight: 54,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.28)',
  },
  itemCompact: {
    minWidth: 116,
    minHeight: 48,
    paddingVertical: 4,
  },
  itemSelected: {
    borderWidth: 2,
  },
  itemComplete: {
    opacity: 0.82,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  itemPressed: {
    opacity: 0.72,
  },
  name: {
    maxWidth: 156,
  },
});
