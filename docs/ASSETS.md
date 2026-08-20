# 에셋 규격

이 문서는 "파일을 어디에 두고, 어떤 규격으로 만들고, 어느 코드에 연결하는가"만 정한다.
에셋을 넣을 때 화면 코드는 고치지 않는다 — 전부 registry 한 곳만 채우면 반영된다.

| 종류 | registry | 없을 때 |
|---|---|---|
| 플레이어 캐릭터 2D | `src/config/character-assets.ts` → `PlayerCharacterAssets.home / history / result` | 중립 도형 실루엣 |
| 플레이어 캐릭터 3D | `src/config/character-assets.ts` → `PlayerCharacterAssets.model3d` | 2D 실루엣을 회전 |
| 스탠리 포트레이트 | `src/config/character-assets.ts` → `StanleyPortraitImage` | 중립 이모지 |
| 운동 썸네일 | `src/config/exercise-assets.ts` → `ExerciseImages` | 중립 이모지 |

**파일을 실제로 넣기 전에는 `require`를 추가하지 않는다** — 없는 파일을 require하면 번들이 깨진다.

---

## V1 캐릭터 사양 (중요)

- **single player avatar** — 캐릭터 이미지는 한 장이다.
- **no automatic full-body stage progression** — 운동 기록 / XP / HELL PASS로 전신이 자동으로
  커지는 성장 단계(stage1~stage5)를 쓰지 않는다. 특정 부위만 운동했는데 전신이 같이 커지는
  표현은 실제 운동과 맞지 않는다.
- **real body metrics remain self-reported / trusted-source only** — 체중·체지방률·골격근량은
  사용자가 직접 입력했거나 향후 InBody / Health Connect / wearable 등 신뢰 가능한 소스에서
  들어온 값만 쓴다. 게임 진행도로 이 수치를 만들어내지 않는다.
- 운동 성취감은 캐릭터 몸이 아니라 **HELL PASS / 운동 기록 / streak / 운동 완료 이펙트 /
  (향후) 업적·칭호**로 표현한다.

### Future (구현 전, TODO 수준)

- 실제 3D 모델 단계에 가면 **부위별 progression**을 검토한다:
  chest / back / shoulders / arms / legs를 각각 독립적으로.
- 그때가 되면 `CharacterAppearance`에 부위 파라미터를 더하고 resolver만 고친다 —
  화면과 공통 렌더러는 손대지 않아도 되도록 구조가 이미 잡혀 있다.
- 검토·설계가 끝나기 전까지 어떤 형태로도 구현하지 않는다.

---

## 1. 플레이어 캐릭터 2D

`assets/characters/player/player_main.png`

- **포맷**: PNG, **투명 배경** (배경/바닥/그림자 굽지 않음 — 그림자는 앱이 그린다)
- **구도**: 세로형 **전신**, 정면
- **권장 canvas**: `1024 x 2048` (**세로:가로 = 2:1**)
  - 앱은 높이 기준 `contain`으로 맞춘다. 가로가 더 긴 이미지는 높이가 남아 캐릭터가 작아 보인다.
- **여백**: 캐릭터가 canvas 높이의 **92% 이상**을 채울 것. 상하 여백 각각 4% 이내.
  - 투명 여백이 많으면 `contain` 때문에 그만큼 캐릭터가 작아진다. 크롭은 앱이 하지 않는다.
- **잘림 금지 영역**: 머리 끝 ~ 발끝. 캐릭터가 canvas 밖으로 나가면 안 된다.
- **가장 크게 보이는 곳**: HOME character stage.
  실측 기준 캐릭터 영역 높이는 **412×915에서 490px**, 390×844에서 419px, 360×800에서 375px.
  → 2배 밀도 기준 세로 **1024px 이상**이면 충분하다. 그 이상은 용량만 늘어난다.
- **파일 크기**: 300KB 이하 권장 (앱 시작·탭 전환 부담을 줄인다)

### 화면 슬롯

| 슬롯 | 쓰이는 곳 | 표시 높이 |
|---|---|---|
| `home` | HOME 캐릭터 stage, 온보딩 시작 화면 | 영역 높이 (375~490px) / 260px |
| `history` | 히스토리 [몸 변화] 미니 프리뷰 | 96px |
| `result` | 운동 완료(RESULT) HERO | 150px |

`home` 하나만 채우면 나머지 슬롯이 자동으로 그걸 쓴다 (`resolveCharacterAsset`).
**같은 그림이면 파일을 복제하지 말 것.** 포즈가 달라질 때만 슬롯을 따로 채운다.

**연결 지점** — `src/config/character-assets.ts`

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  home: require('../../assets/characters/player/player_main.png'),
};
```

---

## 2. 플레이어 캐릭터 3D (CHARACTER 360)

`assets/characters/player/player_main.glb`

- **포맷**: `.glb` 권장 (단일 파일), `.gltf` 가능
- **축**: Y-up. 정면이 `rotationY = 0°`
- **회전**: 앱은 **Y축 수평 회전만** 한다. 상하 회전·zoom 없음 → 위/아래에서 볼 일이 없으므로
  그쪽 디테일에 예산을 쓰지 않아도 된다.
- **카메라**: 앱이 고정한다. 모델에 카메라를 넣지 않아도 된다.
- **원점**: 발밑 중앙(0, 0, 0). 회전축이 몸 중심을 지나야 돌 때 흔들리지 않는다.
- **체형 반영**: `CharacterAppearance`의 `size` / `tone`(각 0–100)을 blend shape / morph target으로
  받을 수 있게 만든다.
- **로딩**: CHARACTER 360에 들어갈 때만 로딩한다. HOME은 3D를 건드리지 않는다.

**연결 지점** — `src/config/character-assets.ts`

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  model3d: require('../../assets/characters/player/player_main.glb'),
};
```

렌더러 연결 순서는 `src/components/character/character-3d-viewer.ts`의 `TODO(character-3d)` 참고.
제스처 계약(좌우 드래그 = Y축 연속 회전 / 세로 무시 / 스냅 없음 / 재진입 시 정면 0°)은
그대로 유지한다.

---

## 3. 스탠리 포트레이트

`assets/characters/trainer/stanley_portrait.png`

사용자에게 보이는 이름은 항상 **스탠리**다.

- **포맷**: PNG. 투명 배경 또는 뉴트럴 단색 배경
- **비율**: **3:4 세로** (현재 UI 슬롯 96×128과 동일). 권장 `768 x 1024`
- **구도**: 얼굴 + 상체 중심
- **crop safe area**: 슬롯이 `contentFit="cover"`라 좌우가 잘릴 수 있다.
  얼굴이 **가로 중앙 60% 안**에 들어오게 할 것. 머리 위 여백 8% 이상.
- 대화 말풍선 옆 원형 아바타로도 재사용되므로, 정사각형으로 중앙 크롭했을 때 얼굴이 살아 있어야 한다.

**HOME에는 스탠리 전신을 쓰지 않는다** — 말풍선 옆 포트레이트만 노출한다.
트레이너 화면 hero는 HOME과 분리해서 따로 둔다.

---

## 4. 운동 썸네일

`assets/exercises/`

- **비율**: **16:10 가로** (`ExerciseArtSlot` 기본값). 권장 `800 x 500`
- 리스트에서는 44×44 정사각으로도 쓰인다 → **중앙 정사각 크롭에 동작이 남아 있어야 한다**
- **파일 크기**: 개당 80KB 이하 권장 (운동 DB가 45개라 합계가 커진다)
- 배경은 있어도 된다. 다만 어두운 그래파이트 UI 위에 얹히므로 너무 밝은 흰 배경은 피한다.

---

## 다음 에셋 작업 순서

1. **플레이어 캐릭터 2D 한 장** (`PlayerCharacterAssets.home`) — HOME/HISTORY/RESULT/온보딩이 한 번에 바뀐다
2. **스탠리 포트레이트** (`StanleyPortraitImage`) — 트레이너 화면 HERO + 홈 말풍선 아바타
3. **운동 썸네일** (`ExerciseImages`) — 운동 찾기/상세/세션
4. **플레이어 캐릭터 3D** (`PlayerCharacterAssets.model3d`) — CHARACTER 360, 렌더러 도입 포함
