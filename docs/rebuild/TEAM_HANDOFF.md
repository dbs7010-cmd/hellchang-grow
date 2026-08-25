# REBUILD TEAM HANDOFF

Status: READY-TO-START PREP

## Claude — APP TEAM command

### Goal
Rebuild the visible fitness-app side around the constitution: Stanley teaches the player; Danbaek watches the player's real workout, imitates it, and learns. Prepare the APP side to emit the frozen DanbaekLearningProfile contract without changing Danbaek World internals.

### Read first
1. `docs/rebuild/REBUILD_CONSTITUTION.md`
2. `docs/rebuild/SHARED_CONTRACT.md`
3. existing Workout Core / session / result / PT / growth / storage implementation
4. current device screenshots and current HOME/session/result flows if available locally

### Current state
- Stable rebuild base originates from `feat/v1-monetization-foundation` at `e67adf3`.
- Home-gym experiment PR #2 is closed and must not be merged as product direction.
- Existing verified workout/session/growth infrastructure should be reused.
- Existing visible UI is subject to major rebuild.
- Previous Danbaek visual CANON is reopened; do not independently invent final art. Character Bible 2.0 will be supplied by Director/art track.

### Scope — first APP vertical slice
1. Audit relevant existing files and produce KEEP/REUSE/REPLACE/DELETE map.
2. Implement or prepare a domain adapter that derives contract-compatible learning evidence from valid completed workout records, without changing WorkoutRecord semantics.
3. Reframe the first workout experience so Danbaek can visibly observe/imitate at the presentation layer using placeholders if final art is not ready.
4. Result must be able to communicate what Danbaek learned from that real workout.
5. Provide a route from a future WORLD block payload back to Stanley/workout selection.

### Forbidden
- No Danbaek World stage engine.
- No home-gym-centered meta revival.
- No generic combat-power system.
- No edits to shared contract without STOP + proposal.
- No redesign of Workout Core/GrowthEngine/BodyState/PR/session integrity unless a proven blocker is documented.
- Do not call placeholder graphics CANON.

### Success conditions
- Valid real workout data can deterministically produce learning evidence.
- Cancelled/invalid/UI-only activity cannot create learning.
- APP can display observe → imitate → learned feedback without duplicating workout truth.
- Existing PT remains functional and is structurally positioned as teacher of the player.
- tsc/lint/relevant verify pass.

### Verification
Run existing CI-equivalent checks plus new focused tests for learning adapter/idempotency/invalid-session exclusion.

### Report format
- STATUS: DONE / BLOCKED / EXPERIMENTAL
- Files changed
- Existing code reused
- Contract inputs/outputs
- Tests run and exact results
- Risks
- Next APP task
- Any USER DECISION REQUIRED

### Stop conditions
Stop only for constitution/contract conflict, destructive migration, or genuine user product decision. Solve ordinary implementation errors independently.

---

## ChatGPT — WORLD TEAM + DIRECTOR command

### Goal
Build the Danbaek World foundation independently against the frozen read-only learning contract and maintain integration governance.

### Scope — first WORLD vertical slice
1. Define stage data model and deterministic PASS/BLOCK evaluator.
2. Build a tiny representative path, not a content-heavy game:
   - introductory pass stage
   - movement-family gate
   - explicit specific-exercise special stage (Bench Monster) only if justified
3. Block result must identify missing/weak learning and produce an actionable recommendation payload for APP.
4. No manual RPG grind. Adventure advances automatically until pass/block.
5. Add contract tests proving WORLD cannot create learning evidence.

### Forbidden
- No imports from Workout Core/GrowthEngine/BodyState repositories.
- No writing WorkoutRecord or learning evidence.
- No generic power score shortcut.
- No final art until Character Bible 2.0 is locked.

### Success conditions
Given the same DanbaekLearningProfile, stage evaluation is deterministic. Improving the relevant APP-provided learning stage changes BLOCK → PASS without any WORLD-side grinding.

---

## Integration gate 1

Do not merge team branches together until both can demonstrate this scenario against the same contract:

1. Profile A has insufficient `push_horizontal` learning.
2. WORLD reaches a push gate and returns BLOCK.
3. APP can translate that block into Stanley/workout guidance.
4. Profile B represents additional valid real push training.
5. WORLD receives Profile B and passes the same gate.
6. No world action altered Profile A into Profile B.

That is the first proof that the new product loop exists technically.
