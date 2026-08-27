# AI GAME DEVELOPMENT OPERATING SYSTEM v1.0

Status: LOCKED OPERATING POLICY

## Purpose
Build playable, valuable game increments quickly without sacrificing expensive-to-repair contracts. This document is the entry point for ChatGPT, Claude, Codex, or any future AI working on this repository.

## North Star
Progress is measured by player-visible value, not files changed, commits, assertion count, or reports.

Primary product priorities:
1. Fun / clear player value
2. Repeat use / retention potential
3. Monetization potential without corrupting gameplay
4. Reliability of expensive-to-repair foundations
5. Development speed and maintainability

## Mandatory workflow

CURRENT STATE → LOCKED/constraints → VALUE TRAIN goal → risk classify → minimal implementation → targeted verification → runnable playtest → MUST FIX/LATER/CUT → LOCK/DONE → NEXT

Do not replace this with implementation → full audit → approval → implementation loops.

## VALUE-LOCK loop
1. VALUE: define one player-visible outcome.
2. RISK: classify touched surfaces RED/YELLOW/GREEN.
3. BUILD: implement the smallest complete playable slice.
4. VERIFY: run only gates required by touched risk surfaces.
5. PLAY: verify the actual user loop, not only code assertions.
6. TRIAGE: classify findings MUST FIX / LATER / CUT.
7. LOCK: once success criteria and required gates pass, mark DONE/LOCKED where appropriate.
8. NEXT: move immediately to the next highest-value train.

## Risk classes
### RED — immediate hard verification
Data loss/corruption, session completion/idempotency, workout accounting, Growth/SP, BodyState/BodyParameters, payment/entitlement, persistence/recovery, CANON identity/routing, security/release-critical configuration.

Rules: inspect existing contract first; minimal patch; targeted automated gate; compatibility/recovery test where relevant; do not silently alter product semantics.

### YELLOW — train-level verification
Cross-screen routing, navigation, World↔Workout seams, presentation models, shared state wiring, motion, responsive layout with meaningful interaction risk.

Rules: verify at integration points and at end of Value Train; do not trigger repository-wide audit by default.

### GREEN — batch and playtest
Copy, spacing, minor hierarchy, decorative presentation, low-cost polish and reversible UI details.

Rules: batch changes; evaluate in real screen/play context; do not stop a train for isolated cosmetic uncertainty unless it violates CANON or blocks use.

## LOCKED/CANON rule
LOCKED/CANON decisions are not reopened because an AI finds an alternative. Reopen only when there is new evidence of a real contradiction, defect, or product decision from the user. When two LOCKED sources conflict, STOP that specific conflicting patch, preserve both, produce evidence, and request human authority. Do not redesign around the conflict.

## Audit policy
Full audits are exceptional. Run them for release/main candidates, major integration boundaries, dependency/platform/config changes, or after a RED contract change with broad blast radius. Do not run full audits after every feature or cosmetic patch.

Assertion count is not a quality metric. Coverage must follow risk and actual runtime reachability.

## Completion language
- DONE: required implementation and verification complete.
- LOCKED: approved contract; no unilateral redesign.
- CURRENT: active Value Train.
- NEXT: next planned player-value increment.
- BLOCKED: cannot proceed safely; exact reason required.
- EXPERIMENTAL: intentionally unverified exploration.

Never call internal plumbing 'complete gameplay'. If it is not visible/playable, report it as internal foundation only.

## Human authority
Machine QA owns deterministic contracts and evidence. The user owns taste, fun, likeness, CANON visual approval, product direction, and monetization acceptability.

## Stop conditions
Stop only the affected slice when continuing would require: changing LOCKED/CANON without approval; destructive history rewrite; unknown data migration semantics; reward/accounting policy invention; production identity redesign; or an unresolved merge that risks losing work. Do not stop unrelated work for a cheap/local issue.

## Handoff minimum
Every AI handoff must state: GOAL, CURRENT SHA/state, SCOPE, NO-CHANGE areas, SUCCESS CONDITIONS, VERIFY, REPORT FORMAT, STOP CONDITIONS.

## Anti-regression rule
If an AI proposes repeated broad audits, duplicated AI review, speculative refactoring, new framework construction, or reopening a passed LOCKED contract, it must justify the added cost with a concrete newly discovered risk. Otherwise reject the work and continue the Value Train.
