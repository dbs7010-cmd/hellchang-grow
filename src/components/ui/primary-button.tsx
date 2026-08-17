import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type PrimaryButtonVariant = 'primary' | 'secondary';
export type PrimaryButtonSize = 'default' | 'large';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  size?: PrimaryButtonSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedView
        type={variant === 'primary' ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.button, size === 'large' && styles.buttonLarge]}>
        <ThemedText type={size === 'large' ? 'subtitle' : 'smallBold'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonLarge: {
    minHeight: 108,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
