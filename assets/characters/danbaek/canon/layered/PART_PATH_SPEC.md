# Danbaek PART PATH SPEC — LOCKED DERIVATIVE

이 문서는 기존 단백이 CANON을 임의 재디자인하지 않고 부위별 독립 성장을 구현하기 위한 **명시적 좌표/분리 승인 명세**다. 기존 `stages/danbaek_stage_01.svg`의 Stage 0 형상을 기준 좌표계로 사용한다.

## 공통 좌표계
- viewBox: `0 0 200 280`
- 성장 중 고정: head/eyes/mouth
- 외곽선: `#111`, 3px, round cap/join
- body fill: `#fff`

## Stage 0 seam anchors
- neck/torso top: `(78,78)` / `(122,78)`
- left arm root: `(80,86)`
- right arm root: `(120,86)`
- pelvis left/right: `(85,168)` / `(115,168)`
- left leg root: `(87,168)`
- right leg root: `(113,168)`
- center line: `x=100`

이 anchor는 부위별 성장 중 연결점으로 유지한다. 파트가 커져도 root/seam을 임의 이동하지 않는다.

## 승인된 부위 영역
Renderer는 아래 사각 영역 내부에서만 해당 부위를 변형할 수 있다.

- chest: `x 72..128 / y 86..116`
- shoulder: `x 56..144 / y 78..112`
- arm: `x 50..150 / y 86..168`
- back: `x 62..138 / y 96..150`
- waist: `x 76..124 / y 128..174`
- abs: `x 86..114 / y 108..160`
- glute: `x 74..126 / y 154..184`
- thigh: `x 68..132 / y 168..220`
- calf: `x 76..124 / y 214..258`

## 변형 규칙

### chestScale
가슴 영역 안에서만 좌우 폭과 CANON 가슴선을 증가시킨다. 어깨 root, 허리 폭, 팔 root는 이동시키지 않는다.

### shoulderScale
어깨 영역에서 torso 상단 좌우 폭을 증가시킨다. 목/머리는 고정하며 arm root는 seam anchor를 유지한 채 외측 곡률만 증가시킨다.

### armScale
좌우 팔을 독립된 좌우 대칭 파트로 취급한다. `(80,86)` / `(120,86)` root는 고정하고 팔 중앙부의 외측 곡률/폭만 증가시킨다.

### backWidth / backThickness
정면 Renderer에서는 lat 외측 폭과 등/광배 암시선을 사용한다. backWidth는 `back` 영역 외곽 폭, backThickness는 세부선 강도에만 사용한다. 허리/가슴을 함께 키우지 않는다.

### waistScale
`waist` 영역 내부의 x축 국소 scale만 허용한다. pelvis seam과 chest/shoulder 영역은 변경하지 않는다.

### abdomenDefinition / definition
복부 크기를 키우는 값이 아니다. CANON의 중앙선/복근 분리선을 단계적으로 표시한다. 낮은 값에서는 숨기고 높은 값에서만 선명도를 증가시킨다.

### gluteScale
pelvis seam을 유지하고 glute 영역 내 곡률만 변화시킨다. thigh root를 밀어내지 않는다.

### thighScale
각 다리 root를 고정하고 168..220 구간의 외측 곡률/폭만 증가시킨다.

### calfScale
214..258 구간만 변화한다. 무릎 위 thigh 형상은 변경하지 않는다.

### overallMass
개별 파트 성장 위에 적용되는 제한된 보정값이다. 머리는 제외하며 몸 전체 최대 추가 scale은 18%를 넘지 않는다. 개별 부위 차이를 지우는 전신 일괄 확대용으로 사용하지 않는다.

### fatSoftness
근육 크기가 아니라 세부 근육선 opacity를 낮추고 곡률을 부드럽게 하는 값이다.

## Stage 1~10 해석
기존 `stages/danbaek_stage_01.svg` ~ `danbaek_stage_10.svg`는 각 부위가 최대 어느 정도까지 커질 수 있는지 확인하는 **시각 상한/검증 레퍼런스**다. 단일 부위 변화 시 전신 stage 파일로 교체하지 않는다.

## 구현 승인 범위
Codex는 이 문서의 region/seam 규칙을 사용해 기존 Stage 0 path를 국소적으로 분리/변형해도 된다. 이것은 CANON 재해석이 아니라 **명시적으로 승인된 구현용 path 분리**다.

단, 아래는 금지한다.
- approved region 밖에 새로운 근육 돌출 생성
- 머리/얼굴 성장
- 새로운 장식/의상 추가
- 실사/3D/graphite/geometric 스타일 변환
- 한 부위 증가를 전신 full-body stage 교체로 처리

## 검증
각 파라미터를 단독으로 최소→최대로 바꿨을 때 해당 approved region 외 실루엣이 변하지 않아야 한다. 전체 최대 상태는 기존 Lv.10 CANON의 방향과 크기 상한을 넘지 않는다.
