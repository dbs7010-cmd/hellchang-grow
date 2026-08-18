/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    blueAccent: '#3C87F7',
    pinkAccent: '#E0699A',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    blueAccent: '#6AA5FF',
    pinkAccent: '#F08BB8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * 홈 화면 전용 "다크 짐 + 골드" 비주얼 캐논. 시스템 라이트/다크 모드와 무관하게
 * 항상 이 팔레트를 쓴다 — 홈이 일반적인 흰색 피트니스 앱처럼 보이지 않게 하기 위함.
 * 다른 화면(운동/히스토리/트레이너/설정)은 기존 Colors.light/dark를 그대로 쓴다.
 */
export const GymTheme = {
  background: '#0A0A0B',
  surface: '#16171A',
  surfaceElevated: '#1E2024',
  gold: '#FFC107',
  goldMuted: '#8A6A1F',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2A2B2F',
} as const;
