# SESSION UX AUDIT

Status: CURRENT

## Locked UX direction
- A routine is a recommendation, never a forced sequence.
- Any routine exercise can be selected at any time.
- Switching exercises preserves completed and pending sets.
- Skipped exercises are unfinished, not failed.
- Incomplete routine items never block workout completion.
- Danbaek reacts to the exercise the player actually performs, not to a prescribed order.

## Current implementation audit
The session domain already exposes direct exercise selection through `setCurrentSessionExercise`, and the active screen already renders direct exercise chips. The underlying state model therefore does not require a redesign for free navigation.

The presentation currently creates sequential bias through three overlapping mechanisms: `운동 n/N`, previous/next arrows, and a dedicated `다음 · ... / 넘어가기` row. These imply mandatory order even though direct selection already exists.

## Minimal implementation target
1. Promote the full routine exercise list as the primary `운동 선택` navigation control near the current exercise.
2. Replace mandatory-sequence copy with neutral progress information.
3. Remove redundant previous/next arrows.
4. Remove the dedicated next-exercise row.
5. Keep set completion as the dominant CTA.
6. Preserve automatic rest, persistence, effective-set accounting, rewards, Growth Engine, BodyState and BodyParameters unchanged.
7. Keep manual rest subordinate to the normal automatic-rest path.
8. Keep one deliberate end confirmation; never require all routine exercises to be completed.

## Verification gate before main
- TypeScript/build check.
- Start a session with a routine and without one.
- Switch A -> C -> A and verify set state is preserved.
- Switch away with an unfinished pending set and return.
- Complete a set and verify immediate persistence + automatic rest.
- Skip rest and continue.
- Add an exercise mid-session and select it.
- End with unfinished routine exercises.
- Back navigation preserves the active session.
- Result/Growth accounting remains unchanged.

Do not merge this UX pass to `main` until these checks are satisfied or explicitly recorded as unverified.