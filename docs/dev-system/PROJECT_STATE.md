# PROJECT STATE

This file is the compact restart point. Update it only when state materially changes.

## LOCKED
- Existing approved Workout Core / effective-set accounting contracts.
- Growth Engine / Muscle SP / BodyState / BodyParameters contracts unless a separately approved migration changes them.
- Danbaek CANON/identity decisions: no unilateral redesign; face/fixed identity authority remains human-approved CANON.
- Session completion/idempotency and persisted reward/accounting semantics must not be silently changed.
- Operating policy: risk-based verification + Value Trains; do not return to per-change full-audit loops.

## DONE
- Foundation reliability work protecting major storage/recovery and completion semantics.
- PR semantics separation: rep PR remains presentation/history evidence; current reward eligibility is explicit rather than prs.length-driven; legacy receipt normalization addressed in the integrated development line.
- Danbaek World First Playable core runtime loop has been reported working end-to-end on the latest local integration candidate: HOME → blocked World gate → real workout → persisted learning/result → World return → gate cleared → next goal.
- First Danbaek World segment now reads as a game situation rather than a status board: a visible gate the player watches Danbaek fail against, a situation-derived CTA, a one-time blocked→cleared reveal on return, and a locked next-path teaser. Return path from Result closes the loop in one tap. Verified in a real 412/375/360 web playtest; `verify:world` covers the seam.

## CURRENT
- None. Pick up the NEXT train.

## NEXT
- Value Train: give the loop a second turn — promote "당기는 길" from a teaser line to a real second segment so clearing the first gate leads into another blocked situation the player wants to solve. Reuse the existing stage/evaluation/handoff path; do not add World persistence, economy, or a quest framework for it.
- Production Danbaek visual work proceeds only under approved CANON evidence decisions; do not invent geometry to resolve authority conflicts.

## BLOCKED
- Do not overwrite a newer local integration candidate from remote tooling. Confirm remote/local SHA before any production edit.

## EXPERIMENTAL / LATER
- Broader World persistence/economy, inventory, multi-stage systems, deep-link World-origin recovery, and other architecture not required by the first playable loop.
- Cheap UI/polish issues should be batched into relevant Value Trains.

## State update rule
When a train closes: move it CURRENT → DONE, record any new LOCKED decision, classify leftovers MUST FIX/LATER/CUT, set exactly one primary NEXT train. Do not turn this file into a chronological log; history belongs in DECISION_LOG / FAILURE_LESSONS.
