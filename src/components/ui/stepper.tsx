import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Stepper({ label, value, onChange, min = 0, max = 100, step = 5 }: StepperProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="small">{label}</ThemedText>
      <View style={styles.controls}>
        <Pressable onPress={() => onChange(Math.max(min, value - step))}>
          <ThemedView type="backgroundSelected" style={styles.controlButton}>
            <ThemedText type="smallBold">-</ThemedText>
          </ThemedView>
        </Pressable>
        <ThemedText type="smallBold" style={styles.value}>
          {value}
        </ThemedText>
        <Pressable onPress={() => onChange(Math.min(max, value + step))}>
          <ThemedView type="backgroundSelected" style={styles.controlButton}>
            <ThemedText type="smallBold">+</ThemedText>
          </ThemedView>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 32,
    textAlign: 'center',
  },
});
