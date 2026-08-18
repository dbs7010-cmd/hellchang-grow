import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GymTheme, Spacing } from '@/constants/theme';

export interface RecommendedStripItem {
  id: string;
  name: string;
  subtitle: string;
}

export interface RecommendedStripProps {
  items: RecommendedStripItem[];
  onPressItem: () => void;
  onPressMore: () => void;
}

/**
 * "오늘 추천 운동" — 홈의 조연. 큰 카드/긴 리스트가 아니라 최대 4개짜리 가로 스크롤 strip.
 * 탭하면 기존 workout-start 흐름으로 이동할 뿐, 새 추천 엔진을 만들지 않는다.
 */
export function RecommendedStrip({ items, onPressItem, onPressMore }: RecommendedStripProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="small" style={styles.title}>
          오늘 추천 운동
        </ThemedText>
        <Pressable onPress={onPressMore} hitSlop={8}>
          <ThemedText type="small" style={styles.more}>
            더보기 &gt;
          </ThemedText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={onPressItem} style={styles.item}>
            <ThemedText type="small" style={styles.itemName} numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" style={styles.itemSubtitle}>
              {item.subtitle}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: GymTheme.textSecondary,
  },
  more: {
    color: GymTheme.gold,
  },
  row: {
    gap: Spacing.two,
  },
  item: {
    width: 92,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: GymTheme.surface,
    borderWidth: 1,
    borderColor: GymTheme.border,
    gap: Spacing.half,
  },
  itemName: {
    color: GymTheme.text,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: GymTheme.goldMuted,
    fontSize: 11,
  },
});
