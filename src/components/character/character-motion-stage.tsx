import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useReducedMotion, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { PlayerCharacter } from '@/components/character/player-character';
import type { DanbaekExpression } from '@/components/character/character-silhouette';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DanbaekBodyParameters } from '@/types/body-state';
import type { MotionFamily } from '@/types/exercise';
import { CharacterAppearance } from '@/utils/character-appearance';
import { getCharacterMotionProfile, type WorkoutCharacterState } from '@/utils/workout-character-motion';

export interface CharacterMotionStageProps {
  appearance: CharacterAppearance;
  family?: MotionFamily;
  state: WorkoutCharacterState;
  bodyParameters?: DanbaekBodyParameters | null;
  reactionCopy?: string | null;
  height: number;
  style?: ViewStyle;
}

/** Expression is presentation only: no learning/growth value is inferred from a face. */
function expressionForWorkoutState(state: WorkoutCharacterState): DanbaekExpression {
  if (state === 'working' || state === 'ready') return 'focused';
  if (state === 'resting' || state === 'fatigued' || state === 'paused') return 'tired';
  if (state === 'set_complete') return 'surprised';
  return 'happy';
}

/** Shared CANON character + motion layer. Session logic remains outside this component. */
export function CharacterMotionStage({ appearance, family, state, bodyParameters, reactionCopy, height, style }: CharacterMotionStageProps) {
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
    return () => { cancelAnimation(progress); progress.set(0); };
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
      <Animated.View style={animatedStyle}>
        <PlayerCharacter
          appearance={appearance}
          slot="session"
          height={height}
          bodyParameters={bodyParameters}
          idle={reducedMotion || state === 'idle' || state === 'ready' || state === 'resting'}
          expression={expressionForWorkoutState(state)}
        />
      </Animated.View>
      {reactionCopy && (
        <View style={[styles.reaction, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="caption" numberOfLines={1}>{reactionCopy}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  reaction: { position: 'absolute', top: 0, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.pill, borderWidth: 1, maxWidth: '92%' },
});
