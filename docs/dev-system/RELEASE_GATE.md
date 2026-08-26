# RELEASE / INTEGRATION GATE v1.0

## Purpose
Separate daily development verification from candidate approval. Full gates protect candidate integrity; they are not the default development loop.

## Candidate policy
Record exact 40-char SHA and clean tracked state before candidate QA. HARD automated gate → Web visual/runtime QA → device QA as required → recheck same SHA/clean state.

If SHA or tracked source/config/test/asset/dependency/release configuration changes, rerun the relevant candidate gate; for a final release/main candidate rerun the full integration gate.

Untracked screenshots/logs do not invalidate same-SHA evidence unless they can affect bundling/import/runtime behavior.

## Failure classification
DOMAIN REGRESSION — pure domain contract fails.
INTEGRATION REGRESSION — domain units pass but wiring/orchestration fails.
BUILD/TYPE — compile/lint/export/module resolution fails.
VISUAL — render/interaction violates approved hierarchy/CANON/layout.
DEVICE — device-specific lifecycle/touch/storage/runtime failure.
INFRASTRUCTURE — environment blocks evaluation before product behavior is tested.

INFRASTRUCTURE is neither product PASS nor product FAIL. Unavailable visual/device QA means candidate remains unapproved for that gate.

## When full gate is required
- final main/release candidate
- major integration of independently developed branches
- dependency/Expo/platform/release configuration change
- broad RED-contract migration
- production CANON asset/routing/renderer change before release approval
- a discovered regression whose blast radius cannot be bounded reliably

## When full gate is NOT required
- isolated copy/spacing/polish
- bounded presentation work
- targeted verifier repair with no production behavior change
- a small Value Train whose touched risk surfaces have targeted coverage

## Same-SHA evidence rule
Runtime/viewport/device evidence belongs only to the exact candidate SHA tested. If the worktree advances during QA, evidence after the advance cannot be claimed for the prior SHA.

## Production Art extension
Art changes require character routing/body/motion and relevant screen visual checks, but art-impact checks do not replace the final full integration gate for a release candidate.

## Human visual authority
Automated metrics may detect contour, bounds, routing, deterministic output, anchor movement, or unexpected region deformation. They must not automatically decide cuteness, likeness, appeal, natural muscle shape, or final CANON acceptance.
