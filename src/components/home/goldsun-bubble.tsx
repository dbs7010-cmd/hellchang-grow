import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GymTheme, Spacing } from '@/constants/theme';

export interface GoldsunBubbleProps {
  portrait: string;
  name: string;
  text: string;
  onPress?: () => void;
}

/** 홈 우측 상단의 작은 골드썬 portrait + 말풍선 한마디. 큰 트레이너 카드가 아니다. */
export function GoldsunBubble({ portrait, name, text, onPress }: GoldsunBubbleProps) {
  return (
    <Pressable onPress={onPress} style={styles.row} hitSlop={8}>
      <View style={styles.bubble}>
        <ThemedText type="small" style={styles.bubbleText} numberOfLines={3}>
          {text}
        </ThemedText>
        <ThemedText type="small" style={styles.name}>
          - {name} -
        </ThemedText>
      </View>
      <View style={styles.portrait}>
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
    backgroundColor: GymTheme.surface,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: GymTheme.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  bubbleText: {
    color: GymTheme.text,
    lineHeight: 18,
  },
  name: {
    color: GymTheme.gold,
    textAlign: 'right',
  },
  portrait: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: GymTheme.gold,
    backgroundColor: GymTheme.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 20,
  },
});
