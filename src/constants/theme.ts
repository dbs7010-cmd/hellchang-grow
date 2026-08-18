/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * IRON GRAPHITE + WARM GOLD — 헬창키우기 V1 UI/LIGHT CANON.
 * 순수 검정/흰색 대시보드가 아니라 항상 그래파이트 톤 + 골드 포인트를 쓴다.
 * Gold는 장식이 아니라 행동/현재 선택/완료/PR/보상/골드썬을 강조할 때만 쓴다.
 */
export const Colors = {
  light: {
    text: '#1B1D20',
    textSecondary: '#5B5D61',
    background: '#EDEAE2',
    backgroundDeep: '#E3DFD3',
    backgroundElement: '#F5F3ED',
    backgroundSelected: '#E7E2D5',
    border: '#D8D3C6',
    blueAccent: '#3C87F7',
    pinkAccent: '#E0699A',
    gold: '#B8791C',
    goldBright: '#D98B22',
    warmOrange: '#B5651D',
    mutedRed: '#9C3830',
  },
  dark: {
    text: '#F4F3EF',
    textSecondary: '#A7A9AD',
    background: '#1B1D20',
    backgroundDeep: '#17191C',
    backgroundElement: '#25282C',
    backgroundSelected: '#30343A',
    border: '#3A3E44',
    blueAccent: '#6AA5FF',
    pinkAccent: '#F08BB8',
    gold: '#E7AD28',
    goldBright: '#FFC43D',
    warmOrange: '#D98B3C',
    mutedRed: '#C1554B',
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

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
  pill: 999,
} as const;

/**
 * MOTION CANON — 60 ALIVE / 30 REACTIVE / 10 CELEBRATION.
 * 화면마다 다른 지속시간을 임의로 정하지 않고 이 토큰만 쓴다.
 */
export const Motion = {
  /** 일반 화면 전환 */
  screenTransitionMs: 210,
  /** tap/selection 등 즉각 반응 */
  reactiveMs: 120,
  /** 버튼 눌림 scale */
  pressScale: 0.97,
  /** 세트 완료 전체 반응 길이 */
  setCompleteMs: 800,
  /** PR 축하 연출 길이 */
  prCelebrationMs: 1800,
  /** 알림/골드썬 등장 */
  slideInMs: 200,
  /** 알림/골드썬 퇴장 */
  fadeOutMs: 150,
  /** 보상 카드 glow */
  rewardGlowMs: 500,
  /** 드래그 스냅 */
  dragSnapMs: 180,
} as const;
