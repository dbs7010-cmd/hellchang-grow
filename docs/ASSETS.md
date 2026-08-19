# 에셋 규격

이 문서는 "파일을 어디에 두고, 어떤 규격으로 만들고, 어느 코드에 연결하는가"만 정한다.
에셋을 넣을 때 화면 코드는 고치지 않는다 — 전부 registry 한 곳만 채우면 반영된다.

| 종류 | registry | 없을 때 |
|---|---|---|
| 플레이어 캐릭터 2D (성장 5단계) | `PlayerCharacterAssets.growth` | 단일 슬롯 → 중립 도형 실루엣 |
| 플레이어 캐릭터 2D (단일) | `PlayerCharacterAssets.home / history / result` | 중립 도형 실루엣 |
| 플레이어 캐릭터 3D (성장 5단계) | `PlayerCharacterAssets.growthModels3d` | `model3d` → 2D 실루엣을 회전 |
| 스탠리 포트레이트 | `src/config/character-assets.ts` → `StanleyPortraitImage` | 중립 이모지 |
| 운동 썸네일 | `src/config/exercise-assets.ts` → `ExerciseImages` | 중립 이모지 |

---

## 1. 플레이어 캐릭터 2D

`assets/characters/player/`

- **포맷**: PNG, **투명 배경** (배경/바닥/그림자 굽지 않음 — 그림자는 앱이 그린다)
- **구도**: 세로형 **전신**, 정면
- **권장 canvas**: `1024 x 2048` (**세로:가로 = 2:1**)
  - 앱은 높이 기준 `contain`으로 맞춘다. 가로가 더 긴 이미지는 높이가 남아 캐릭터가 작아 보인다.
- **여백**: 캐릭터가 canvas 높이의 **92% 이상**을 채울 것. 상하 여백 각각 4% 이내.
  - 투명 여백이 많으면 `contain` 때문에 그만큼 캐릭터가 작아진다. 크롭은 앱이 하지 않는다.
- **잘림 금지 영역**: 머리 끝 ~ 발끝. 캐릭터가 canvas 밖으로 나가면 안 된다.
- **가장 크게 보이는 곳**: HOME character stage.
  실측 기준 stage 높이는 **412×915에서 약 486px**, 360×800에서 약 371px.
  → 2배 밀도 기준 세로 **1024px 이상**이면 충분하다. 그 이상은 용량만 늘어난다.
- **파일 크기**: 슬롯당 300KB 이하 권장 (앱 시작·탭 전환 부담을 줄인다)

### 화면 슬롯

| 슬롯 | 쓰이는 곳 | 표시 높이 |
|---|---|---|
| `home` | HOME 캐릭터 stage, 온보딩 시작 화면 | stage 높이 (약 371~486px) / 260px |
| `history` | 히스토리 [몸 변화] 미니 프리뷰 | 96px |
| `result` | 운동 완료(RESULT) HERO | 150px |

**같은 그림이면 파일을 복제하지 말 것.** 포즈가 달라질 때만 슬롯을 따로 채운다.

### 성장 5단계 (우선 채울 것)

캐릭터는 `stage1`~`stage5`의 5단계로 성장한다. 단계는
`src/utils/character-growth-resolver.ts`가 운동 누적 + HELL PASS + 사용자가 입력한 체성분
변화를 종합해 정한다 (체중 같은 단일 수치로는 절대 단계가 바뀌지 않는다).

**파일명** — `assets/characters/player/`

```
char_male_stage1.png   char_female_stage1.png
char_male_stage2.png   char_female_stage2.png
char_male_stage3.png   char_female_stage3.png
char_male_stage4.png   char_female_stage4.png
char_male_stage5.png   char_female_stage5.png
```

규격은 위의 2D 규격(투명 PNG / 세로 전신 / 1024×2048 / 여백 8% 이내)과 **완전히 동일**하다.
5장이 같은 canvas·같은 카메라 거리·같은 발 위치를 써야 단계가 바뀔 때 캐릭터가 튀지 않는다.

**단계 간 동일성 규칙 (중요)**

5단계는 "다른 캐릭터"가 아니라 **같은 사람의 몸이 변한 것**이다. 아래는 5장 내내 고정한다:

- 얼굴 (이목구비, 인상, 표정)
- 헤어 스타일 / 헤어 컬러
- 피부톤
- 복장 컨셉과 색 (같은 옷차림)
- 포즈, 카메라 각도, 발 위치, 캐릭터 높이

단계별로 **바뀌는 것만** 바뀐다: 체지방량, 근육량과 근육 선명도, 실루엣 두께.
stage1은 운동을 막 시작한 몸, stage5는 오래 훈련한 몸이다. 얼굴이나 헤어가 바뀌면
사용자는 "내 캐릭터가 성장했다"가 아니라 "캐릭터가 교체됐다"로 읽는다.

**연결 지점** — `src/config/character-assets.ts`

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  growth: {
    male: {
      stage1: require('../../assets/characters/player/char_male_stage1.png'),
      stage2: require('../../assets/characters/player/char_male_stage2.png'),
      // ... stage5까지
    },
    female: { /* char_female_stageN.png */ },
  },
};
```

일부 단계만 채워도 된다. 해당 조합이 비어 있으면 단일 슬롯(`home`)으로, 그것도 없으면
중립 실루엣으로 떨어진다 — **가까운 다른 단계로 대체하지 않는다**(엉뚱한 단계를 보게 되므로).

---

## 2. 플레이어 캐릭터 3D (CHARACTER 360)

`assets/characters/player/`

- **포맷**: `.glb` 권장 (단일 파일), `.gltf` 가능
- **축**: Y-up. 정면이 `rotationY = 0°`
- **회전**: 앱은 **Y축 수평 회전만** 한다. 상하 회전·zoom 없음 → 위/아래에서 볼 일이 없으므로 그쪽 디테일에 예산을 쓰지 않아도 된다.
- **카메라**: 앱이 고정한다. 모델에 카메라를 넣지 않아도 된다.
- **원점**: 발밑 중앙(0, 0, 0). 회전축이 몸 중심을 지나야 돌 때 흔들리지 않는다.
- **체형 반영**: `CharacterAppearance`의 `size` / `tone`(각 0–100)을 blend shape / morph target으로 받을 수 있게 만든다.
- **로딩**: CHARACTER 360에 들어갈 때만 로딩한다. HOME은 3D를 건드리지 않는다.

### 성장 5단계 GLB

2D와 **같은 성장 단계**로 고른다. 2D 5장과 같은 몸 변화를 3D로 옮긴 것이어야 하고,
얼굴/헤어/복장 동일성 규칙도 똑같이 적용된다.

**파일명** — `assets/characters/player/`

```
char_male_stage1.glb   char_female_stage1.glb
char_male_stage2.glb   char_female_stage2.glb
char_male_stage3.glb   char_female_stage3.glb
char_male_stage4.glb   char_female_stage4.glb
char_male_stage5.glb   char_female_stage5.glb
```

5개 모델은 **같은 리그·같은 키·같은 원점**을 공유해야 단계가 바뀔 때 회전 중심이 흔들리지 않는다.
(한 모델에 5개 morph target으로 넣는 방식도 가능하다 — 그 경우 `model3d` 하나만 채우고
`CharacterAppearance.growthStage`를 morph 가중치로 넘기면 된다.)

**연결 지점** — `src/config/character-assets.ts`

```ts
export const PlayerCharacterAssets: PlayerCharacterAssetRegistry = {
  growthModels3d: {
    male: { stage1: require('../../assets/characters/player/char_male_stage1.glb') /* ... */ },
    female: { /* ... */ },
  },
};
```

`resolveCharacterModel(gender, stage)`가 단계별 → 단일(`model3d`) 순으로 고른다.
렌더러 연결 순서는 `src/components/character/character-3d-viewer.ts`의 `TODO(character-3d)` 참고.

---

## 3. 스탠리 포트레이트

`assets/characters/goldsun/` (폴더명은 내부 이름이라 그대로 둔다)

- **포맷**: PNG. 투명 배경 또는 뉴트럴 단색 배경
- **비율**: **3:4 세로** (현재 UI 슬롯 96×128과 동일). 권장 `768 x 1024`
- **구도**: 얼굴 + 상체 중심
- **crop safe area**: 슬롯이 `contentFit="cover"`라 좌우가 잘릴 수 있다.
  얼굴이 **가로 중앙 60% 안**에 들어오게 할 것. 머리 위 여백 8% 이상.
- 대화 말풍선 옆 원형 아바타로도 재사용될 수 있으므로, 정사각형으로 중앙 크롭했을 때 얼굴이 살아 있어야 한다.

---

## 4. 운동 썸네일

`assets/exercises/`

- **비율**: **16:10 가로** (`ExerciseArtSlot` 기본값). 권장 `800 x 500`
- 리스트에서는 44×44 정사각으로도 쓰인다 → **중앙 정사각 크롭에 동작이 남아 있어야 한다**
- **파일 크기**: 개당 80KB 이하 권장 (운동 DB가 45개라 합계가 커진다)
- 배경은 있어도 된다. 다만 어두운 그래파이트 UI 위에 얹히므로 너무 밝은 흰 배경은 피한다.

---

## 다음 에셋 작업 순서

1. **플레이어 캐릭터 2D 5단계** (`PlayerCharacterAssets.growth`) — HOME/HISTORY/RESULT가 한 번에 바뀐다
   (급하면 `home` 한 장부터 넣어도 동작한다)
2. **스탠리 포트레이트** (`StanleyPortraitImage`) — 트레이너 화면 HERO
3. **운동 썸네일** (`ExerciseImages`) — 운동 찾기/상세/세션
4. **플레이어 캐릭터 3D 5단계** (`PlayerCharacterAssets.growthModels3d`) — CHARACTER 360, 렌더러 도입 포함
