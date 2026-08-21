import { memo, useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { CharacterBodyConfig, type DanbaekApprovedRegion } from '@/config/character-body-config';
import type { DanbaekBodyParameters } from '@/types/body-state';
import type { GenderExpression } from '@/types/user';
import { buildCharacterBodyGeometry } from '@/utils/character-body-geometry';

export interface CharacterSilhouetteProps {
  genderExpression: GenderExpression;
  size: number;
  tone: number;
  bodyParameters?: DanbaekBodyParameters | null;
  rotationYDeg?: number;
  idle?: boolean;
  scale?: number;
}

export const CharacterIntrinsicHeight = CharacterBodyConfig.viewBox.height;

/** LOCKED layered Danbaek CANON renderer. It only draws paths approved by PART_PATH_SPEC.md. */
function CharacterSilhouetteComponent({
  bodyParameters,
  rotationYDeg = 0,
  idle = true,
  scale = 1,
}: CharacterSilhouetteProps) {
  const breatheY = useSharedValue(0);
  const rendererId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = (region: DanbaekApprovedRegion) => `danbaek-${rendererId}-${region}-clip`;
  const fillClipId = (region: DanbaekApprovedRegion) => `danbaek-${rendererId}-${region}-fill-clip`;
  useEffect(() => {
    if (!idle) {
      breatheY.value = 0;
      return;
    }
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    );
  }, [idle, breatheY]);
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ translateY: breatheY.value }] }));
  const geometry = buildCharacterBodyGeometry({ bodyParameters });
  const { basePaths, fixedIdentity, regions, stage0BodyProportion, stroke } = CharacterBodyConfig;
  const bodyProportionTransform = `translate(0 ${stage0BodyProportion.anchorY}) scale(1 ${stage0BodyProportion.scaleY}) translate(0 -${stage0BodyProportion.anchorY})`;
  const bodyTransform = `translate(100 78) scale(${geometry.massScale}) translate(-100 -78)`;

  return (
    <View style={[styles.wrapper, scale !== 1 && styles.fitted]}>
      <Animated.View style={breatheStyle}>
        <View style={{ transform: [{ perspective: 900 }, { rotateY: `${rotationYDeg}deg` }, { scale }] }}>
        <Svg width={200} height={280} viewBox="0 0 200 280" accessibilityLabel="단백이 캐릭터">
          <Defs>
            {(Object.entries(regions) as [DanbaekApprovedRegion, (typeof regions)[DanbaekApprovedRegion]][]).map(([name, region]) => (
              <ClipPath id={clipId(name)} key={name}>
                <Rect x={region.x} y={region.y} width={region.width} height={region.height} />
              </ClipPath>
            ))}
            {(Object.entries(regions) as [DanbaekApprovedRegion, (typeof regions)[DanbaekApprovedRegion]][]).map(([name, region]) => (
              <ClipPath id={fillClipId(name)} key={`fill-${name}`}>
                <Rect x={region.x} y={region.y + stroke.width} width={region.width} height={region.height - stroke.width * 2} />
              </ClipPath>
            ))}
          </Defs>

          <G transform={`${bodyProportionTransform} ${bodyTransform}`} fill={stroke.fill} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round">
            <Path d={basePaths.torso} />
            <Path d={basePaths.armLeft} />
            <Path d={basePaths.armRight} />
            <Path d={basePaths.legLeft} />
            <Path d={basePaths.legRight} />
            {geometry.overlays.map((overlay, index) => (
              <G key={`${overlay.region}-${index}`} opacity={overlay.opacity} clipPath={`url(#${fillClipId(overlay.region)})`}>
                <Path d={overlay.path} stroke="none" />
              </G>
            ))}
            {geometry.overlays.map((overlay, index) => (
              <Path key={`outline-${overlay.region}-${index}`} d={overlay.outline} fill="none" opacity={overlay.opacity} clipPath={`url(#${clipId(overlay.region)})`} />
            ))}

            <G fill="none" opacity={geometry.chestLineOpacity} clipPath={`url(#${clipId('chest')})`}>
              <Path d="M86 101 Q100 109 114 101" strokeWidth={2} />
            </G>
            <G fill="none" opacity={geometry.backLineOpacity} clipPath={`url(#${clipId('back')})`}>
              <Path d="M76 104 Q68 118 75 139 M124 104 Q132 118 125 139" strokeWidth={2} />
            </G>
            <G fill="none" opacity={geometry.abdomenLineOpacity} clipPath={`url(#${clipId('abs')})`} strokeWidth={1.7}>
              <Path d="M100 108 L100 158" />
              <Path d="M90 119 Q95 122 99 119 M101 119 Q105 122 110 119 M90 132 Q95 135 99 132 M101 132 Q105 135 110 132 M90 145 Q95 148 99 145 M101 145 Q105 148 110 145" />
            </G>
            <G fill="none" opacity={geometry.armLineOpacity} clipPath={`url(#${clipId('arm')})`} strokeWidth={1.8}>
              <Path d="M63 93 Q54 105 62 118 M137 93 Q146 105 138 118" />
            </G>
            <G fill="none" opacity={geometry.legLineOpacity} clipPath={`url(#${clipId('thigh')})`} strokeWidth={2}>
              <Path d="M82 178 Q88 196 92 210 M118 178 Q112 196 108 210" />
            </G>
          </G>

          <G fill={stroke.fill} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round">
            <Path d={fixedIdentity.headPath} />
          </G>
          <G fill={stroke.color}>
            <Circle cx={fixedIdentity.eyes.leftX} cy={fixedIdentity.eyes.y} r={fixedIdentity.eyes.radius} />
            <Circle cx={fixedIdentity.eyes.rightX} cy={fixedIdentity.eyes.y} r={fixedIdentity.eyes.radius} />
          </G>
          <Path d={fixedIdentity.mouth} fill="none" stroke={stroke.color} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

export const CharacterSilhouette = memo(CharacterSilhouetteComponent);

const styles = StyleSheet.create({
  wrapper: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  fitted: { height: '100%' },
});
