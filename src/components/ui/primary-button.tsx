import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HomeColors, Layout, Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 행동의 무게. **채워진 것이 누를 것이다** — 화면에서 가장 중요한 행동 하나만 gold로 채우고,
 * 나머지는 물러난다. 예전에는 gold가 카드와 같은 배경(backgroundElement)에 금색 글자만
 * 얹은 형태라, [세트 완료]와 [운동 종료]가 같은 회색 사각형으로 보였다.
 */
export type PrimaryButtonVariant = 'primary' | 'secondary' | 'quiet' | 'gold' | 'homeGold';
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
  quiet: 'none',
  homeGold: 'medium',
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
  const isHomeGold = variant === 'homeGold';
  const isQuiet = variant === 'quiet';
  const isSecondary = variant === 'secondary';

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
          type={isSecondary || isQuiet ? 'background' : 'backgroundSelected'}
          style={[
            styles.button,
            size === 'large' && styles.buttonLarge,
            // 주 행동은 칠해진 금색 덩어리다. 테두리+금색 글자로는 카드와 구분되지 않았다.
            isGold && { backgroundColor: theme.gold, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.28)' },
            // 보조는 물러난다 — 같은 화면에서 주 행동과 면적을 겨루지 않는다.
            (isSecondary || isQuiet) && { borderWidth: 1, borderColor: theme.border },
            isQuiet && styles.quiet,
            isHomeGold && styles.homeGold,
          ]}>
          <ThemedText
            type={size === 'large' ? 'heading' : 'smallBold'}
            themeColor={isQuiet ? 'textSecondary' : undefined}
            style={
              isGold
                ? { color: theme.background }
                : isHomeGold
                  ? styles.homeGoldLabel
                  : undefined
            }>
            {label}
          </ThemedText>
          {subLabel && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={[
                styles.subLabel,
                isGold && { color: theme.background, opacity: 0.75 },
                isHomeGold && styles.homeGoldSubLabel,
              ]}>
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
    minHeight: Layout.ctaHeight,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonLarge: {
    minHeight: Layout.ctaHeightLarge,
    borderRadius: Radius.large,
  },
  /** 파괴적/후퇴 행동. 면적은 같아도 눈에 먼저 들어오지 않는다. */
  quiet: {
    minHeight: Layout.compactRowHeight,
  },
  homeGold: {
    backgroundColor: HomeColors.gold,
    boxShadow: '0 6px 16px rgba(149, 96, 25, 0.20)',
  },
  homeGoldLabel: {
    color: HomeColors.onGold,
  },
  homeGoldSubLabel: {
    color: HomeColors.onGoldSecondary,
  },
  subLabel: {
    marginTop: Spacing.half,
  },
  disabled: {
    opacity: 0.4,
  },
});
