import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { GenderExpression } from '@/types/user';

export interface CharacterSilhouetteProps {
  genderExpression: GenderExpression;
  /** 0-100, 체형 전체 볼륨 보정값 */
  size: number;
  /** 0-100, 근육 톤/선명도 보정값 */
  tone: number;
  /**
   * Y축 회전 각도(도). 0 = 정면. CHARACTER 360이 좌우 드래그로 이 값을 연속으로 바꾼다.
   * 이산적인 "방향 슬롯"이 아니라 연속값 하나다 — 최종 3D 뷰어와 같은 회전 표현이다.
   */
  rotationYDeg?: number;
  /** 미세한 breathing idle 애니메이션 (60 ALIVE). 360 뷰어 등에서는 꺼둘 수 있다. */
  idle?: boolean;
  /**
   * 히스토리 미니 프리뷰처럼 작은 고정 박스 안에 넣을 때 쓰는 축소 배율.
   * 내부 도형은 고정 픽셀 크기라, scale 없이 작은 박스에 넣으면 카드/인접 콘텐츠를 침범한다.
   */
  scale?: number;
}

/**
 * 도형 placeholder rig의 고유 높이(px).
 * head 56 + neck 10 + torso 160 + armRow(오버랩 후 10) + legRow(4+150) + shoeRow(2+16) = 408.
 * 홈처럼 남는 세로 공간에 캐릭터를 꽉 채워야 하는 화면이 이 값을 기준으로 scale을 계산한다 —
 * 화면 코드가 408을 하드코딩하지 않게 하려고 여기서 내보낸다.
 */
export const CharacterIntrinsicHeight = 408;

/**
 * 실제 캐릭터 에셋이 없을 때 쓰는 중립 전신 실루엣 placeholder (도형 rig).
 *
 * 화면이 이걸 직접 부르지 않는다 — 2D는 PlayerCharacter가, 360은 CharacterViewer가 감싼다.
 * 여기서 에셋 존재 여부를 판단하지 않는다 (그 판단은 config/character-assets.ts 한 곳).
 * 캐릭터 전체를 gold로 두르지 않는다 — gold는 어깨/팔 쪽 rim light로만 쓴다.
 */
export function CharacterSilhouette({
  genderExpression,
  size,
  tone,
  rotationYDeg = 0,
  idle = true,
  scale = 1,
}: CharacterSilhouetteProps) {
  const theme = useTheme();
  const breatheY = useSharedValue(0);

  useEffect(() => {
    if (!idle) {
      breatheY.value = 0;
      return;
    }
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [idle, breatheY]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: breatheY.value }],
  }));

  const shoulderWidth = 90 + (size / 100) * 60;
  const waistWidth = 46 + (size / 100) * 30;
  const definition = 1 + (tone / 100) * 3;
  const rotateDeg = rotationYDeg;
  const rimAccent = genderExpression === 'female' ? '#F0B8D9' : theme.goldBright;
  const bodyLine = theme.border;

  return (
    // scale이 있을 때(작은 고정 박스에 넣는 경우)는 wrapper 스스로도 그 박스 높이(100%)를 꽉
    // 채워야 내부 콘텐츠가 "박스 중앙"을 기준으로 축소된다. 그렇지 않으면 wrapper가 원본
    // 크기(약 400px)로 커진 뒤 그 중앙을 기준으로 줄어들어, 보이는 영역 밖으로 밀려난다.
    <View style={[styles.wrapper, scale !== 1 && styles.wrapperFitted]}>
      <View style={[styles.scaleGroup, scale !== 1 && { transform: [{ scale }] }]}>
        {/* graphite gym backdrop + 은은한 warm ceiling light */}
        <View style={[styles.backdropGlow, { backgroundColor: theme.gold, opacity: 0.06 }]} />
        <View style={[styles.contactShadow, { backgroundColor: theme.backgroundDeep }]} />

        <Animated.View
          style={[
            styles.rig,
            breatheStyle,
            { transform: [{ perspective: 900 }, { rotateY: `${rotateDeg}deg` }] },
          ]}>
          <View style={[styles.head, { borderColor: rimAccent, backgroundColor: theme.backgroundSelected }]} />
          <View style={[styles.neck, { backgroundColor: theme.backgroundSelected }]} />
          <View
            style={[
              styles.torso,
              {
                width: shoulderWidth,
                borderWidth: definition,
                borderColor: bodyLine,
                backgroundColor: theme.backgroundSelected,
              },
            ]}>
            {/* 어깨 rim light — 캐릭터 전체가 아니라 상단 어깨 라인에만 */}
            <View style={[styles.shoulderRim, { backgroundColor: rimAccent, width: shoulderWidth * 0.9 }]} />
            <View
              style={[
                styles.waist,
                { width: waistWidth, borderColor: bodyLine, borderWidth: definition, backgroundColor: theme.backgroundSelected },
              ]}
            />
          </View>
          <View style={styles.armRow}>
            <View style={[styles.arm, { borderColor: bodyLine, borderWidth: definition, backgroundColor: theme.backgroundSelected }]} />
            <View style={{ width: shoulderWidth * 0.55 }} />
            <View style={[styles.arm, { borderColor: bodyLine, borderWidth: definition, backgroundColor: theme.backgroundSelected }]} />
          </View>
          <View style={styles.legRow}>
            <View style={[styles.leg, { borderColor: bodyLine, borderWidth: definition, backgroundColor: theme.backgroundSelected }]} />
            <View style={[styles.leg, { borderColor: bodyLine, borderWidth: definition, backgroundColor: theme.backgroundSelected }]} />
          </View>
          <View style={styles.shoeRow}>
            <View style={[styles.shoe, { backgroundColor: theme.gold }]} />
            <View style={[styles.shoe, { backgroundColor: theme.gold }]} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapperFitted: {
    height: '100%',
  },
  scaleGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropGlow: {
    position: 'absolute',
    top: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  contactShadow: {
    position: 'absolute',
    bottom: 4,
    width: 140,
    height: 18,
    borderRadius: 70,
    opacity: 0.5,
  },
  rig: {
    alignItems: 'center',
  },
  head: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
  },
  neck: {
    width: 20,
    height: 10,
  },
  torso: {
    height: 160,
    borderRadius: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  shoulderRim: {
    position: 'absolute',
    top: 0,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  waist: {
    position: 'absolute',
    bottom: -6,
    height: 40,
    borderRadius: 18,
  },
  armRow: {
    flexDirection: 'row',
    marginTop: -120,
  },
  arm: {
    width: 26,
    height: 130,
    borderRadius: 14,
  },
  legRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  leg: {
    width: 40,
    height: 150,
    borderRadius: 18,
  },
  shoeRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 2,
  },
  shoe: {
    width: 46,
    height: 16,
    borderRadius: 8,
  },
});
