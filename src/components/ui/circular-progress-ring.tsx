import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export interface CircularProgressRingProps {
  /** 0~1 */
  progress: number;
  size?: number;
  thickness?: number;
  color: string;
  trackColor: string;
  holeColor: string;
  children?: ReactNode;
}

/**
 * SVG 없이 순수 View + transform:rotate로 만드는 원형 progress ring
 * ("반원 두 개" 기법 — 새 dependency 없이 native/web 모두 동작한다).
 *
 * 각 반원 wrapper 안에는 "flat edge가 원 중심에 오는 반달(D자) 모양" fill을 두고,
 * 180deg(숨김, 원 중심 반대쪽으로 접혀 있음) → 0deg(완전히 펼쳐짐)로 회전시킨다.
 * 회전 축을 "그 반달 도형 자신의 중심"이 아니라 "flat edge(=원의 중심선)"에 두기 위해
 * translateX(half) rotate translateX(-half) 샌드위치를 쓴다.
 */
export function CircularProgressRing({
  progress,
  size = 220,
  thickness = 14,
  color,
  trackColor,
  holeColor,
  children,
}: CircularProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const angle = clamped * 360;
  const radius = size / 2;
  const half = radius / 2;

  const rightProgress = Math.min(1, angle / 180);
  const leftProgress = Math.max(0, Math.min(1, (angle - 180) / 180));
  const rightRotation = 180 - rightProgress * 180;
  const leftRotation = 180 - leftProgress * 180;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: trackColor }]}>
      {/* 오른쪽 절반: 0~180도를 담당 */}
      <View style={[styles.halfClip, { width: radius, height: size, left: radius }]}>
        <View
          style={[
            styles.halfFill,
            {
              width: radius,
              height: size,
              borderTopRightRadius: radius,
              borderBottomRightRadius: radius,
              backgroundColor: color,
              transform: [{ translateX: half }, { rotate: `${rightRotation}deg` }, { translateX: -half }],
            },
          ]}
        />
      </View>
      {/* 왼쪽 절반: 180~360도를 담당 (오른쪽이 다 찬 뒤에만 채워지기 시작) */}
      <View style={[styles.halfClip, { width: radius, height: size, left: 0 }]}>
        <View
          style={[
            styles.halfFill,
            {
              width: radius,
              height: size,
              borderTopLeftRadius: radius,
              borderBottomLeftRadius: radius,
              backgroundColor: leftProgress > 0 ? color : trackColor,
              transform: [{ translateX: -half }, { rotate: `${leftRotation}deg` }, { translateX: half }],
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.hole,
          {
            top: thickness,
            left: thickness,
            right: thickness,
            bottom: thickness,
            borderRadius: radius - thickness,
            backgroundColor: holeColor,
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfFill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hole: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
