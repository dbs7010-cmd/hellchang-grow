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

export type CharacterViewerProps = Character3DViewerProps;

/** 뷰어의 캐릭터는 홈보다 커야 한다 — 다만 placeholder 도형이 흐려지지 않게 상한을 둔다. */
const MAX_VIEWER_SCALE = 1.6;

/**
 * CHARACTER 360.
 *
 * 최종 사양은 실제 3D 캐릭터 모델을 좌우 드래그로 Y축 연속 회전시키는 뷰어다
 * (components/character/character-3d-viewer.ts에 계약을 적어뒀다).
 * 이 화면은 그 상호작용 계약을 이미 그대로 구현한다:
 *  - 좌우 드래그로만 회전하고, 세로 제스처는 각도에 반영하지 않는다 (상하 회전 금지)
 *  - 카메라(=캐릭터 stage의 크기/위치)는 고정이고 캐릭터만 수평으로 돈다
 *  - 열 때마다 정면(0°)에서 시작한다
 *  - 스냅/페이지/방향 버튼/page dot이 없다 — 각도는 연속값 하나뿐이다
 *  - pinch zoom 없음 (V1 불필요)
 *
 * 지금 최종과 다른 건 "무엇을 그리는가" 하나뿐이다: PlayerCharacterAssets.model3d가 비어
 * 있는 동안 임시 placeholder(CharacterSilhouette)를 같은 각도로 돌려서 보여준다.
 *
 * 3D는 이 화면에서만 쓴다 — 홈/히스토리/결과는 2D 렌더러(PlayerCharacter)만 거치므로
 * 3D 렌더러가 앱 시작이나 탭 전환에 끼어들지 않는다.
 *
 * TODO(character-3d): PlayerCharacterAssets.model3d가 채워지면 CharacterStage 안의
 * placeholder를 Character3DViewer 렌더로 교체한다. 이때 렌더러 모듈은 이 파일 상단에서
 * 정적으로 import하지 말고 뷰어가 열릴 때 지연 로딩해야 홈 진입 비용이 늘지 않는다.
 * 제스처/각도/레이아웃 계약은 그대로 쓴다.
 */
export function CharacterViewer({
  visible,
  onClose,
  genderExpression,
  size,
  tone,
  growthStage,
}: CharacterViewerProps) {
  const insets = useSafeAreaInsets();

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

        {/* visible일 때만 마운트한다 — 그래서 다시 열면 회전 상태가 자연히 정면으로 돌아간다. */}
        {visible && (
          <CharacterStage
            genderExpression={genderExpression}
            size={size}
            tone={tone}
            growthStage={growthStage}
          />
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
          <ThemedText type="small" themeColor="textSecondary">
            드래그해서 돌려보기
          </ThemedText>
        </View>
      </ThemedView>
    </Modal>
  );
}

/**
 * 회전 상태를 들고 있는 무대. 카메라는 고정이므로 이 박스의 크기/위치는 회전과 무관하다.
 *
 * 각도를 "놓은 시점까지 누적된 각도(baseRotation)"와 "지금 드래그 중인 변화량(dragDelta)"으로
 * 나눠서 들고 있는다 — 그래야 제스처 핸들러가 현재 각도를 되읽지 않아도 되고, 손을 뗀 각도가
 * 스냅 없이 그대로 유지된다.
 */
function CharacterStage({
  genderExpression,
  size,
  tone,
  growthStage,
}: Omit<Character3DViewerProps, 'visible' | 'onClose'>) {
  const [baseRotationDeg, setBaseRotationDeg] = useState(CharacterFrontRotationDeg);
  const [dragDeltaDeg, setDragDeltaDeg] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // 가로 이동이 세로보다 클 때만 회전 제스처로 받는다.
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
        // gesture.dx는 잡은 지점부터의 누적 이동이라 dy를 볼 필요가 없다 (상하 회전 금지).
        onPanResponderMove: (_event, gesture) => {
          setDragDeltaDeg(gesture.dx * CharacterRotationDegreesPerPixel);
        },
        onPanResponderRelease: (_event, gesture) => {
          // 스냅하지 않는다 — 놓은 각도가 그대로 유지된다 (방향 슬롯이 아니라 연속 회전).
          setBaseRotationDeg((previous) =>
            normalizeRotationDeg(previous + gesture.dx * CharacterRotationDegreesPerPixel)
          );
          setDragDeltaDeg(0);
        },
        onPanResponderTerminate: () => {
          setDragDeltaDeg(0);
        },
      }),
    []
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setStageHeight(event.nativeEvent.layout.height);
  };

  const rotationYDeg = normalizeRotationDeg(baseRotationDeg + dragDeltaDeg);
  const characterScale =
    stageHeight > 0 ? Math.min(MAX_VIEWER_SCALE, stageHeight / CharacterIntrinsicHeight) : 1;

  return (
    <View style={styles.stage} onLayout={handleLayout} {...panResponder.panHandlers}>
      {hasPlayerCharacterModel(genderExpression, growthStage) ? null : (
        <CharacterSilhouette
          genderExpression={genderExpression}
          size={size}
          tone={tone}
          rotationYDeg={rotationYDeg}
          idle={false}
          scale={characterScale}
        />
      )}
    </View>
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
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
  },
});
