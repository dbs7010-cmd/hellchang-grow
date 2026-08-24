import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PlayerCharacter } from '@/components/character/player-character';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SessionGameAssetSlots } from '@/config/danbaek-game-assets';
import { useTheme } from '@/hooks/use-theme';
import type { DanbaekBodyParameters } from '@/types/body-state';
import type { MotionFamily } from '@/types/exercise';
import { CharacterAppearance } from '@/utils/character-appearance';
import { getCharacterMotionProfile, type WorkoutCharacterState } from '@/utils/workout-character-motion';

export interface CharacterMotionStageProps {
  appearance: CharacterAppearance;
  /** 현재 운동의 `animationFamily`. 없으면 캐릭터는 가만히 서 있는다. */
  family?: MotionFamily;
  /** 세션 도메인 상태를 표현 계층으로만 매핑한 값. */
  state: WorkoutCharacterState;
  /** 성장 상태. 홈과 같은 바디를 그대로 쓴다 — 모션만 이 컴포넌트가 얹는다. */
  bodyParameters?: DanbaekBodyParameters | null;
  /**
   * 방금 자극한 부위에 대한 단백이의 한 줄. 이 자리 안에 겹쳐 그리므로 레이아웃 높이를
   * 늘리지 않고, 세트 입력/휴식 UI를 밀어내지도 않는다. 표현 전용 값이다.
   */
  reactionCopy?: string | null;
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
  state,
  bodyParameters,
  reactionCopy,
  height,
  style,
}: CharacterMotionStageProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const profile = getCharacterMotionProfile(state, family, reducedMotion);
  const durationMs = profile.durationMs;

  useEffect(() => {
    cancelAnimation(progress);
    if (reducedMotion || durationMs <= 0) {
      progress.set(withTiming(0, { duration: 150 }));
      return;
    }
    progress.set(0);
    const motion = withSequence(
      withTiming(1, { duration: durationMs / 2, easing: Easing.bezier(0.77, 0, 0.175, 1) }),
      withTiming(0, { duration: durationMs / 2, easing: Easing.bezier(0.77, 0, 0.175, 1) })
    );
    if (!profile.repeats) {
      progress.set(motion);
      return () => cancelAnimation(progress);
    }
    progress.set(withRepeat(motion, -1, false));
    return () => {
      cancelAnimation(progress);
      progress.set(0);
    };
  }, [durationMs, profile.repeats, progress, reducedMotion, state, family]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.get() * profile.translateX },
      { translateY: progress.get() * profile.translateY },
      { rotateZ: `${progress.get() * profile.rotateDeg}deg` },
      { scaleX: 1 + progress.get() * profile.scaleXDelta },
      { scaleY: 1 + progress.get() * profile.scaleYDelta },
    ],
  }));

  if (height <= 0) return null;

  return (
    <View style={[styles.stage, { height }, style]} pointerEvents="none">
      <Animated.View style={[styles.characterMotion, animatedStyle]}>
        <PlayerCharacter
          appearance={appearance}
          slot="session"
          gameAssetSlot={SessionGameAssetSlots[state]}
          allowGameAssetWithBodyParameters
          height={height}
          bodyParameters={bodyParameters}
          idle={reducedMotion || state === 'idle' || state === 'ready' || state === 'resting'}
        />
      </Animated.View>
      {reactionCopy && (
        <View style={[styles.reaction, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="caption" numberOfLines={1}>
            {reactionCopy}
          </ThemedText>
        </View>
      )}
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
  characterMotion: {
    width: '100%',
    alignItems: 'center',
  },
  /** 캐릭터 자리 위에 겹쳐 뜨는 한 줄 — 흐름에 없으므로 아래 UI를 밀지 않는다. */
  reaction: {
    position: 'absolute',
    top: 0,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    maxWidth: '92%',
  },
});
