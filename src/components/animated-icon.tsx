import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@/constants/theme';

const DURATION = 600;

/**
 * 네이티브 스플래시에서 앱 첫 화면으로 넘어가는 한 겹.
 *
 * 이 컴포넌트는 앱을 켤 때마다 **가장 먼저 보이는 화면**이다. 예전에는 Expo 템플릿이
 * 남긴 그대로여서, 헬창키우기를 켜면 Expo 로고가 Expo 파란 배경 위에 떴다 —
 * 남의 브랜드가 우리 앱의 첫 인상이었다. 웹 빌드는 이 오버레이를 그리지 않기 때문에
 * (animated-icon.web.tsx는 null을 돌려준다) 웹 QA에서는 한 번도 보이지 않았고,
 * 실기기 빌드에서만 드러나는 문제였다.
 *
 * 지금은 로고를 얹지 않고 앱의 배경색으로만 덮었다가 사라진다 — 네이티브 스플래시가
 * 내려가는 순간의 깜빡임만 가려 주면 되고, 브랜드 아트는 아이콘/스플래시 이미지가
 * 실제 아트로 교체될 때 이 자리에서 함께 정한다.
 */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { opacity: 1 },
    20: { opacity: 1 },
    70: { opacity: 0, easing: Easing.elastic(0.7) },
    100: { opacity: 0, easing: Easing.elastic(0.7) },
  });

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}
    />
  ) : (
    <Animated.View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}
    />
  );
}

const styles = StyleSheet.create({
  /** app.json의 splash backgroundColor와 같은 값이어야 이음매가 보이지 않는다. */
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dark.background,
    zIndex: 1000,
  },
});
