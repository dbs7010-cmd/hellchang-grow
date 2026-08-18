import { useState } from 'react';
import { Dimensions, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterAngleLabels, CharacterAngles } from '@/config/character-assets';
import { GymTheme, Spacing } from '@/constants/theme';
import { GenderExpression } from '@/types/user';

export interface CharacterViewerProps {
  visible: boolean;
  onClose: () => void;
  genderExpression: GenderExpression;
  size: number;
  tone: number;
}

/**
 * 캐릭터 360도 뷰어. 진짜 3D 대신 방향별 이미지 slot(front/front-side/side/back-side/back)을
 * 가로 스와이프로 넘기는 구조 — CharacterSilhouette가 각 슬롯을 그린다.
 */
export function CharacterViewer({ visible, onClose, genderExpression, size, tone }: CharacterViewerProps) {
  const insets = useSafeAreaInsets();
  const [pageIndex, setPageIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setPageIndex(Math.max(0, Math.min(CharacterAngles.length - 1, index)));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            캐릭터 360°
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText type="smallBold" style={styles.closeText}>
              ✕ 닫기
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.pager}>
          {CharacterAngles.map((angle) => (
            <View key={angle} style={[styles.page, { width: screenWidth }]}>
              <CharacterSilhouette genderExpression={genderExpression} size={size} tone={tone} angle={angle} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {CharacterAngles.map((angle, index) => (
              <View
                key={angle}
                style={[styles.dot, index === pageIndex && styles.dotActive]}
              />
            ))}
          </View>
          <ThemedText type="small" style={styles.angleLabel}>
            {CharacterAngleLabels[CharacterAngles[pageIndex]]}
          </ThemedText>
          <ThemedText type="small" style={styles.hint}>
            드래그해서 돌려보기
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerTitle: {
    color: GymTheme.text,
  },
  closeText: {
    color: GymTheme.textSecondary,
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
    gap: Spacing.one,
    paddingBottom: Spacing.five,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GymTheme.border,
  },
  dotActive: {
    backgroundColor: GymTheme.gold,
  },
  angleLabel: {
    color: GymTheme.gold,
    marginTop: Spacing.one,
  },
  hint: {
    color: GymTheme.textSecondary,
  },
});
