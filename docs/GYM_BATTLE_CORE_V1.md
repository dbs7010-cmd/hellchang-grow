# GYM BATTLE CORE v1

Base: ebd578402711318410d7e35b11e6936069848aca
Pending Work CANON commit: 5404243baf97b3d37e85dac4aa5bc06c8c94dc56

Loop: real workout -> existing growth -> workout completion -> battle resolution -> stage progress -> fatigue -> next workout.

Battle is downstream only. It cannot redesign WorkoutSession, Exercise DB, Routine, set UX, Growth Engine, muscle SP/stages, DanbaekBodyState, BodyParameters, real-body data, or character rendering.

Until 5404243 is on main, character CANON/face/assets/SVG/geometry/PlayerCharacter/appearance files are read-only on this branch.

BattleState stores game-side currentStage, stageProgress, fatigue and lastResolvedWorkoutId only. BattleResolution is deterministic and idempotent per completed workout id. Battle loss/failure never invalidates a completed workout or earned growth.

First slice: domain + deterministic resolver + persistence boundary + verification. No large battle UI and no new network/LLM/ads/purchase dependency.

Merge order: push 5404243 to main first; then rebase/merge this branch; preserve CANON v3; run full verification and web export.
