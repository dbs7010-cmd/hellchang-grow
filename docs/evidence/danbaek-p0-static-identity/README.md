# DANBAEK VALUE TRAIN 1 / P0 — PRODUCTION STATIC IDENTITY (증거 번들)

BASE: `integration/rebuild-app-after-recovery @ 18f2ca1d88fa2767be7ff9b93e9fc40dc232dec4`

목적: **확정 Lv.1 CANON reference**와 **현재 neutral production renderer**를 동일한 200×280 CANON
좌표계에서 실제로 비교하고, 증거가 확인한 neutral body contour 차이만 최소 수정한다.
이 작업은 단백이를 새로 디자인하는 작업이 아니다.

**결과: 소스 코드 변경 0줄.** 관측된 차이가 전부 STOP 조건(고정 신장 / 사지 길이 / 신규 구조 /
LOCKED 자산)에 걸린다. 판정은 아래 "판정" 절에 있다.

## 비교 대상

| | 파일 | 상태 |
|---|---|---|
| reference | `assets/characters/danbaek/canon/reference_v3/levels/danbaek-lv01.png` (320×512 RGBA) | `locked-reference`, canonVersion 3 |
| renderer | `src/config/character-body-config.ts` + `src/utils/character-body-geometry.ts` (모든 BodyParameters = 0) | production |
| stage0 master | `assets/characters/danbaek/canon/layered/danbaek_stage0_layered_master.svg` | `LOCKED_DERIVATIVE` |

## 방법 (재현 가능)

1. `tools/build-neutral-svg.js`가 production 소스에서 neutral 렌더를 **그대로 추출**한다
   (`neutral-renderer.svg`). 손으로 그린 좌표는 하나도 없다. transform 문자열과
   `NeutralDanbaekBodyParameters`가 전부 0이라는 사실은 추출 시점에 assert한다 —
   소스가 바뀌면 스크립트가 실패한다.
2. `tools/server.js` + `tools/index.html`을 브라우저로 열면 세 입력을 모두 200×280 CANON
   프레임에 래스터화하고(4× supersample), alpha 마스크로 bbox / 행별 폭 / 행별 run을 측정한다.
3. reference 정규화는 **uniform scale + translation만** 사용한다 (축별 stretch 없음).
   - Anchor A (기본): **고정 정체성인 머리**. head/face는 모든 레벨에서 고정이라 두 이미지에서
     같은 것을 뜻한다고 보장되는 유일한 부위다. 여기에 맞춰야 *몸통 contour* 차이만 남는다.
   - Anchor B (교차 확인): 전신 bbox 높이 + 중심.
4. 모든 수치는 `metrics.json`에 CANON 단위로 남는다.

재현:

```bash
node docs/evidence/danbaek-p0-static-identity/tools/build-neutral-svg.js . docs/evidence/danbaek-p0-static-identity/tools/out/neutral-renderer.svg
```

그다음 `node docs/evidence/danbaek-p0-static-identity/tools/server.js .`를 띄우고
`http://localhost:4599/`를 연다. 산출물은 `tools/out/`에 저장된다.

## 증거

| 파일 | 내용 |
|---|---|
| `E01-reference-normalized.png` | Lv.1 reference, 머리 기준 정규화 후 CANON 프레임 |
| `E01b-…-figure-anchored.png` | 같은 reference, 전신 bbox 기준 정규화 (교차 확인) |
| `E02-renderer-neutral.png` | 현재 production neutral 렌더 |
| `E03-overlay-50-50.png` | 50/50 겹침 |
| `E04-silhouette-difference.png` | 실루엣 차이 — 회색 일치 / 파랑 renderer만 / 빨강 reference만 |
| `E04b-…-figure-anchored.png` | 같은 차이, 전신 기준 정규화 |
| `E05-contour-comparison.png` | 외곽선 비교 + CANON 랜드마크 눈금 |
| `E06-fixed-identity-comparison.png` | 고정 정체성(머리/얼굴)만 나란히 + 겹침 |
| `E07-renderer-vs-layered-stage0.png` | renderer vs LOCKED layered Stage 0 master |
| `E08-whatif-…-without-stage0-squash.png` | read-only what-if: `scaleY=1`이면 어떻게 되는가 |
| `E08b-whatif-nosquash-vs-reference.png` | 그 what-if와 reference의 차이 |
| `metrics.json` | 모든 수치 (bbox / 머리 / 랜드마크 행 / 행별 run / 폭 프로파일) |

## 측정 결과 (CANON 단위)

머리 폭을 맞춘 상태(uniform scale 2.867, stretch 없음):

| 항목 | renderer | reference Lv.1 |
|---|---|---|
| 전신 bbox | y 36.5 → 221.0 (높이 184.75) | y 36.25 → 279.75+ (높이 243.75, 프레임 하단에서 잘림) |
| 머리 폭 | 43.0 | 43.5 (정규화 후) |
| 머리 높이 | 38.75 | 44.75 |
| 신장/머리 비율 | **4.77 heads** | **6.16 heads** |
| 머리폭 / 전신폭 | 0.656 | 0.451 |
| 프레임 사용률 | 0.66 (하단 58.75 비어 있음) | 하단까지 채움 |

일치도(IoU):

- 머리(고정 정체성): **0.9495** — 사실상 일치
- 몸통 이하: **0.5219**
- 전신: 0.5701 (머리 기준) / 0.6036 (전신 기준)
- **renderer vs LOCKED layered Stage 0 master: 0.9940**

행별 run (`metrics.json > rowRuns`)이 구조 차이를 그대로 보여준다:

| y | renderer | reference |
|---|---|---|
| 140 | `[67.25 … 132.5]` (팔이 몸통에 붙어 한 덩어리) | `[63.25…78] [80.5…119] [122…136.25]` (팔이 몸통에서 떨어져 있음) |
| 168 | `[82.5 … 117.25]` (팔 없음, 폭 35) | `[57.75…70.25] [78.25…121.75] [130…142.5]` (아직 팔 + 손, 골반 폭 43.5) |
| 235 | `[]` (다리 끝남) | `[70.5…89.25] [110…129]` (종아리) |
| 252 | `[]` | `[68.5…89.5] [110…131.75]` (발) |

## 차이 분류

**A. 일치 — 수정 불필요 (고정 정체성)**
머리 윤곽, 눈 위치/간격, 입. head IoU 0.9495, 랜드마크 y=57에서 폭 43.0 vs 43.5 (Δ 0.5).
→ **fixed head/face conflict 없음.**

**B. neutral body contour — 허용 범위 내 수정 가능?**
상완/어깨 외곽이 reference보다 넓다 (E04의 파란 영역, y=86에서 Δ −29.5, y=100에서 Δ −6).
그러나 이 차이를 줄여도 reference에 수렴하지 않는다 — reference의 팔은 **몸통에서 떨어져
있고 35 단위 더 길다**. 폭만 줄이면 지금 캐릭터가 마르기만 할 뿐 CANON에 가까워진다는
증거가 없다. 증거 없이 좁히는 것은 "감으로 재디자인"이고 브리프가 금지한다.
→ **증거가 확인한 단독 수정 가능 항목 없음.**

**C. 구조적 비례 — STOP (신장 / 사지 길이)**
- 신장/머리 비율 4.77 vs 6.16. 머리는 고정이므로 맞추려면 **몸이 커져야 한다** = 신장 변경.
- 팔 길이: renderer는 y≈150에서 끝나고 reference는 y≈185까지 내려온다.
- 다리 길이: renderer는 y=221에서 끝나고 reference는 279.75+까지 간다.
- `stage0BodyProportion.scaleY = 0.8`의 세로 압축이 여기에 직접 기여한다. what-if로
  `scaleY=1`을 넣어 봤을 때(E08) 높이는 220.5, 5.76 heads가 되지만 IoU는 0.5701 → 0.5984로
  **+0.028밖에 오르지 않는다.** 남은 차이는 압축이 아니라 형태 자체다.
  → 압축을 푸는 것만으로 해결되지 않으면서, `scaleY`는 LOCKED master가 동일하게 갖고 있는 값이다.

**D. 없는 구조 — STOP (신규 geometry = 재디자인)**
reference에는 있고 renderer에는 아예 없는 것: **목**, **손**, **발**, 골반의 하의 라인.
승인된 region 밖에 새 형상을 만드는 것이므로 `PART_PATH_SPEC.md`가 금지한다.

**E. CANON 권위 충돌 — APPROVAL REQUIRED**
renderer는 LOCKED layered Stage 0 master를 **IoU 0.994로 충실히 구현**하고 있다.
즉 어긋난 것은 renderer가 아니라, 두 LOCKED 자산이 서로 다른 몸을 정의하고 있다:

- `layered/danbaek_stage0_layered_master.svg` (LOCKED_DERIVATIVE, 런타임 계약) — 4.77 heads, 목/손/발 없음
- `reference_v3/levels/danbaek-lv01.png` (locked-reference, canonVersion 3) — 6.16 heads, 목/손/발 있음

게다가 `scripts/verify-character-body.ts`는 Stage 0 torso path를 layered master와 **문자열
단위로 고정**해 두었다("Stage 0 uses the restored layered master torso path verbatim").
neutral base path를 건드리는 순간 이 계약이 깨진다.

## 판정

**STOP — CANON CONFLICT (APPROVAL REQUIRED).** 코드 변경 없음.

P0의 전제("증거가 확인한 neutral body contour 차이만 최소 수정")가 성립하지 않는다.
차이는 contour 수준이 아니라 신장·사지 길이·없는 구조 수준이고, 어느 경로로 좁히든
브리프의 STOP 조건과 LOCKED 자산 변경에 걸린다.

사용자 판정이 필요한 선택지:

1. **layered Stage 0 master를 reference_v3 Lv.1에 맞춰 다시 만든다.**
   런타임 계약(base paths, seam anchor, approved region, `verify:character-body`,
   `maxDelta`)을 전부 다시 잡아야 한다. 가장 정확하지만 P0 범위가 아니다.
2. **reference_v3를 "아트 방향 참고"로 격하하고 layered master를 실제 CANON으로 둔다.**
   코드 변경 0이지만 `manifest.json`의 `canonVersion: 3` / `master` 지정과 충돌한다.
3. **현 상태 유지 + 충돌을 기록만 하고 진행한다.** (이 문서가 그 기록이다.)

셋 다 제품 방향 결정이라 임의로 고르지 않는다.
