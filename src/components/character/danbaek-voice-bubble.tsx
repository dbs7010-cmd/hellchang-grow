import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HomeColors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface DanbaekVoiceBubbleProps {
  /** 단백이 자신의 한마디 (PRIMARY). */
  line: string;
  /** 정확한 학습 상태 한 줄 (SECONDARY). */
  status: string;
  onPress?: () => void;
  /** 홈처럼 밝은 배경 위에 얹을 때. */
  homeLight?: boolean;
}

/**
 * 단백이가 말하는 자리. **앱 전체에서 이 컴포넌트 하나만 쓴다** — 화면마다 다른 모양으로
 * 그리면 같은 존재가 화면마다 다른 인격처럼 보인다.
 *
 * 두 층을 항상 같은 순서로 보여준다:
 *   PRIMARY   단백이 한마디 ("나도 해볼래!")
 *   SECONDARY 정확한 상태 ("매달려 당기기 · 지켜보는 중")
 *
 * 스탠리 말풍선(`GoldsunBubble`)과 모양을 다르게 둔다 — 두 사람이 같은 말풍선을 쓰면
 * 누가 말하는지가 화면에서 사라진다. 스탠리는 portrait + 사각 말풍선, 단백이는
 * 이모지 + 둥근 pill이다.
 */
export function DanbaekVoiceBubble({ line, status, onPress, homeLight = false }: DanbaekVoiceBubbleProps) {
  const theme = useTheme();
  const colors = homeLight
    ? { background: HomeColors.surface, border: HomeColors.border, text: HomeColors.text, sub: HomeColors.textSecondary }
    : { background: theme.backgroundElement, border: theme.border, text: theme.text, sub: theme.textSecondary };

  const body = (
    <View
      style={[
        styles.bubble,
        { backgroundColor: colors.background, borderColor: colors.border },
        /*
          홈에서는 테두리와 면을 벗는다. 홈에는 이미 여러 층이 쌓여 있어서 여기까지 둥근
          pill로 띄우면 단백이의 반응이 또 하나의 위젯으로 읽힌다 — 캐릭터 바로 밑에 붙은
          말이어야 "내가 한 것에 얘가 반응한다"가 보인다. 두 층(한마디 + 상태)과 다른
          화면(스탠리/단백세상)의 말풍선 모양은 그대로다.
        */
        homeLight && styles.flat,
      ]}>
      <ThemedText style={styles.face}>🐣</ThemedText>
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={2} style={{ color: colors.text }}>
          {line}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1} style={{ color: colors.sub }}>
          {status}
        </ThemedText>
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`단백이: ${line}. ${status}`}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  /** 홈 전용 — 면과 테두리 없이 캐릭터 밑에 붙는 말. */
  flat: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  /** 실제 단백이 아트가 들어오면 이 자리만 교체된다 (Character Bible 2.0 전까지 placeholder). */
  face: {
    fontSize: 20,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
