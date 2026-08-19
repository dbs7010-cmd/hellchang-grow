# 플레이어 캐릭터 에셋

규격은 `docs/ASSETS.md`를 따른다.

## 2D (먼저 필요한 것)
- `player-full.png` — PNG / 투명 배경 / 세로 전신 / 권장 1024x2048 (세로:가로 2:1)
- 캐릭터가 canvas 높이의 92% 이상을 채울 것 (투명 여백이 많으면 화면에서 작아 보인다)

넣은 뒤 `src/config/character-assets.ts`의 `PlayerCharacterAssets.home`에 연결한다:

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  home: require('../../../assets/characters/player/player-full.png'),
};
```

history/result 슬롯은 비워두면 home을 그대로 쓴다. 같은 그림이면 파일을 복제하지 않는다.

## 3D (CHARACTER 360용, 나중)
- `player.glb` — Y-up / 정면이 0° / 발밑 중앙이 원점
- 앱은 Y축 수평 회전만 한다 (상하 회전·zoom 없음)
- `PlayerCharacterAssets.model3d`에 연결하고, 렌더러는 360 진입 시 지연 로딩한다
