import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InlineActionTone = 'gold' | 'quiet' | 'danger';

export interface InlineActionProps {
  label: string;
  onPress: () => void;
  /**
   * gold  : 새로 만드는 행동 (+ 첫 루틴 만들기, 놓친 기록 추가)
   * quiet : 펼치기/접기처럼 상태만 바꾸는 보조 행동
   * danger: 되돌릴 수 없는 정리 행동 (비정상 기록 삭제)
   */
  tone?: InlineActionTone;
  /** 기본은 라벨 폭만큼만 차지한다. 'stretch'는 줄 전체를 채운다. */
  width?: 'hug' | 'stretch';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 보조 텍스트 액션 — 앱 전체에서 이것 하나만 쓴다.
 *
 * 예전에는 화면마다 `<Pressable><ThemedText>+ 첫 루틴 만들기</ThemedText></Pressable>`을
 * 직접 만들었다. 그러면 두 가지가 동시에 망가진다:
 *  - 높이가 글자 높이(16~20px)뿐이라 실제로 누르기 어렵다 (hitSlop은 웹에서 적용되지 않는다).
 *  - 눌러도 되는 것인지 그냥 설명 문구인지 화면에서 구분되지 않아 미완성처럼 보인다.
 *
 * 그래서 여기서 한 번만: 최소 터치 높이 + 테두리 pill + 눌림 반응. PrimaryButton과는
 * 역할이 다르다 — Primary는 그 화면에서 해야 할 일이고, 이것은 "원하면 할 수 있는 일"이다.
 */
export function InlineAction({
  label,
  onPress,
  tone = 'gold',
  width = 'hug',
  disabled,
  accessibilityLabel,
  style,
}: InlineActionProps) {
  const theme = useTheme();
  const color = tone === 'gold' ? theme.gold : tone === 'danger' ? theme.mutedRed : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.action,
        { borderColor: tone === 'quiet' ? theme.border : color },
        width === 'stretch' ? styles.stretch : styles.hug,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: Layout.compactRowHeight,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hug: {
    alignSelf: 'flex-start',
  },
  stretch: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});
