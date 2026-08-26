# VALUE TRAIN CONTRACT v1.0

A Value Train is the default unit of development. It is not a file list or technical milestone. It is one coherent player-visible improvement that can be run and judged.

## Train definition
Every train must answer:
- PLAYER VALUE: what will the player newly feel/do/understand?
- LOOP: what exact start→action→feedback→outcome path becomes runnable?
- SUCCESS: what observable behavior proves completion?
- RISK: which RED/YELLOW/GREEN surfaces are touched?
- NO-CHANGE: which LOCKED contracts are outside scope?
- PLAYTEST: how will the result be experienced, not merely asserted?

## Train sizing
Prefer a train that can be completed as one coherent playable increment. Split only at a genuine ownership/risk boundary. Do not split merely because implementation spans multiple files.

## Finding triage
MUST FIX: blocks intended loop, corrupts/risks expensive data/contracts, violates CANON, causes misleading reward/accounting, or materially damages player comprehension/use.

LATER: real issue but cheap/reversible and not blocking the train's value.

CUT: complexity, abstraction, speculative feature, or polish that does not justify current cost.

MUST FIX is handled before LOCK. LATER is recorded without stopping momentum. CUT is removed from scope.

## Verification matrix
RED touched → targeted hard verifier + compatibility/recovery evidence + relevant runtime test.
YELLOW touched → seam verifier + end-to-end train playtest.
GREEN only → train playtest; static checks as normal build hygiene.

Always run type/lint/build checks when the changed surface requires them, but do not confuse build hygiene with product acceptance.

## Close criteria
A train closes only when:
1. Intended player loop is runnable.
2. Required risk gates pass.
3. No unresolved MUST FIX remains.
4. LOCKED/CANON preservation is confirmed or approved changes are recorded.
5. Result is summarized in player-visible language.
6. NEXT train is selected.

## Current canonical example — Danbaek World First Playable
HOME → enter Danbaek World → see blocked situation → handoff to real exercise → complete effective workout → existing completion pipeline persists record/growth/reward/learning → Result shows consequence → return to World → blocked state becomes cleared → next goal appears.

This is one Value Train because the player value is the complete cause-and-effect loop. Route wiring, block handoff, learning snapshot, and Result consumption are implementation slices inside that train, not separate product completions.
