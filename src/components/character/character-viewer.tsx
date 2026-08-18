import { useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CharacterAngleLabels, CharacterAngles } from '@/config/character-assets';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GenderExpression } from '@/types/user';

export interface CharacterViewerProps {
  visible: boolean;
  onClose: () => void;
  genderExpression: GenderExpression;
  size: number;
  tone: number;
}

/** 뷰어의 캐릭터는 홈보다 커야 한다 — 다만 placeholder 도형이 흐려지지 않게 상한을 둔다. */
const MAX_VIEWER_SCALE = 1.6;

/**
 * 캐릭터 360도 뷰어. 진짜 3D가 아니라 방향별 이미지 slot(front/front-side/side/back-side/back)을
 * 가로 스와이프로 넘기는 구조 — CharacterSilhouette가 각 슬롯을 그린다.
 *
 * 하단 표시는 의미 없는 page dot이 아니라 "지금 어느 방향을 보고 있는지"를 그대로 보여주는
 * 회전 상태 트랙이다 (dot만 있으면 사진 carousel로 오해된다). 각 방향은 눌러서 바로 갈 수 있다.
 *
 * 캐릭터는 실제 페이지 높이를 재서 그 높이에 맞춰 확대된다 — placeholder든 실제 아트든
 * 레이아웃이 흔들리지 않는다.
 */
export function CharacterViewer({ visible, onClose, genderExpression, size, tone }: CharacterViewerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const screenWidth = Dimensions.get('window').width;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setPageIndex(Math.max(0, Math.min(CharacterAngles.length - 1, index)));
  };

  const handlePagerLayout = (event: LayoutChangeEvent) => {
    setPageHeight(event.nativeEvent.layout.height);
  };

  const goToAngle = (index: number) => {
    setPageIndex(index);
    scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const characterScale =
    pageHeight > 0 ? Math.min(MAX_VIEWER_SCALE, pageHeight / CharacterIntrinsicHeight) : 1;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <ThemedView type="backgroundDeep" style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText type="smallBold">캐릭터 360°</ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕ 닫기
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          onLayout={handlePagerLayout}
          style={styles.pager}>
          {CharacterAngles.map((angle) => (
            <View key={angle} style={[styles.page, { width: screenWidth }]}>
              <CharacterSilhouette
                genderExpression={genderExpression}
                size={size}
                tone={tone}
                angle={angle}
                idle={false}
                scale={characterScale}
              />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
          {/* 회전 상태 트랙 — 현재 방향이 어디인지 그대로 읽힌다. */}
          <View style={styles.angleTrack}>
            {CharacterAngles.map((angle, index) => {
              const active = index === pageIndex;
              return (
                <Pressable
                  key={angle}
                  onPress={() => goToAngle(index)}
                  hitSlop={6}
                  style={[
                    styles.angleChip,
                    active && { backgroundColor: theme.backgroundSelected, borderColor: theme.gold },
                  ]}>
                  <ThemedText
                    type="caption"
                    themeColor={active ? 'text' : 'textSecondary'}
                    style={active ? { color: theme.gold } : undefined}>
                    {CharacterAngleLabels[angle]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            드래그해서 돌려보기
          </ThemedText>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingX,
    paddingVertical: Spacing.three,
  },
  pager: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Layout.screenPaddingX,
  },
  angleTrack: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  angleChip: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
