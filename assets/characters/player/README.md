# 플레이어 캐릭터 에셋

규격은 `docs/ASSETS.md`를 따른다.

## 2D 성장 5단계 (먼저 필요한 것)
char_male_stage1.png ~ char_male_stage5.png (여성은 char_female_stageN.png)
- PNG / 투명 배경 / 세로 전신 / 권장 1024x2048 (세로:가로 2:1)
- 5장은 같은 사람이다: 얼굴·헤어·피부톤·복장·포즈·카메라를 고정하고 체지방/근육만 바꾼다
- 캐릭터가 canvas 높이의 92% 이상을 채울 것 (투명 여백이 많으면 화면에서 작아 보인다)

넣은 뒤 `src/config/character-assets.ts`의 `PlayerCharacterAssets.home`에 연결한다:

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  growth: {
    male: {
      stage1: require('../../../assets/characters/player/char_male_stage1.png'),
      // ... stage5까지
    },
  },
};
```

history/result 슬롯은 비워두면 home을 그대로 쓴다. 같은 그림이면 파일을 복제하지 않는다.

## 3D (CHARACTER 360용, 나중)
char_male_stage1.glb ~ char_male_stage5.glb (여성은 char_female_stageN.glb)
- Y-up / 정면이 0° / 발밑 중앙이 원점 / 5개 모델이 같은 리그·키·원점 공유
- 앱은 Y축 수평 회전만 한다 (상하 회전·zoom 없음)
- `PlayerCharacterAssets.growthModels3d`에 연결하고, 렌더러는 360 진입 시 지연 로딩한다
