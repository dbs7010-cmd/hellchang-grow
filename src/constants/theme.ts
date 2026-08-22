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

/** HOME 전용 밝은 캐릭터 육성 팔레트. 다른 LOCKED 화면의 고정 다크 테마에는 전파하지 않는다. */
export const HomeColors = {
  background: '#F7F5EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EEE8',
  surfaceGold: '#F4E7CB',
  questSurface: '#FFFCF5',
  questBorder: '#E8D5AE',
  text: '#20211F',
  textSecondary: '#74736E',
  navMuted: '#AAA69E',
  navBackground: '#FBFAF6',
  border: '#E3DED3',
  gold: '#B6791E',
  goldStrong: '#956019',
  onGold: '#FFFFFF',
  onGoldSecondary: '#FFF4DC',
  danger: '#A54136',
  shadow: '0 4px 16px rgba(44, 39, 29, 0.07)',
  hudShadow: '0 2px 10px rgba(44, 39, 29, 0.05)',
  questShadow: '0 3px 12px rgba(149, 96, 25, 0.08)',
  groundShadow: '0 7px 16px rgba(87, 68, 35, 0.14)',
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

/**
 * 하단 탭바가 콘텐츠 "위를 덮는" 만큼의 여유 높이.
 *
 * 탭바가 콘텐츠를 밀어내는 플랫폼에서는 0이어야 한다 — 그렇지 않으면 그만큼이
 * 그대로 화면 아래 죽은 공간이 된다 (홈이 스크롤돼야 했던 원인 중 하나).
 *  - android: NativeTabs가 불투명한 Material bottom nav를 레이아웃에 포함시키므로 겹치지 않는다.
 *             숨 쉴 틈만 남긴다.
 *  - ios    : 반투명 탭바 아래로 콘텐츠가 지나가므로 실제 여유가 필요하다.
 *  - web    : app-tabs.web.tsx가 position:absolute 플로팅 pill(약 76px)로 떠 있다.
 */
export const BottomTabInset = Platform.select({ ios: 60, android: Spacing.two, web: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * LAYOUT CANON — 화면마다 padding/gap을 새로 정하지 않는다.
 * PRIMARY VIEWPORT는 Galaxy 412x915 세로다. 세로 공간이 늘 부족하므로 gap을 넉넉하게 잡지 않는다.
 */
export const Layout = {
  /** 모든 화면 공통 좌우 여백 */
  screenPaddingX: 20,
  /** 서로 다른 섹션 사이 */
  sectionGap: Spacing.three,
  /** 같은 섹션 안의 row 사이 */
  rowGap: Spacing.two,
  /** 카드/패널 내부 padding */
  cardPadding: Spacing.three,
  /** 기본 CTA 높이 */
  ctaHeight: 52,
  /** 화면의 주 CTA(운동 시작 / 세트 완료) 높이 */
  ctaHeightLarge: 68,
  /** 탭 가능한 compact row 최소 높이 — 터치 영역 하한선 */
  compactRowHeight: 44,
  /** 리스트(운동 찾기 등) row 높이 */
  listRowHeight: 56,
} as const;

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
