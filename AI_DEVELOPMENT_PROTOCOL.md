# AI Development Protocol

## Project truth

- Git and repository state are the project truth. Chat memory is not an authoritative source.
- The canonical repository is `C:/Users/Public/Documents/ESTsoft/CreatorTemp/hellchang-grow-integration-after-recovery`.
- The canonical branch is `integration/rebuild-app-after-recovery`.
- Before work begins, verify the repository root, branch, HEAD, remote ref, and working-tree state.
- If any expected repository state does not match, stop before editing production files and report the actual state.

## Product and contract preservation

- Do not redesign `LOCKED`, `CANON`, or `DONE` areas without new evidence that the current change touches their contract.
- The default unit of development is a playable milestone, not a one-bug train.
- The objective is playable product progress, not the volume of reports produced.
- Repository cleanup is separate from feature work and must not be mixed into a product change.

## Roles and ownership

- Claude and Codex do not have permanent roles. Assign the role required by the task: Maker, Checker, or Investigator.
- Parallel production work is prohibited when file ownership overlaps.
- The same production file must not be modified simultaneously by multiple workers.
- The art team may work in parallel only on independently owned visual QA or asset work.

## Maker completion loop

A Maker does not stop after investigation. Complete the full loop:

1. Orient.
2. Inspect.
3. Implement.
4. Run targeted verification.
5. Perform runtime QA appropriate to the changed seam.
6. Commit the completed change.

Targeted verification is used during development. Broader acceptance runs once at the milestone or integration gate. Do not re-audit an unchanged diff that already received `ACCEPT` with `MUST FIX 0`.

## Git promotion policy

- Normal promotion is fast-forward only.
- Force push, rebase, amend, reset, and merge are prohibited by default.
- A task is `DONE` only when its commit state and canonical disposition have both been confirmed.

## Required AI task contract

Every AI instruction must include, at minimum:

- ROLE
- canonical repository
- branch and base
- goal
- current state
- ownership
- do-not-touch boundaries
- implementation scope
- acceptance criteria
- verification
- runtime QA
- commit and push policy
- DONE and STOP conditions
