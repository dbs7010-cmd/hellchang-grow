# HELCHANG GROW — REBUILD CONSTITUTION v1

Status: LOCKED FOUNDATION
Date: 2026-08-26

## 1. Product thesis

헬창키우기는 단순 운동기록 앱도, 운동량을 캐릭터 스탯으로 환산하는 RPG도 아니다.

핵심 경험:

> 스탠리가 플레이어를 가르친다. 플레이어가 실제로 운동한다. 단백이는 옆에서 플레이어를 관찰하고 모방하며 배운다. 배운 단백이는 단백세상에서 앞으로 모험한다. 배우지 못했거나 학습이 부족한 운동/움직임을 만나면 막힌다. 그 막힘은 다시 현실의 운동 동기로 돌아온다.

Canonical loop:

STANLEY TEACHES PLAYER
→ PLAYER DOES REAL WORKOUT
→ DANBAEK OBSERVES
→ DANBAEK IMITATES
→ DANBAEK LEARNS
→ DANBAEK WORLD AUTO-ADVENTURE
→ PASS OR BLOCK
→ BLOCK EXPLAINS MISSING/WEAK LEARNING
→ REAL WORKOUT
→ RETRY

## 2. Relationship canon

- Stanley = trainer/teacher of the player.
- Player = real human performing and recording workouts.
- Danbaek = separate small being, not a player avatar. Danbaek admires/observes the player and learns by imitation.
- Danbaek World = Danbaek's own world. It validates what Danbaek has learned from the player.
- Emotional target = "내가 이 녀석에게 가르쳐주고 싶다 / 얘가 나를 따라 하는 게 귀엽다 / 다음에는 어디까지 갈까?"

## 3. Directionality — critical invariant

Learning power is ONE-WAY:

REAL WORKOUT → DANBAEK LEARNING → DANBAEK WORLD PROGRESSION

Forbidden:
- Danbaek World grinding must never increase real workout learning/mastery.
- Adventure rewards must never fabricate WorkoutRecords, PRs, sets, weight, reps, or real-body data.
- World code must not directly mutate Workout Core/GrowthEngine/BodyState.

World → App may return only non-workout-power outputs such as story progress, discoveries, cosmetics, memories, presentation rewards, and explicitly approved meta rewards.

## 4. Adventure canon

- Adventure is primarily one-directional stage progression, not a second full manual RPG.
- Danbaek automatically advances through stages using learned capabilities.
- A stage may PASS or BLOCK.
- BLOCK is a feature, not failure punishment. It identifies a missing or insufficiently learned movement capability and routes the player back toward an appropriate real workout.
- Do not reduce BLOCK to generic combat power numbers.
- Prefer movement families over mandatory single exercises so users are not forced into unsafe/inappropriate programming.
- Specific exercise gates are allowed only when the stage concept explicitly depends on that exercise (example: Bench Monster).

Example movement family:
PULL = lat pulldown / pull-up / barbell row / dumbbell row or other approved equivalents.

## 5. Learning presentation

Internal calculation may reuse proven workout/growth data, but player-facing language should emphasize learning and imitation rather than abstract SP.

Preferred qualitative states:
- 처음 봄
- 따라 하는 중
- 배움
- 익숙함
- 능숙함

Do not expose unnecessary numeric complexity unless it materially helps training decisions.

## 6. Character rebuild

Previous Danbaek visual CANON/Lv.1–10 presentation is explicitly reopened for this rebuild.

New design goal:
- instantly recognizable
- cute/odd enough to create attachment without becoming infantile
- readable as a small being that watches and imitates
- expressive through gaze, posture, mistakes, effort, pride, surprise
- remains recognizably Danbaek as physique/skill grows
- supports HOME, workout observation, imitation, result, and adventure contexts

No asset becomes new CANON until Character Bible 2.0 and game insertion QA approve it.

## 7. Preserved engineering core

Preserve by default; change only with explicit conflict evidence:
- Workout Core
- real WorkoutRecord semantics
- set/weight/reps integrity
- PR integrity
- session completion integrity
- proven GrowthEngine calculations
- BodyState/BodyParameters data pipeline
- persistence/recovery protections

These are infrastructure, not the new product fantasy. UI may reinterpret their output without corrupting their semantics.

## 8. Superseded/experimental

- Home-gym-centered meta is not product core.
- PR #2 is CLOSED / EXPERIMENTAL and must not be merged as rebuild baseline.
- 10 coins/workout, starter rack, flat bench progression are not CANON.
- Old stage/combat concepts that conflict with this constitution are superseded.

## 9. Team ownership

### APP TEAM — Claude
Owns:
- onboarding
- HOME
- Stanley PT
- workout/session/result UX
- observation/imitation/learning presentation in the real-app side
- adapters from existing workout data into the shared learning contract
- migration of existing UI

Must not:
- implement Danbaek World internals
- alter shared contract unilaterally
- redesign preserved core without Director approval

### WORLD TEAM — ChatGPT
Owns:
- Danbaek World stage model
- automatic progression
- PASS/BLOCK evaluation against read-only learning contract
- stage/content architecture
- world-side presentation contracts
- adventure result contract

Must not:
- write WorkoutRecords
- alter Workout Core/GrowthEngine/BodyState
- invent independent exercise mastery

### DIRECTOR / INTEGRATION — ChatGPT
Owns:
- constitution
- shared contract
- architecture boundaries
- integration review
- conflict resolution proposals
- CI/merge gates
- status ledger
- final product coherence

User decision required for:
- constitution change
- product fantasy/core-loop change
- irreversible CANON change after new lock
- monetization/core business rule change
- destructive migration

Technical implementation choices inside approved boundaries do not require user interruption.

## 10. Branch model

- rebuild/foundation = constitution/contracts/integration baseline
- rebuild/app = Claude-owned app work (created after foundation gate)
- rebuild/danbaek-world = world work (created after foundation gate)
- rebuild/integration = periodic integration target

Do not wait until release for first integration. Integrate at vertical-slice gates.

## 11. Merge gates

A team branch may enter integration only when:
1. ownership boundary respected
2. shared contract unchanged or separately approved/versioned
3. TypeScript passes
4. lint passes
5. relevant verification passes
6. no WorkoutRecord/PR/session semantic regression
7. no new asset is called CANON without visual QA
8. changed behavior has a concrete acceptance scenario

## 12. Rebuild success condition

The rebuild is not DONE because screens look cleaner or CI passes.

First-10-minute target:
- player understands Stanley teaches them
- player notices Danbaek watching
- a real recorded set causes Danbaek to imitate/learn
- result makes the learning emotionally legible
- Danbaek World visibly uses that learning
- a BLOCK clearly explains what Danbaek has not learned enough
- the player has a natural route back to real exercise
- the product feels like one fitness-game system rather than a fitness app plus attached minigame
