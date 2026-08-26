# SESSION FREE NAVIGATION — ATOMIC INTEGRATION PLAN

Status: CURRENT

## Why this is atomic
`session.tsx` currently exposes three navigation metaphors at once: positional status (`운동 n/N`), previous/next arrows plus `다음/넘어가기`, and direct exercise chips. The domain already supports direct selection, so the product change is presentation-only. All sequential presentation must be removed in one change; leaving half of it behind preserves the false mandatory-order mental model.

## Replace together
1. Remove positional `운동 n/N` status copy from ACTIVE.
2. Remove previous/next arrows from the current-exercise header.
3. Remove the dedicated `다음 · exercise / 넘어가기` row.
4. Remove the duplicate raw exercise `ChipRow`.
5. Mount `SessionExerciseSelector` as the single primary exercise-navigation surface.
6. Build its items with `buildSessionExerciseNavigation(activeSession)`.
7. `onSelect` calls existing `setCurrentSessionExercise(entryId)` only.

## Preserve exactly
- `completeSessionSet` persistence semantics.
- automatic rest and absolute rest deadline.
- pending/completed set state owned by the session domain.
- `addExerciseToSession` behavior.
- pause/resume.
- back-navigation active-session preservation.
- zero-effective-set discard path.
- `endWorkoutSession` and reward/growth accounting.
- set-complete Danbaek feedback timing.

## REST decision
Do not add a second navigation implementation to REST in this atomic pass. First prove ACTIVE free navigation and state preservation. Codex reliability audit decides whether REST switching is already safe at the domain level. If safe, reuse the same selector component in REST; do not create a REST-specific selector.

## Product semantics
- Routine order is recommendation metadata only.
- Unfinished is not failed.
- A completed exercise remains selectable.
- Switching does not auto-complete, auto-skip, or mutate another exercise.
- No "next exercise" is privileged by the UI.

## Verification gate
Before integration candidate:
- presentation model assertions pass;
- selector contract assertions pass;
- integration preservation assertions pass;
- TypeScript/lint pass;
- A -> C -> A state preservation is verified by Codex or an equivalent automated test;
- set complete -> automatic rest remains unchanged;
- unfinished B does not block ending A/C workout;
- actual viewport confirms selector does not crowd the Set CTA.
