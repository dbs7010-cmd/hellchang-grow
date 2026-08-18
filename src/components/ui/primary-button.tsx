import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PrimaryButtonVariant = 'primary' | 'secondary' | 'gold';
export type PrimaryButtonSize = 'default' | 'large';
export type PrimaryButtonHaptic = 'light' | 'medium' | 'success' | 'none';

export interface PrimaryButtonProps {
  label: string;
  /** 골드 CTA 등에서 쓰는 보조 한 줄 (예: "오늘도 한계를 돌파해보세요!") */
  subLabel?: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  size?: PrimaryButtonSize;
  disabled?: boolean;
  /** 기본값: gold='medium', primary='light', secondary='none' */
  haptic?: PrimaryButtonHaptic;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_HAPTIC: Record<PrimaryButtonVariant, PrimaryButtonHaptic> = {
  gold: 'medium',
  primary: 'light',
  secondary: 'none',
};

function triggerHaptic(kind: PrimaryButtonHaptic) {
  if (kind === 'none' || Platform.OS === 'web') return;
  if (kind === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});
  }
}

/** 앱 전역에서 재사용하는 유일한 버튼. 화면마다 독자적인 버튼 스타일을 만들지 않는다. */
export function PrimaryButton({
  label,
  subLabel,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled,
  haptic,
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (disabled) return;
    triggerHaptic(haptic ?? DEFAULT_HAPTIC[variant]);
    onPress();
  };

  const isGold = variant === 'gold';

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        // Reanimated shared value 뮤테이션은 JS 스레드 이벤트 핸들러에서 직접 하는 게
        // 공식적으로 안전한 패턴이다(Reanimated 문서의 버튼 예제와 동일). React Compiler가
        // useSharedValue를 useRef처럼 인식하지 못해 생기는 false positive만 억제한다.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(Motion.pressScale, { duration: Motion.reactiveMs });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: Motion.reactiveMs });
      }}
      disabled={disabled}
      style={[style, disabled && styles.disabled]}>
      <Animated.View style={animatedStyle}>
        <ThemedView
          type={variant === 'secondary' ? 'backgroundElement' : isGold ? 'backgroundElement' : 'backgroundSelected'}
          style={[
            styles.button,
            size === 'large' && styles.buttonLarge,
            isGold && { borderWidth: 2, borderColor: theme.gold },
          ]}>
          <ThemedText
            type={size === 'large' ? 'subtitle' : 'smallBold'}
            style={isGold ? { color: theme.gold } : undefined}>
            {label}
          </ThemedText>
          {subLabel && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.subLabel}>
              {subLabel}
            </ThemedText>
          )}
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonLarge: {
    minHeight: 108,
    borderRadius: Radius.large,
  },
  subLabel: {
    marginTop: Spacing.half,
  },
  disabled: {
    opacity: 0.4,
  },
});
