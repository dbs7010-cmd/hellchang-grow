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
| `src/utils/battle-power.ts` | 전투력·피로도 패널티·회복량 (순수) | config + `types/battle` |
| `src/utils/battle-recovery.ts` | 시간 경과 회복 반영 (순수, 시계 미사용) | config + power + state |
| `src/utils/battle.ts` | **순수 resolver** | Battle 도메인만 |
| `src/utils/battle-state.ts` | 저장값 정규화/마이그레이션 | `types/battle` |
| `src/utils/battle-input.ts` | **경계(adapter)** — 완료된 운동 → BattleInput | workout 타입/헬퍼 + `types/battle` |
| `src/utils/battle-state.ts` | 저장 문서 정규화 + 결과 반영(순수) | config + `types/battle` |
| `src/utils/battle-sync.ts` | **단일 트랜잭션 경계** (화면이 부를 유일한 API) | Battle 도메인만 |
| `src/data/battle-repository.ts` | AsyncStorage 영속화 (키 하나) | 기존 repository 패턴 |

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
- 회복 정책은 시간당 2. 아래 "시간 경과 회복" 참고.

### 보상

- **기존 XP / streak / Muscle SP를 Battle이 다시 지급하지 않는다.** 완전히 별개의 게임 재화다.
- 매 전투: 준 피해 1당 coin 1. stage clear: + `stage.reward.clearCoins`, 해금 토큰(있으면).
- 중복 운동은 coin도 토큰도 0.
- 재화는 정수 0 이상이며 상한이 있다(overflow 안전장치). 토큰은 문자열만, 중복 제거.
- 토큰은 아직 무엇과도 교환하지 않는다 — 획득/저장/중복 방지까지가 v1이고, 소비(꾸미기·
  HOME 발전)는 표현과 무관한 ID로 남겨 둔다.

### 저장과 exactly-once

**전투 진행과 재화를 한 문서(`BattleProgressionState`)에 담아 키 하나로 쓴다.**

저장소가 주는 원자성 단위는 "키 하나 쓰기"뿐이다. 진행도와 재화를 다른 키로 나누면 그
사이에서 앱이 죽었을 때 한쪽만 반영된 상태가 남는다 — 보상이 영원히 사라지거나(state만
저장됨 → 다음엔 duplicate) 두 번 들어간다(재화만 저장됨 → 다음에 재판정). 한 문서면
"둘 다" 또는 "둘 다 아님"만 존재한다.

그래서 **별도의 BattleCompletionReceipt도, 무한히 쌓이는 `claimedWorkoutIds`도 만들지
않는다.** 중복 판단은 같은 문서 안의 `battle.lastResolvedWorkoutId` 하나로 끝나고,
피해·피로도·stage·재화·토큰이 전부 그 한 번의 쓰기에 함께 실린다.

- 쓰기 실패 → 문서는 통째로 이전 상태. 같은 운동으로 다시 부르면 정확히 한 번 반영된다.
- 읽기 실패 → 아무것도 하지 않는다(`progression: null`). 모르는 상태 위에 쓰지 않는다.
- 저장된 값이 옛 스키마(경제가 없던 시절의 BattleState)여도 진행도를 잃지 않는다.
- Stage clear 이력은 만들지 않는다 — `currentStage`로 충분하고, 없어도 되는 상태를
  중복해서 관리하지 않는다.

### 시간 경과 회복

`fatigueUpdatedAt`(epoch ms) 하나만 문서에 더 둔다 — 저장된 피로도가 정확했던 시각이다.

- **타이머를 돌리지 않는다.** background task도 interval도 없다. 읽거나 전투할 때 그동안
  흐른 시간을 계산해 그 자리에서 반영하는 lazy materialization이다. 앱이 꺼져 있어도
  시간은 흐르므로 오프라인 회복이 그냥 따라온다(60 → 10시간 뒤 40).
- **정수 단위로 쌓고 자투리는 기준 시각에 남긴다.** 피로도 1이 쌓일 만큼(30분) 지나야
  실제로 깎이고, 남은 시간은 `fatigueUpdatedAt`에 그대로 남는다. 그래서 29분마다 앱을
  열었다 닫아도 87분 뒤 회복량은 한 번에 87분 기다린 것과 같고, 조회할 때마다 값이
  흔들리거나 저장이 일어나지 않는다.
- **회복 공식은 하나뿐이다.** 깎는 양은 기존 `recoverBattleFatigue`가 정하고, 여기서
  다시 만들지 않는다.
- 기준 시각 갱신: 전투로 피로도가 오르면 그때로, 회복을 반영해 저장하면 **소비한 만큼만**
  앞으로. 중복 전투는 아무것도 바꾸지 않으므로 기준도 그대로다.

**시계가 이상할 때** — 기준이 없으면(첫 실행/손상) 회복 없이 지금을 기준으로 삼는다.
기준이 미래면(기기 시간이 뒤로 감) 회복은 0이고 기준을 지금으로 당긴다 — 그대로 두면
실제 시간이 따라잡을 때까지 회복이 영영 멈춘다. 흐른 시간은 음수가 될 수 없으므로 회복이
피로도를 **늘리는 일은 없다**. NaN/Infinity/음수/0/문자열 시각은 전부 "모름"으로 떨어진다.

회복 저장에 실패해도 잃어버리지 않는다 — 기준 시각이 그대로 남아 다음 조회에서 같은
회복이 다시 계산된다.

### 공개 API

화면은 두 함수만 부른다.

- `syncCompletedWorkoutToBattle(input, { loadProgression, saveProgression }, nowMs)`
  — 회복 · 판정 · 진행도 저장 · 보상 저장이 한 번에 끝난다.
- `loadRecoveredBattleProgression(operations, nowMs)` — 전투 없이 현재 피로도만 조회
  (그동안의 회복 반영). 바뀐 것이 있을 때만 저장한다.

resolveBattle / recover / saveState / addCoins / saveToken을 각각 부르게 하지 않는다.
트랜잭션 경계는 domain/data 쪽에 있다. **시계는 이 경계에서만 주입된다** — 도메인은
`Date.now`를 읽지 않는다. 표시용 파생값은 `describeBattleFatigue(progression, nowMs)`가
따로 계산한다(저장하지 않는다).

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
