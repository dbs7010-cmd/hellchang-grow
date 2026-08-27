import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
import { HomeColors, Layout, Radius, Spacing } from '@/constants/theme';

export interface RecommendedStripItem {
  id: string;
  name: string;
  subtitle: string;
}

export interface RecommendedStripProps {
  items: RecommendedStripItem[];
  /** 누른 카드의 Exercise DB ID를 그대로 넘긴다 — 어떤 운동을 눌렀는지 호출부가 안다. */
  onPressItem: (exerciseId: string) => void;
  onPressMore: () => void;
}

/** 카드 폭 — 412 화면에서 3개가 온전히 보이고 4번째가 살짝 걸쳐 "더 있다"가 드러나는 값. */
const ITEM_WIDTH = 108;

/**
 * "오늘 추천 운동" — 홈의 조연. 큰 카드/긴 리스트가 아니라 가로 스크롤 strip.
 * 탭하면 기존 workout-start 흐름으로 이동할 뿐, 새 추천 엔진을 만들지 않는다.
 */
export function RecommendedStrip({ items, onPressItem, onPressMore }: RecommendedStripProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="sectionTitle" style={styles.title}>오늘 추천 운동</ThemedText>
        <Pressable
          onPress={onPressMore}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="추천 운동 더보기"
          style={styles.moreButton}>
          <ThemedText type="captionBold" style={styles.more}>
            더보기 ›
          </ThemedText>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onPressItem(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} 자세히 보기`}
            style={styles.item}>
            <ExerciseArtSlot exerciseId={item.id} style={styles.thumbnail} />
            <View style={styles.itemText}>
              <ThemedText type="captionBold" style={styles.itemName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText type="caption" style={styles.itemSubtitle} numberOfLines={1}>
                {item.subtitle}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    width: '100%',
  },
  /** 글자 높이(16px)만 눌리던 링크에 최소 터치 영역을 준다. */
  moreButton: {
    minHeight: Layout.compactRowHeight,
    justifyContent: 'center',
    paddingLeft: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scroll: {
    flexGrow: 0,
    marginHorizontal: -Layout.screenPaddingX,
  },
  row: {
    gap: Spacing.two,
    paddingHorizontal: Layout.screenPaddingX,
  },
  item: {
    width: ITEM_WIDTH,
    borderRadius: Radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: HomeColors.questSurface,
    borderColor: HomeColors.questBorder,
    boxShadow: HomeColors.questShadow,
  },
  thumbnail: {
    width: ITEM_WIDTH,
    aspectRatio: 2 / 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: HomeColors.surfaceGold,
  },
  itemText: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  title: { color: HomeColors.text },
  more: { color: HomeColors.goldStrong },
  itemName: { color: HomeColors.text },
  itemSubtitle: { color: HomeColors.textSecondary },
});
