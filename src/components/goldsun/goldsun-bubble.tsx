import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface GoldsunBubbleProps {
  portrait: string;
  name: string;
  text: string;
  onPress?: () => void;
}

/**
 * 트레이너 portrait + 말풍선 한마디. 큰 트레이너 카드가 아니라 홈/세션 등에서 작게 재사용한다.
 *
 * 말풍선 안에 "- 이름 -" 서명을 넣지 않는다 — 옆의 portrait가 이미 화자를 말해준다.
 * name은 화면에 그리지 않고 접근성 라벨로만 쓴다.
 */
export function GoldsunBubble({ portrait, name, text, onPress }: GoldsunBubbleProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      hitSlop={8}
      accessibilityLabel={`${name}: ${text}`}>
      <View style={[styles.bubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="small" style={styles.bubbleText} numberOfLines={3}>
          {text}
        </ThemedText>
      </View>
      <View style={[styles.portrait, { borderColor: theme.gold, backgroundColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.portraitEmoji}>{portrait}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // width:'100%' + justifyContent:'flex-end'로 이 컴포넌트 스스로 오른쪽 끝에 맞춘다 —
  // 부모의 alignItems에만 의존하면 실기기에서 portrait가 화면 밖으로 밀려나가는 경우가 있었다.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    width: '100%',
  },
  bubble: {
    flexShrink: 1,
    maxWidth: '76%',
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  bubbleText: {
    lineHeight: 18,
  },
  portrait: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 18,
  },
});
