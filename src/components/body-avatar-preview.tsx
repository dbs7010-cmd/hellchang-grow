import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GenderExpression } from '@/types/user';

export interface BodyAvatarPreviewProps {
  genderExpression: GenderExpression;
  /** 0-100, 체형 전체 볼륨 보정값 */
  size: number;
  /** 0-100, 근육 톤/선명도 보정값 */
  tone: number;
}

const TORSO_WIDTH_RANGE: [number, number] = [64, 132];
const TORSO_BORDER_RANGE: [number, number] = [1, 9];

/**
 * 체형 보정값(size/tone)을 도형 layout으로 즉시 반영하는 가벼운 placeholder.
 * 3D/이미지 생성 없이 React Native View + Reanimated만 사용한다.
 */
export function BodyAvatarPreview({ genderExpression, size, tone }: BodyAvatarPreviewProps) {
  const theme = useTheme();
  const sizeValue = useSharedValue(size);
  const toneValue = useSharedValue(tone);

  useEffect(() => {
    sizeValue.value = withTiming(size, { duration: 220 });
  }, [size, sizeValue]);

  useEffect(() => {
    toneValue.value = withTiming(tone, { duration: 220 });
  }, [tone, toneValue]);

  const torsoStyle = useAnimatedStyle(() => ({
    width: interpolate(sizeValue.value, [0, 100], TORSO_WIDTH_RANGE),
    borderWidth: interpolate(toneValue.value, [0, 100], TORSO_BORDER_RANGE),
  }));

  const legStyle = useAnimatedStyle(() => ({
    width: interpolate(sizeValue.value, [0, 100], [16, 30]),
  }));

  const accent = genderExpression === 'female' ? theme.pinkAccent : theme.blueAccent;

  return (
    <View style={styles.container}>
      <View style={[styles.head, { borderColor: accent }]} />
      <Animated.View style={[styles.torso, torsoStyle, { borderColor: accent }]} />
      <View style={styles.legs}>
        <Animated.View style={[styles.leg, legStyle, { backgroundColor: accent }]} />
        <Animated.View style={[styles.leg, legStyle, { backgroundColor: accent }]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
        미리보기
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  head: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  torso: {
    height: 84,
    borderRadius: Spacing.three,
    marginTop: -Spacing.one,
  },
  legs: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: -Spacing.half,
  },
  leg: {
    height: 34,
    borderRadius: Spacing.one,
  },
  caption: {
    marginTop: Spacing.one,
  },
});
