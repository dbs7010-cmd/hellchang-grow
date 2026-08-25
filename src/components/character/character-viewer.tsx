import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Character3DViewerProps,
  CharacterFrontRotationDeg,
  CharacterRotationDegreesPerPixel,
  normalizeRotationDeg,
} from '@/components/character/character-3d-viewer';
import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { hasPlayerCharacterModel } from '@/config/character-assets';
import { Layout, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import type { DanbaekBodyParameters } from '@/types/body-state';

export type CharacterViewerProps = Character3DViewerProps;
const MAX_VIEWER_SCALE = 1.6;

/**
 * CHARACTER 360 presentation shell.
 *
 * V1 has no real 3D model, so the fallback must show the SAME current Danbaek body as HOME rather
 * than a neutral Stage-0 body. The gesture contract remains isolated here and does not alter growth,
 * BodyState, or the canonical renderer geometry.
 */
export function CharacterViewer({ visible, onClose, genderExpression, size, tone }: CharacterViewerProps) {
  const insets = useSafeAreaInsets();
  const { bodyParameters } = useAppData();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <ThemedView type="backgroundDeep" style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText type="smallBold">단백이 보기</ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText type="smallBold" themeColor="textSecondary">✕ 닫기</ThemedText>
          </Pressable>
        </View>

        {visible && (
          <CharacterStage
            genderExpression={genderExpression}
            size={size}
            tone={tone}
            bodyParameters={bodyParameters}
          />
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
          <ThemedText type="small" themeColor="textSecondary">드래그해서 살펴보기</ThemedText>
        </View>
      </ThemedView>
    </Modal>
  );
}

function CharacterStage({
  genderExpression,
  size,
  tone,
  bodyParameters,
}: Pick<Character3DViewerProps, 'genderExpression' | 'size' | 'tone'> & {
  bodyParameters: DanbaekBodyParameters;
}) {
  const [baseRotationDeg, setBaseRotationDeg] = useState(CharacterFrontRotationDeg);
  const [dragDeltaDeg, setDragDeltaDeg] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          setDragDeltaDeg(gesture.dx * CharacterRotationDegreesPerPixel);
        },
        onPanResponderRelease: (_event, gesture) => {
          setBaseRotationDeg((previous) =>
            normalizeRotationDeg(previous + gesture.dx * CharacterRotationDegreesPerPixel)
          );
          setDragDeltaDeg(0);
        },
        onPanResponderTerminate: () => setDragDeltaDeg(0),
      }),
    []
  );

  const rotationYDeg = normalizeRotationDeg(baseRotationDeg + dragDeltaDeg);
  const characterScale =
    stageHeight > 0 ? Math.min(MAX_VIEWER_SCALE, stageHeight / CharacterIntrinsicHeight) : 1;

  return (
    <View
      style={styles.stage}
      onLayout={(event: LayoutChangeEvent) => setStageHeight(event.nativeEvent.layout.height)}
      {...panResponder.panHandlers}>
      {hasPlayerCharacterModel() ? null : (
        <CharacterSilhouette
          genderExpression={genderExpression}
          size={size}
          tone={tone}
          bodyParameters={bodyParameters}
          rotationYDeg={rotationYDeg}
          idle={false}
          scale={characterScale}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingX,
    paddingVertical: Spacing.three,
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { alignItems: 'center', paddingHorizontal: Layout.screenPaddingX },
});
