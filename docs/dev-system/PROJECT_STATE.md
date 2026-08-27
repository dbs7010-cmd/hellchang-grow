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
- Workout Record Trust (Train A): a mistyped set can be corrected or deleted inside the session, and every saved workout can be re-read set by set from one record-detail screen reached from HOME, HISTORY and the Workout tab.
- Performance Truth (Train B): the exercise name on HOME/Stanley carries that exercise's own set count, one shared policy picks the representative achievement for both surfaces (real improvement over first record; no cross-exercise weight ranking), and RESULT does not call Danbaek/game growth the user's real body.
- Release Playability Closure: a workout can be ended from the REST screen, the session stops calling an exercise "first ever" after sets are logged, Danbaek World greets a first-time visitor before showing a locked gate, and no build-visible subscribe button exists while payment is unimplemented.
- Danbaek World First Playable: HOME → blocked World gate → real workout → persisted learning/result → World return → gate cleared → next goal, as a visible game situation rather than a status board.
- **MAIN APP PRODUCT FINISH 1**: mobile product-quality pass over onboarding, Workout hub/start, Session, Result, Record Detail, History, Routine, Trainer, AI PT, Settings and HOME chrome. Two shared controls now carry patterns that were hand-rolled per screen — `InlineAction` (secondary text actions) and `EmptyState` (nothing-here-yet blocks). Touch floor of 44 applied across Chip, shared headers, session and HOME chrome; a deep-linked sub-screen's back control no longer dead-ends. Full runtime acceptance run at 360/375/412 with three release blockers found and fixed (formless search empty state, an AI PT retry that could never succeed, 7–11px routine reorder/remove controls next to a destructive action). Real-device QA is deliberately **not** covered here — it remains the final RC gate.
- **DANBAEK WORLD SECOND PLAYABLE**: "당기는 길" is a real second segment, not a teaser line. The player meets a visible blocked situation (Danbaek hangs off the rock ledge and slips back), the gate names the real evidence it needs (lat pulldown), the handoff offers the required exercise plus same-family alternates, and the return shows a truthful cleared reveal with Danbaek referring back to the earlier failure. Pre-cleared and seen→return states are told apart honestly, and the HOME World entry reports the actual current segment and the next one.

## CURRENT
- None.

## NEXT
- Value Train: **RELEASE CANDIDATE PREPARATION**. Do not redevelop the app foundation. Take the current integrated Main App + World product to an actual release candidate: release surface and store/packaging requirements, build and device verification (real Galaxy S24 Ultra pass), and closure of whatever that surfaces. New Danbaek World content stays a parallel production track and does not become the primary train.

## BLOCKED
- Do not overwrite a newer local integration candidate from remote tooling. Confirm remote/local SHA before any production edit.
- Deleting an arbitrary saved WorkoutRecord is BLOCKED. Records are the source of derived facts (PR, volume, learning, World gates) but Growth/Muscle SP, PASS XP and streak are accumulated and persisted with no reverse path. Deleting a record would shrink the derived side while the accumulated side keeps the erased workout, so an honest full delete requires reversing LOCKED Growth/accounting semantics. Deletion therefore stays limited to the existing malformed-record escape hatch until a separately approved growth-reversal design exists.

## EXPERIMENTAL / LATER
- Real-device QA on Galaxy S24 Ultra is still UNVERIFIED; web runtime at 360/375/412 is the only evidence so far.
- World return presentation is memory-only and does not survive a reload; deep-link World-origin recovery is still out of scope. Do not add World persistence to work around it.
- `verify:learning-ux` carries two stale assertions about the old World-entry subLabel copy (`'1가지'`, `'첫 번째 길이 기다리고 있어요'`). They already failed at the promoted base b55d8eb and now contradict what `verify:home` FIXTURE E enforces. World-owned verifier cleanup.
- Non-blocking polish already classified: AI PT gate screen density, the longest exercise name ellipsizing in the routine row at 360, the onboarding body-composition disclosure reading like a selected choice, and cardio-only records reading "운동 0개 · 0세트".

## State update rule
When a train closes: move it CURRENT → DONE, record any new LOCKED decision, classify leftovers MUST FIX/LATER/CUT, set exactly one primary NEXT train. Do not turn this file into a chronological log; history belongs in DECISION_LOG / FAILURE_LESSONS.
