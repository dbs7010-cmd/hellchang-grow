import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { GymTheme } from '@/constants/theme';
import { CharacterAngle, PlayerCharacterImages } from '@/config/character-assets';
import { GenderExpression } from '@/types/user';

export interface CharacterSilhouetteProps {
  genderExpression: GenderExpression;
  /** 0-100, 체형 전체 볼륨 보정값 */
  size: number;
  /** 0-100, 근육 톤/선명도 보정값 */
  tone: number;
  angle?: CharacterAngle;
}

const ANGLE_ROTATION_DEG: Record<CharacterAngle, number> = {
  front: 0,
  'front-side': 25,
  side: 55,
  'back-side': 130,
  back: 180,
};

/**
 * 실사 캐릭터 아트가 준비되기 전까지 쓰는 전신 실루엣 placeholder.
 * PlayerCharacterImages에 해당 각도 이미지가 등록되면 자동으로 그 이미지를 쓰고,
 * 없으면 도형 + perspective rotateY로 방향을 흉내낸 실루엣을 그린다.
 */
export function CharacterSilhouette({ genderExpression, size, tone, angle = 'front' }: CharacterSilhouetteProps) {
  const image = PlayerCharacterImages[angle];
  if (image) {
    return <Image source={image} style={styles.image} contentFit="contain" />;
  }

  const shoulderWidth = 90 + (size / 100) * 60;
  const waistWidth = 46 + (size / 100) * 30;
  const definition = 1 + (tone / 100) * 3;
  const rotateDeg = ANGLE_ROTATION_DEG[angle];
  const accent = genderExpression === 'female' ? '#F0B8D9' : GymTheme.gold;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.rig,
          { transform: [{ perspective: 900 }, { rotateY: `${rotateDeg}deg` }] },
        ]}>
        <View style={[styles.head, { borderColor: accent }]} />
        <View style={styles.neck} />
        <View
          style={[
            styles.torso,
            {
              width: shoulderWidth,
              borderWidth: definition,
              borderColor: accent,
            },
          ]}>
          <View style={[styles.waist, { width: waistWidth, borderColor: accent, borderWidth: definition }]} />
        </View>
        <View style={styles.armRow}>
          <View style={[styles.arm, { borderColor: accent, borderWidth: definition }]} />
          <View style={{ width: shoulderWidth * 0.55 }} />
          <View style={[styles.arm, { borderColor: accent, borderWidth: definition }]} />
        </View>
        <View style={styles.legRow}>
          <View style={[styles.leg, { borderColor: accent, borderWidth: definition }]} />
          <View style={[styles.leg, { borderColor: accent, borderWidth: definition }]} />
        </View>
        <View style={styles.shoeRow}>
          <View style={[styles.shoe, { backgroundColor: accent }]} />
          <View style={[styles.shoe, { backgroundColor: accent }]} />
        </View>
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
  image: {
    width: '100%',
    height: '100%',
  },
  rig: {
    alignItems: 'center',
  },
  head: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    backgroundColor: GymTheme.surfaceElevated,
  },
  neck: {
    width: 20,
    height: 10,
    backgroundColor: GymTheme.surfaceElevated,
  },
  torso: {
    height: 160,
    borderRadius: 28,
    backgroundColor: GymTheme.surfaceElevated,
    alignItems: 'center',
  },
  waist: {
    position: 'absolute',
    bottom: -6,
    height: 40,
    borderRadius: 18,
    backgroundColor: GymTheme.surfaceElevated,
  },
  armRow: {
    flexDirection: 'row',
    marginTop: -120,
  },
  arm: {
    width: 26,
    height: 130,
    borderRadius: 14,
    backgroundColor: GymTheme.surfaceElevated,
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
    backgroundColor: GymTheme.surfaceElevated,
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
