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

/** 골드썬 portrait + 말풍선 한마디. 큰 트레이너 카드가 아니라 홈/세션 등에서 작게 재사용한다. */
export function GoldsunBubble({ portrait, name, text, onPress }: GoldsunBubbleProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row} hitSlop={8}>
      <View style={[styles.bubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="small" style={styles.bubbleText} numberOfLines={3}>
          {text}
        </ThemedText>
        <ThemedText type="small" style={[styles.name, { color: theme.gold }]}>
          - {name} -
        </ThemedText>
      </View>
      <View style={[styles.portrait, { borderColor: theme.gold, backgroundColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.portraitEmoji}>{portrait}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    maxWidth: 220,
  },
  bubble: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  bubbleText: {
    lineHeight: 18,
  },
  name: {
    textAlign: 'right',
  },
  portrait: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 20,
  },
});
