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
| `src/config/battle-stages.ts` | Stage 정의 데이터 + 조회 | `types/battle` |
| `src/utils/battle.ts` | **순수 resolver** | `types/battle`만 |
| `src/utils/battle-state.ts` | 저장값 정규화/마이그레이션 | `types/battle` |
| `src/utils/battle-input.ts` | **경계(adapter)** — 완료된 운동 → BattleInput | workout 타입/헬퍼 + `types/battle` |
| `src/data/battle-repository.ts` | AsyncStorage 영속화 | 기존 repository 패턴 |

`utils/battle.ts`는 Workout/Growth/BodyState/Character를 **import하지 않는다**.
그 경계는 verify가 소스 텍스트로 직접 확인한다. 운동 데이터를 아는 곳은 adapter 하나뿐이다.

### 진행 규칙

- 진행도는 완료 세트 수 + 볼륨(1000kg당 1)로 계산한다. 새 운동 계산식을 만들지 않고
  completion pipeline이 이미 확정한 `completedSets` / `totalVolumeKg`를 그대로 쓴다.
- **한 번의 resolution에서 stage는 최대 1단계만 오른다.** 넘친 진행도는 버리지 않고
  다음 stage로 이월한다 — `GrowthConfig.stage.maxStagesPerSession`과 같은 규칙이다.
- 이월분이 다음 stage 요구치를 넘더라도 그 자리에서 또 올리지 않는다. 다음 운동에 반영된다.
- 마지막 stage에서는 더 오르지 않고 진행도만 쌓인다.

### 피로도

- 0~100으로 항상 clamp. NaN/Infinity/음수는 0으로 떨어진다.
- **게임 쪽 피로도다.** 실제 recovery/nutrition/DanbaekBodyState와 무관하며 그쪽을 바꾸지 않는다.

### 멱등성

- `lastResolvedWorkoutId`가 같으면 `duplicate`로 끝난다 — 진행도 0, 피로도 0, stage 그대로.
- 앱을 재시작해도 저장된 state에서 같은 판단이 나온다.

### 완료 파이프라인과의 관계

Battle은 **completion pipeline 밖**에 있다. `runSessionCompletion` / `SessionCompletionReceipt`
어느 것도 Battle을 알지 못하고, Battle 저장이 실패해도 롤백할 트랜잭션 자체가 없다.
그래서 Battle 실패는 구조적으로 WorkoutRecord/Growth/XP/streak을 되돌릴 수 없다.

재시도는 `syncCompletedWorkoutToBattle()`이 맡는다 — 멱등하므로 언제 몇 번을 불러도 안전하고,
실패해도 예외를 던지지 않고 결과 객체로 알린다. 화면 연결은 다음 slice에서 정한다.
