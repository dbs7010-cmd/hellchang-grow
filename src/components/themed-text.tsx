import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /**
   * TYPOGRAPHY CANON — 역할 6개(Screen Title / Section Title / Primary Metric / Body /
   * Secondary / Caption)에 각각 하나의 type만 대응시킨다. 화면마다 fontSize를 직접
   * 덮어쓰지 않는다.
   *  - Screen Title    : heading
   *  - Section Title   : sectionTitle
   *  - Primary Metric  : metric (숫자 강조), subtitle/title(연출용 초대형)
   *  - Body            : default
   *  - Secondary       : small / smallBold
   *  - Caption         : caption / captionBold
   */
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'heading'
    | 'sectionTitle'
    | 'metric'
    | 'caption'
    | 'captionBold'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'heading' && styles.heading,
        type === 'sectionTitle' && styles.sectionTitle,
        type === 'metric' && styles.metric,
        type === 'caption' && styles.caption,
        type === 'captionBold' && styles.captionBold,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  /** 탭 화면 페이지 타이틀 전용 — subtitle(32)보다 작게, 홈의 절제된 상단바 밀도에 맞춘다. */
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  /** Section Title — 화면 안 블록의 제목. smallBold(=row 라벨)와 확실히 구분되게 한 단계 크다. */
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  /** Primary Metric — 총 볼륨/세트 수 등 '이 블록에서 가장 중요한 숫자' 하나. */
  metric: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  /**
   * Caption — 라벨/단위/보조 한 줄. 이전에는 화면마다 fontSize:11을 직접 박았는데,
   * 실기기(Galaxy)에서 너무 흐리고 작아 12로 통일한다.
   */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
