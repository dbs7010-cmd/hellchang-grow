# GYM BATTLE CORE v1

Base: ebd578402711318410d7e35b11e6936069848aca
Pending Work CANON commit: 5404243baf97b3d37e85dac4aa5bc06c8c94dc56

Loop: real workout -> existing growth -> workout completion -> battle resolution -> stage progress -> fatigue -> next workout.

Battle is downstream only. It cannot redesign WorkoutSession, Exercise DB, Routine, set UX, Growth Engine, muscle SP/stages, DanbaekBodyState, BodyParameters, real-body data, or character rendering.

Until 5404243 is on main, character CANON/face/assets/SVG/geometry/PlayerCharacter/appearance files are read-only on this branch.

BattleState stores game-side currentStage, stageProgress, fatigue and lastResolvedWorkoutId only. BattleResolution is deterministic and idempotent per completed workout id. Battle loss/failure never invalidates a completed workout or earned growth.

First slice: domain + deterministic resolver + persistence boundary + verification. No large battle UI and no new network/LLM/ads/purchase dependency.

Merge order: push 5404243 to main first; then rebase/merge this branch; preserve CANON v3; run full verification and web export.

---

## v1에서 확정한 규칙

아래는 첫 slice에서 코드와 `scripts/verify-battle-core.ts`로 함께 고정한 결정이다.
바뀌면 코드보다 이 문서를 먼저 고친다.

### 레이어

| 파일 | 역할 | 의존 |
|---|---|---|
| `src/types/battle.ts` | 도메인 타입 | 없음 |
| `src/config/battle-config.ts` | 진행 규칙 숫자(전투력/피로도/보상) | 없음 |
| `src/config/battle-stages.ts` | Stage = 적 정의 + 조회 | `types/battle` |
| `src/utils/battle-power.ts` | 전투력·피로도 패널티·회복 (순수) | config + `types/battle` |
| `src/utils/battle.ts` | **순수 resolver** | Battle 도메인만 |
| `src/utils/battle-state.ts` | 저장값 정규화/마이그레이션 | `types/battle` |
| `src/utils/battle-input.ts` | **경계(adapter)** — 완료된 운동 → BattleInput | workout 타입/헬퍼 + `types/battle` |
| `src/data/battle-repository.ts` | AsyncStorage 영속화 | 기존 repository 패턴 |

`utils/battle.ts`는 Workout/Growth/BodyState/Character를 **import하지 않는다**.
그 경계는 verify가 소스 텍스트로 직접 확인한다. 운동 데이터를 아는 곳은 adapter 하나뿐이다.

### 전투 구조

한 번의 **완료된 운동 = 한 번의 전투**다. 전투 중 추가 입력도, 운동 중 Battle UI도 없다.
Stage 하나가 곧 적 하나이고, `progressRequired`가 적의 HP다. **적 HP를 따로 저장하지 않는다** —
`stageProgress`가 누적 피해이고 남은 HP는 `progressRequired - stageProgress`다.

### Battle Power

```
base = 유효 세트 × 2 + floor(sqrt(볼륨 / 100))
피해 = max(1, floor(base × 피로도 배수))     // base가 0이면 0
```

- **세트 항**을 기본 축으로 두는 이유: 맨몸/0kg 운동도 정상적인 전투력이 나와야 한다.
- **볼륨에 제곱근**을 쓰는 이유: 중량만 높은 사용자가 선형으로 앞서 나가지 않게. 볼륨이
  4배가 되어야 이 항이 2배가 된다.
- **횟수(reps)는 쓰지 않는다**: 시간 기반 운동이 `reps`에 초를 저장하므로 그대로 더하면
  45초 플랭크가 벤치 10회보다 4배 강해진다. 유효 세트 판정은 기존 운동 규칙이 이미 끝냈다.
- 새 운동 계산식을 만들지 않는다. completion pipeline이 확정한 `completedSets` /
  `totalVolumeKg`, 저장된 기록에서는 기존 통계 헬퍼를 그대로 쓴다.

### 진행 규칙

- 한 번에 못 잡으면 피해가 누적돼 다음 운동에서 이어진다.
- **한 번의 resolution에서 stage는 최대 1단계만 오른다.** 넘친 피해는 버리지 않고
  다음 적에게 이월한다 — `GrowthConfig.stage.maxStagesPerSession`과 같은 규칙이다.
- 이월분이 다음 적 HP를 넘더라도 그 자리에서 또 잡지 않는다. 다음 운동에 반영된다.
- 마지막 stage에서는 더 오르지 않고 피해만 쌓인다.

### 피로도

- 0~100으로 항상 clamp. NaN/Infinity/음수는 0으로 떨어진다.
- **게임 쪽 피로도다.** 실제 recovery/nutrition/DanbaekBodyState와 무관하며 그쪽을 바꾸지 않는다.
- 구간별 전투력 배수: 0~39 ×1.0 / 40~69 ×0.9 / 70~89 ×0.8 / 90~100 ×0.7.
  최대 감소는 30%이고 **운동했다면 피해는 최소 1** — "피로도 때문에 전투력 0"은 만들지 않는다.
- 패널티는 **전투 전** 피로도로 계산한다. 이번 운동으로 쌓인 피로가 그 운동을 소급해서
  약하게 만들지 않는다.
- 회복은 순수 함수(`recoverBattleFatigue(fatigue, elapsedHours)`)와 정책만 정의했다.
  resolver는 시계를 읽지 않으므로 흐른 시간은 호출부가 넘긴다. **앱 lifecycle 연결은 다음 slice.**

### 보상

- **기존 XP / streak / Muscle SP를 Battle이 다시 지급하지 않는다.** 완전히 별개의 게임 재화다.
- 매 전투: 준 피해 1당 coin 1. stage clear: + `stage.reward.clearCoins`, 해금 토큰(있으면).
- 중복 운동은 coin도 토큰도 0.
- **BattleState에 저장하지 않는다** — 상점/인벤토리가 없는 지금 저장하면 쓰지도 못할 스키마만
  굳는다. v1은 `BattleResolution.reward` 계약까지이고, 저장은 인벤토리 slice의 몫이다.

### 적 / 보스

- v1 콘텐츠는 5 stage(일반 4 + 보스 1). 구조 검증이 목적이라 더 늘리지 않는다.
- `enemyId`는 표현과 분리된 안정적 ID다. 이미지/이름이 붙거나 바뀌어도 저장된 진행도가
  어긋나지 않는다. 이름은 임시 콘텐츠이고 ID만 계약이다.
- `enemyType: 'normal' | 'boss'`가 확장 지점이다. 별도의 보스 엔진은 만들지 않는다.

### 멱등성

- `lastResolvedWorkoutId`가 같으면 `duplicate`로 끝난다 — 진행도 0, 피로도 0, stage 그대로.
- 앱을 재시작해도 저장된 state에서 같은 판단이 나온다.

### 완료 파이프라인과의 관계

Battle은 **completion pipeline 밖**에 있다. `runSessionCompletion` / `SessionCompletionReceipt`
어느 것도 Battle을 알지 못하고, Battle 저장이 실패해도 롤백할 트랜잭션 자체가 없다.
그래서 Battle 실패는 구조적으로 WorkoutRecord/Growth/XP/streak을 되돌릴 수 없다.

재시도는 `syncCompletedWorkoutToBattle()`이 맡는다 — 멱등하므로 언제 몇 번을 불러도 안전하고,
실패해도 예외를 던지지 않고 결과 객체로 알린다. 화면 연결은 다음 slice에서 정한다.
