import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GoldsunBubble } from '@/components/goldsun/goldsun-bubble';
import { Motion } from '@/constants/theme';

export interface GoldsunReactionProps {
  visible: boolean;
  portrait: string;
  name: string;
  text: string;
  onDismiss: () => void;
  /** 0이면 자동으로 사라지지 않고 탭으로만 닫는다 */
  autoDismissMs?: number;
}

/**
 * 중요한 순간에만 잠깐 나타나는 골드썬 반응. 화면을 상시 점유하는 카드가 아니다.
 * 세션/휴식 화면 등에서 절대 위치 컨테이너 안에 넣어 쓴다.
 */
export function GoldsunReaction({
  visible,
  portrait,
  name,
  text,
  onDismiss,
  autoDismissMs = 3200,
}: GoldsunReactionProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-16);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: Motion.slideInMs });
      translateY.value = withTiming(0, { duration: Motion.slideInMs });
      if (autoDismissMs > 0) {
        const timer = setTimeout(onDismiss, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      opacity.value = withTiming(0, { duration: Motion.fadeOutMs });
      translateY.value = withTiming(-16, { duration: Motion.fadeOutMs });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, text]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]} pointerEvents="box-none">
      <Pressable onPress={onDismiss} style={styles.pressable}>
        <GoldsunBubble portrait={portrait} name={name} text={text} onPress={onDismiss} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'flex-end',
  },
  pressable: {
    width: '100%',
  },
});
