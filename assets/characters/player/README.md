# 플레이어 캐릭터 에셋

규격은 `docs/ASSETS.md`를 따른다.

V1은 **단일 아바타 한 장**이다. 운동 기록으로 전신이 자동으로 커지는 성장 단계
(stage1~stage5) 이미지는 쓰지 않는다.

## 2D (먼저 필요한 것)

- `player_main.png` — PNG / 투명 배경 / 세로 전신 / 권장 1024x2048 (세로:가로 2:1)
- 캐릭터가 canvas 높이의 92% 이상을 채울 것 (투명 여백이 많으면 화면에서 작아 보인다)

넣은 뒤 `src/config/character-assets.ts`에 연결한다:

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  home: require('../../../assets/characters/player/player_main.png'),
};
```

`history` / `result` 슬롯은 비워두면 `home`을 그대로 쓴다. 같은 그림이면 파일을 복제하지 않는다.

**파일을 실제로 넣기 전에는 require를 추가하지 않는다** — 없는 파일을 require하면 번들이 깨진다.

## 3D (CHARACTER 360용, 나중)

- `player_main.glb` — Y-up / 정면이 0° / 발밑 중앙이 원점
- 앱은 Y축 수평 회전만 한다 (상하 회전·zoom 없음)
- `PlayerCharacterAssets.model3d`에 연결하고, 렌더러는 360 진입 시 지연 로딩한다

TODO(character-body-parts): 실제 3D 모델 단계에서 chest / back / shoulders / arms / legs
부위별 파라미터를 검토한다. V1에서는 구현하지 않는다.
