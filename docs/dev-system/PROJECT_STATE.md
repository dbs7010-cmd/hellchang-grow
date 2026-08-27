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
- **MAIN APP PRODUCT FINISH 1**: mobile product-quality pass over onboarding, Workout hub/start, Session, Result, Record Detail, History, Routine, Trainer, AI PT, Settings and HOME chrome. Two shared controls now carry patterns that were hand-rolled per screen — `InlineAction` (secondary text actions) and `EmptyState` (nothing-here-yet blocks). Touch floor of 44 applied across Chip, shared headers, session and HOME chrome; a deep-linked sub-screen's back control no longer dead-ends. Full runtime acceptance at 360/375/412 with three release blockers fixed.
- **DANBAEK WORLD SECOND PLAYABLE**: "당기는 길" is a real second segment. A visible blocked situation (Danbaek hangs off the ledge and slips back), a gate that names the real evidence it needs (lat pulldown), a handoff offering the required exercise plus same-family alternates, and a truthful cleared reveal on return. Pre-cleared and seen→return states are told apart honestly, and the HOME World entry reports the actual current segment and the next one.
- **DANBAEK WORLD THIRD PLAYABLE**: "굽이진 돌길" promoted from teaser to a playable segment — a visible unstable stone-path situation, persisted squat evidence as the gate condition, truthful pre-cleared and seen→return behaviour, a visible cleared payoff, and "바람 부는 능선" left as the next teaser.
- **RELEASE ENGINEERING PREPARATION**: production web export verified end to end, Expo template boot branding removed from the shipped runtime, Expo SDK 57 dependency alignment (expo-doctor clean, package.json/lock re-synced so a clean install works), production DEV-leakage checked, the stale learning verifier corrected, and the previously observed EmptyState transient not reproduced in a production bundle. **This is build and configuration readiness only — it does not mean the product's visual or product design is release-ready.**

## CURRENT
- None.

## NEXT
- Value Train: **MAIN APP PRODUCT DESIGN 2**. Bring the actual user-facing Main App — above all HOME — to release-quality visual design, information hierarchy and interaction convenience.
  - The foundation and core semantics are **not** being reopened: Workout Core, accounting, Growth/Muscle SP, BodyState, WorkoutRecord, PR policy, completion/persistence stay as they are.
  - This is **not** small polish. It is a design train with its own product judgement about what the app should look and feel like.
  - **HOME is the primary product surface** and sets the language.
  - Workout / Session / Result / History / Trainer are included where they are needed for one coherent visual and interaction language — not as a screen-by-screen sweep.
  - Danbaek World continues as a **parallel game-content track** and does not become the primary train.
  - RC finalization comes **after** this product-design train, not before it.

## BLOCKED
- Do not overwrite a newer local integration candidate from remote tooling. Confirm remote/local SHA before any production edit.
- Deleting an arbitrary saved WorkoutRecord is BLOCKED. Records are the source of derived facts (PR, volume, learning, World gates) but Growth/Muscle SP, PASS XP and streak are accumulated and persisted with no reverse path. Deleting a record would shrink the derived side while the accumulated side keeps the erased workout, so an honest full delete requires reversing LOCKED Growth/accounting semantics. Deletion therefore stays limited to the existing malformed-record escape hatch until a separately approved growth-reversal design exists.

## EXPERIMENTAL / LATER
- Real-device QA on Galaxy S24 Ultra is still UNVERIFIED; web runtime at 360/375/412 remains the only evidence.
- World return presentation is memory-only and does not survive a reload; deep-link World-origin recovery is still out of scope. Do not add World persistence to work around it.
- Final launcher icon, adaptive icon and splash artwork still ship as Expo template images. Replacing them needs approved brand assets and blocks store submission; the surrounding configuration is already prepared to receive them.
- AI PT is unreachable in a production build (no ad provider, no purchase path) and the screen says so honestly. Whether V1 ships with AI PT visibly pending or waits for the ad SDK is an open product decision before final release.
- Known non-blocking UI items feeding the design train: AI PT gate screen density, the longest exercise name ellipsizing in the routine row at 360, the onboarding body-composition disclosure reading like a selected choice, and cardio-only records reading "운동 0개 · 0세트".

## State update rule
When a train closes: move it CURRENT → DONE, record any new LOCKED decision, classify leftovers MUST FIX/LATER/CUT, set exactly one primary NEXT train. Do not turn this file into a chronological log; history belongs in DECISION_LOG / FAILURE_LESSONS.
