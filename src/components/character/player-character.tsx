import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterAssetSlot, resolveCharacterAsset } from '@/config/character-assets';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface PlayerCharacterProps {
  appearance: CharacterAppearance;
  /** 어느 화면에서 쓰는지. 슬롯별 에셋이 없으면 메인(home) 캐릭터로 떨어진다. */
  slot: CharacterAssetSlot;
  /**
   * 캐릭터를 담을 높이(px). 실제 에셋은 이 높이 안에서 contain으로 맞춰지고,
   * placeholder는 같은 비율로 축소된다. 0이면(측정 전) 아직 그리지 않는다.
   */
  height: number;
  /** 미세한 breathing idle. 작은 프리뷰나 정지 화면에서는 끈다. */
  idle?: boolean;
}

/**
 * HOME / HISTORY / RESULT가 공유하는 단 하나의 플레이어 캐릭터 렌더러.
 *
 * 화면마다 placeholder 코드를 복사하지 않게 하려고 둔다 — 각 화면은 slot과 height만 다르게
 * 주고, "실제 에셋이 있으면 이미지, 없으면 중립 실루엣"이라는 판단은 여기 한 곳에만 있다.
 * 그래서 실제 2D 에셋을 넣을 때 고칠 파일은 config/character-assets.ts 하나뿐이다.
 *
 * 레이아웃 계약: 바깥에서 준 height를 넘지 않는다. 에셋 교체로 화면이 밀리지 않는다.
 */
export function PlayerCharacter({ appearance, slot, height, idle = false }: PlayerCharacterProps) {
  const asset = resolveCharacterAsset(slot);

  if (height <= 0) return null;

  if (asset) {
    // contain이라 투명 여백이 있어도 잘리지 않는다. 다만 여백이 많으면 캐릭터가 그만큼
    // 작아 보이므로, 에셋 자체의 여백 규격을 docs/ASSETS.md에서 제한한다.
    return <Image source={asset} style={[styles.image, { height }]} contentFit="contain" />;
  }

  // 실제 에셋이 없을 때의 중립 placeholder. 완성 에셋처럼 보이는 임시 이미지를 쓰지 않는다.
  // 도형 rig는 고정 픽셀 크기라 height에 맞춰 축소한다. 1을 넘겨 확대하지는 않는다 —
  // placeholder를 원본보다 크게 늘리면 조잡해 보인다.
  return (
    <View style={[styles.placeholder, { height }]}>
      <CharacterSilhouette
        genderExpression={appearance.genderExpression}
        size={appearance.size}
        tone={appearance.tone}
        idle={idle}
        scale={Math.min(1, height / CharacterIntrinsicHeight)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
  },
  placeholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
