import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterAssetSlot, resolveCharacterAsset } from '@/config/character-assets';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { CharacterAppearance } from '@/utils/character-appearance';

export interface PlayerCharacterProps {
  appearance: CharacterAppearance;
  /** 어느 화면에서 쓰는지. 슬롯별 에셋이 없으면 메인(home) 캐릭터로 떨어진다. */
  slot: CharacterAssetSlot;
  /**
   * 캐릭터를 담을 높이(px). 실제 에셋은 이 높이 안에서 contain으로 맞춰지고,
   * placeholder는 같은 비율로 축소된다. 0이면(측정 전) 아직 그리지 않는다.
   *
   * fill 모드에서는 실제 에셋 경로가 이 값을 쓰지 않는다 (placeholder 대비용으로만 남는다).
   */
  height: number;
  /**
   * true면 부모가 준 박스를 높이·너비 모두 꽉 채운다 (flex:1 + contain).
   *
   * 홈처럼 "남는 공간을 전부 캐릭터에 준다"는 화면용이다. 측정값(height)에 의존하지 않아서
   * onLayout이 늦게 오거나 안 오는 플랫폼에서도 캐릭터가 작아지지 않는다.
   * contain이라 박스를 넘지 않으므로 머리/발이 잘릴 수 없다.
   */
  fill?: boolean;
  /**
   * 성장 상태(BodyState → BodyParameters). 주면 LOCKED CANON Renderer가 승인된 부위별
   * path/근육선/지방 표현을 이 값에서만 읽어 그린다.
   *
   * **없으면 기존 동작 그대로다** (등록된 에셋 이미지 → 없으면 기본 실루엣). 성장 데이터가
   * 없는 화면(온보딩 등)이 예전과 똑같이 보이도록 하기 위한 계약이다.
   *
   * 기존 player_main.png는 CANON이 아니다. 성장 화면은 layered CANON path Renderer를 쓰고,
   * bodyParameters가 없는 기존 슬롯만 registry fallback을 유지한다.
   */
  bodyParameters?: DanbaekBodyParameters | null;
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
/**
 * CANON viewBox를 화면 높이에 맞출 때의 확대 상한.
 */
const MaxBodyScale = 1.2;

export function PlayerCharacter({
  appearance,
  slot,
  height,
  fill = false,
  bodyParameters,
  idle = false,
}: PlayerCharacterProps) {
  const asset = resolveCharacterAsset(slot);

  // 성장 상태가 있으면 layered CANON Renderer로 그린다.
  if (bodyParameters) {
    if (height <= 0) return null;
    return (
      <View style={[fill ? styles.bodyFill : styles.placeholder, { height }]}>
        <CharacterSilhouette
          genderExpression={appearance.genderExpression}
          size={appearance.size}
          tone={appearance.tone}
          bodyParameters={bodyParameters}
          idle={idle}
          scale={Math.min(MaxBodyScale, height / CharacterIntrinsicHeight)}
        />
      </View>
    );
  }

  if (asset) {
    // contain이라 투명 여백이 있어도 잘리지 않는다. 다만 여백이 많으면 캐릭터가 그만큼
    // 작아 보이므로, 에셋 자체의 여백 규격을 docs/ASSETS.md에서 제한한다.
    //
    // fill 모드는 Yoga가 박스 크기를 정하고 contain이 그 안에서 비율을 맞춘다 —
    // JS 측정값이 전혀 개입하지 않으므로 Android/웹이 같은 크기로 나온다.
    if (fill) {
      return <Image source={asset} style={styles.imageFill} contentFit="contain" />;
    }
    if (height <= 0) return null;
    return <Image source={asset} style={[styles.image, { height }]} contentFit="contain" />;
  }

  if (height <= 0) return null;

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
  /** 파라메트릭 바디를 부모 박스 안에서 가운데 정렬한다. */
  bodyFill: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 부모 박스를 통째로 쓴다. 실제 크기는 contain이 이미지 비율(1:2)에 맞춰 정한다. */
  imageFill: {
    flex: 1,
    width: '100%',
  },
  placeholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
