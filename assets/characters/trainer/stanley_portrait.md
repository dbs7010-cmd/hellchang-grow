# 스탠리(트레이너) 에셋

사용자에게 보이는 이름은 항상 **스탠리**다. ('골드썬', '골드썬-스탠리'는 쓰지 않는다.)

규격은 `docs/ASSETS.md`를 따른다.

- `stanley_portrait.png` — PNG / 투명 또는 뉴트럴 배경 / 3:4 세로 / 권장 768x1024
- 얼굴 + 상체 중심. 슬롯이 cover crop이라 얼굴은 가로 중앙 60% 안에 둘 것
- 정사각형으로 중앙 크롭해도 얼굴이 살아 있어야 한다 (말풍선 옆 원형 아바타 재사용)

**HOME에는 스탠리 전신을 쓰지 않는다** — 말풍선 옆 포트레이트만 노출한다.
전신/hero 아트가 필요하면 트레이너 화면 전용으로 따로 둔다.

넣은 뒤 `src/config/character-assets.ts`:

```ts
export const StanleyPortraitImage: ImageSourcePropType | undefined =
  require('../../../assets/characters/trainer/stanley_portrait.png');
```
