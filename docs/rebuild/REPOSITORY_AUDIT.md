# REPOSITORY REBUILD AUDIT v1

Status: FOUNDATION AUDIT COMPLETE

This audit classifies the current stable baseline for the rebuild. It is deliberately conservative: preserve proven truth/integrity code, replace product presentation, and quarantine superseded experiments.

## KEEP / PROTECT

These areas are infrastructure or validated domain truth. Reuse first; change only with concrete blocker evidence.

- `src/data/workout-repository.ts`
- `src/data/workout-session-repository.ts`
- `src/data/session-completion-repository.ts`
- `src/services/growth/**`
- `src/utils/workout-session.ts`
- `src/utils/workout-session-result.ts`
- `src/utils/growth-*`
- `src/utils/body-*`
- `src/types/workout*.ts`
- `src/types/session-completion.ts`
- `src/types/growth.ts`
- `src/types/body-state.ts`
- storage/recovery infrastructure
- PR/history integrity utilities
- existing verification scripts for workout/session/growth/body/storage/PT/release

Reason: these are the best available source of real-workout truth and already have focused verification coverage.

## REUSE / ADAPT

- `src/config/exercises.ts`: canonical existing exercise IDs and animation families. Use as source for learning mapping; do not create a parallel exercise DB.
- `src/config/motion-families.ts`: reuse where useful for imitation animation semantics; do not force it to equal the new learning taxonomy.
- `src/utils/exercise-spec.ts`: reuse exercise resolution.
- `src/utils/exercise-history.ts`: candidate evidence source; APP team must confirm semantics before learning adapter.
- `src/utils/pt-context.ts`, `recommendation-context.ts`, trainer services: preserve PT truth and reframe Stanley as teacher in new UX.
- `src/components/character/character-motion-stage.tsx` and workout motion utilities: reuse mechanics if compatible with Character Bible 2.0; visual output is not CANON.
- common UI primitives (`primary-button`, screen wrappers, cards, progress primitives): reuse selectively, restyle under new visual system.
- onboarding data capture/profile validation: preserve useful inputs, rebuild presentation/sequence.

## REPLACE / MAJOR REBUILD

- `src/app/(tabs)/index.tsx` HOME presentation
- `src/app/(tabs)/trainer.tsx` visible trainer experience
- `src/app/ai-chat.tsx` visible PT-to-workout handoff presentation
- `src/app/session.tsx` presentation layer around the protected session mechanics
- workout result/growth reveal presentation
- onboarding visible experience
- tab/navigation information architecture if needed for one coherent fitness-game flow
- theme/visual language that currently splits HOME and utility screens
- Danbaek visible character rendering and expression system

Rule: replacing presentation must not duplicate or fork the protected domain truth underneath.

## KEEP FUNCTION, REASSESS PLACEMENT

- History
- Settings
- notifications
- pass/subscription/entitlement surfaces
- exercise detail/select
- routine editing

These remain useful V1 app capabilities but must not dominate the first-10-minute game fantasy.

## REOPENED / NOT CANON DURING REBUILD

Everything under `assets/characters/danbaek/canon/` is historical reference, not current rebuild CANON until Character Bible 2.0 is approved. Do not delete it yet; it is evidence for proportions/growth experiments and may supply reusable technical geometry.

Specifically reopened:
- old Lv.1–10 visual stages
- old face/proportion presentation
- old animation canon
- old renderer map
- old layered master appearance

## EXPERIMENTAL / QUARANTINED

- Closed Home Gym PR #2 and its economy/progression values.
- Old game-stage/combat concepts inconsistent with one-way Danbaek World learning validation.
- Any generic combat-power abstraction.

## REMOVE LATER, NOT NOW

Expo/template residue and obsolete art should be cleaned only after the new asset manifest and app icon/splash direction are fixed. Do not perform broad deletion during foundation work because it creates noise and rollback risk.

## Exercise-ID evidence confirmed

Existing DB already contains stable IDs required for the first contract path, including:
- `bench-press`, `push-up`, `incline-bench-press`, `dumbbell-bench-press`, `chest-press-machine` → horizontal push candidates
- `lat-pulldown`, `pull-up`, `straight-arm-pulldown` → vertical pull candidates
- `barbell-row`, `dumbbell-row`, `seated-cable-row`, `machine-row`, `t-bar-row`, `face-pull` → horizontal pull candidates
- `squat`, `hack-squat`, `lunge` → squat candidates
- `romanian-deadlift`, `hip-thrust`, `deadlift` → hinge candidates
- `overhead-press`, `dumbbell-shoulder-press`, `machine-shoulder-press` → vertical push candidates

No new IDs should be invented when an existing ID represents the exercise.

## Foundation conclusion

The repository does NOT require a ground-up rewrite. The correct surgery is:

PROTECT workout truth + storage + validated engines
→ ADD frozen learning boundary
→ REBUILD visible product/character experience
→ ADD isolated Danbaek World
→ INTEGRATE through contract only.
