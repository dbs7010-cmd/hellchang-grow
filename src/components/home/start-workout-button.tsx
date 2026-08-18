import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GymTheme, Spacing } from '@/constants/theme';

export interface StartWorkoutButtonProps {
  label: string;
  subLabel: string;
  onPress: () => void;
}

/** 홈의 primary CTA. 캐릭터 하단 중앙, 골드 아웃라인 + 다크 필. */
export function StartWorkoutButton({ label, subLabel, onPress }: StartWorkoutButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
      <View style={styles.button}>
        <ThemedText type="subtitle" style={styles.label}>
          {label}
        </ThemedText>
        <ThemedText type="small" style={styles.subLabel}>
          {subLabel}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
  button: {
    borderRadius: Spacing.four,
    borderWidth: 2,
    borderColor: GymTheme.gold,
    backgroundColor: GymTheme.surface,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
    shadowColor: GymTheme.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  label: {
    color: GymTheme.gold,
    fontSize: 26,
    lineHeight: 32,
  },
  subLabel: {
    color: GymTheme.textSecondary,
  },
});
