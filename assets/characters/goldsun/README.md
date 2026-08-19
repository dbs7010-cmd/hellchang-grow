# 스탠리 포트레이트 에셋

(폴더명 goldsun은 내부 이름이고, 사용자에게 보이는 이름은 "스탠리"다.)

규격은 `docs/ASSETS.md`를 따른다.

- `stanley-portrait.png` — PNG / 투명 또는 뉴트럴 배경 / 3:4 세로 / 권장 768x1024
- 얼굴 + 상체 중심. 슬롯이 cover crop이라 얼굴은 가로 중앙 60% 안에 둘 것
- 정사각형으로 중앙 크롭해도 얼굴이 살아 있어야 한다 (원형 아바타 재사용)

넣은 뒤 `src/config/character-assets.ts`:

```ts
export const StanleyPortraitImage: ImageSourcePropType | undefined =
  require('../../../assets/characters/goldsun/stanley-portrait.png');
```
