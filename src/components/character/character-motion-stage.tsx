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
   * 유효 세트 완료에서만 들어오므로 동시에 GYM BATTLE의 즉시 적중 피드백을 보여 준다.
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
 * 세트 완료 시 보이는 `HIT!`는 전투 상태를 새로 저장하거나 Growth/Workout 계산을
 * 변경하지 않는다. 세션이 이미 "유효 세트"라고 판정해 reactionCopy를 넘긴 순간에만
 * 같은 화면에서 공격이 적중했다는 표현을 얹는다. 실제 누적 HP/피해는 GYM BATTLE의
 * 저장된 WorkoutRecord 기반 계산이 계속 단일 근거다.
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
  const hitProgress = useSharedValue(0);
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

  useEffect(() => {
    cancelAnimation(hitProgress);
    if (!reactionCopy) {
      hitProgress.set(0);
      return;
    }
    if (reducedMotion) {
      hitProgress.set(1);
      return;
    }
    hitProgress.set(0);
    hitProgress.set(
      withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(0.7, { duration: 110 }),
        withTiming(1, { duration: 100 })
      )
    );
    return () => cancelAnimation(hitProgress);
  }, [hitProgress, reactionCopy, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.get() * profile.translateX },
      { translateY: progress.get() * profile.translateY },
      { rotateZ: `${progress.get() * profile.rotateDeg}deg` },
      { scaleX: 1 + progress.get() * profile.scaleXDelta },
      { scaleY: 1 + progress.get() * profile.scaleYDelta },
    ],
  }));

  const hitStyle = useAnimatedStyle(() => ({
    opacity: hitProgress.get(),
    transform: [
      { translateY: -8 * hitProgress.get() },
      { scale: 0.86 + 0.2 * hitProgress.get() },
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
        />
      </Animated.View>
      {reactionCopy && (
        <>
          <Animated.View
            style={[
              styles.hit,
              { backgroundColor: theme.backgroundElement, borderColor: theme.gold },
              hitStyle,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.gold }}>
              HIT!
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              몬스터 적중
            </ThemedText>
          </Animated.View>
          <View style={[styles.reaction, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="caption" numberOfLines={1}>
              {reactionCopy}
            </ThemedText>
          </View>
        </>
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
  /** 유효 세트가 확정된 순간에만 뜨는 전투 적중 배지. 저장/성장 계산과 무관한 표현층이다. */
  hit: {
    position: 'absolute',
    right: Spacing.three,
    top: 42,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
});
