import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PlayerCharacter } from '@/components/character/player-character';
import { getMotionFamilyDescriptor } from '@/config/motion-families';
import type { MotionFamily } from '@/types/exercise';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface CharacterMotionStageProps {
  appearance: CharacterAppearance;
  /** 현재 운동의 `animationFamily`. 없으면 캐릭터는 가만히 서 있는다. */
  family?: MotionFamily;
  /** 실제로 운동 중일 때만 모션을 돌린다 (휴식/일시정지 중에는 정지). */
  active: boolean;
  height: number;
  style?: ViewStyle;
}

/**
 * 세션 화면의 단백이 자리.
 *
 * 캐릭터 자체는 항상 공통 렌더러(`PlayerCharacter`)다 — 화면마다 캐릭터를 다시 그리지
 * 않는다는 규칙을 그대로 지킨다. 이 컴포넌트가 더하는 것은 **모션 레이어 하나**뿐이다:
 * 현재 운동의 `animationFamily`를 받아 `config/motion-families.ts`의 공통 파라미터로
 * 움직인다. 종목마다 애니메이션을 만들지 않으며, 이번 단계에서는 실제 스프라이트 없이
 * 축/진폭/속도만 다른 placeholder 모션이다.
 *
 * 실제 모션 에셋이 준비되면 바꿀 곳은 두 군데뿐이다 — motion family registry와
 * character asset registry. 세션 화면 코드는 그대로 둔다.
 */
export function CharacterMotionStage({
  appearance,
  family,
  active,
  height,
  style,
}: CharacterMotionStageProps) {
  const progress = useSharedValue(0);
  const descriptor = family ? getMotionFamilyDescriptor(family) : undefined;
  const repDurationMs = descriptor?.repDurationMs ?? 0;

  useEffect(() => {
    if (!descriptor || !active) {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 200 });
      return;
    }
    // 한 반복 = 내려가고(절반) 올라오기(절반). 무한 반복이라 세트 사이에 다시 시작하지 않는다.
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: repDurationMs / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: repDurationMs / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(progress);
  }, [descriptor, active, repDurationMs, progress]);

  const axis = descriptor?.axis ?? 'vertical';
  const amplitude = descriptor?.amplitude ?? 0;

  const animatedStyle = useAnimatedStyle(() => {
    if (axis === 'scale') return { transform: [{ scale: 1 - progress.value * amplitude }] };
    if (axis === 'horizontal') return { transform: [{ translateX: progress.value * amplitude }] };
    return { transform: [{ translateY: progress.value * amplitude }] };
  });

  if (height <= 0) return null;

  return (
    <View style={[styles.stage, { height }, style]} pointerEvents="none">
      <Animated.View style={animatedStyle}>
        <PlayerCharacter appearance={appearance} slot="session" height={height} idle={!active} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});
