# FAILURE LESSONS v1.0

These are operating lessons. Do not repeat a failed pattern without new evidence.

## F01 — Full-audit churn
Failure: small changes repeatedly triggered broad audits, reports, approvals, and re-audits. Player-visible progress became slower than internal verification progress.
Lesson: verification depth follows risk. Batch reversible changes into a Value Train. Full integration gate is not a per-file ritual.

## F02 — Assertion-count illusion
Failure: large PASS counts created confidence while runtime-relevant storage/UI/platform gaps could remain.
Lesson: tests must cover the expensive/reachable failure boundary. Raw assertion count is secondary evidence only.

## F03 — Duplicate AI review
Failure: multiple AIs inspected overlapping work without a specific independent-risk question.
Lesson: one owner implements. A second AI reviews only a named risk or integration boundary.

## F04 — LOCKED re-opening
Failure mode: repeatedly reconsidering already approved architecture/art/contracts creates redesign loops and destroys velocity.
Lesson: LOCKED stays closed absent new contradictory evidence or user decision.

## F05 — Verifier can be stale
Observed: removed runtime viewer left a verifier reading the deleted file; the product decision was correct but the guard itself was stale.
Lesson: verifiers are code. A failing verifier can indicate stale verification infrastructure. Diagnose before changing production behavior to satisfy it.

## F06 — Generated-file contract in ignored files
Observed: CSS declaration lived in generated expo-env.d.ts and disappeared after regeneration.
Lesson: durable build contracts belong in tracked source/type files, not regenerable ignored artifacts.

## F07 — Presentation change can alter accounting
Observed: rep-PR expansion appeared presentation-oriented but prs.length fed HELL PASS XP, changing rewards.
Lesson: trace shared data to persistence/reward consumers before classifying a change as presentation-only.

## F08 — Backward-compatible runtime is not schema compatibility
Observed: adding PR kind did not immediately crash legacy receipts, but missing normalization left future risk.
Lesson: persisted schema extensions need explicit read-boundary normalization/compatibility evidence when old data can survive upgrades.

## F09 — Corruption must be stopped at read boundaries
Observed: malformed Growth fields could pass migration and become permanent NaN/invalid accumulated state.
Lesson: validate external/persisted input at repository read boundaries; preserve existing migration/default semantics rather than inventing repair values.

## F10 — Visual evidence before visual patch
Observed: two supposedly authoritative Danbaek visual sources conflicted structurally. Blind contour patching would have redesigned CANON.
Lesson: normalize deterministically, generate evidence, classify conflict, and let human CANON authority decide. Machine evidence does not decide taste/likeness.

## F11 — Same-SHA evidence
Failure mode: viewport/runtime evidence collected after a worktree advanced cannot prove an earlier candidate.
Lesson: release/integration evidence is attributable only to the exact candidate SHA and clean tracked state.

## F12 — Tool/environment failure is not product failure
Lesson: distinguish INFRASTRUCTURE from DOMAIN / INTEGRATION / BUILD / VISUAL / DEVICE failures. Do not mark product PASS when QA could not run; do not mark product FAIL before product code was evaluated.

## F13 — Internal completion is not player value
Lesson: routing, adapters, context fields, or pure-domain functions are foundations. A Value Train closes when the intended player loop is actually runnable and observed.

## F14 — Build what is expensive to repair early; defer cheap polish
Lesson: protect persistence/accounting/CANON/session foundations early. Batch copy/spacing/minor UI until the playable loop exposes what actually matters.
