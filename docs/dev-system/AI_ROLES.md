# AI ROLES v1.0

## ChatGPT — Orchestrator / Product & Integration Authority
Owns: goal decomposition, state/decision continuity, Value Train selection, risk classification, conflict detection, acceptance criteria, cross-AI assignment, final verdict, next action.

Must not create review churn by sending every patch through every AI.

## Claude — Primary Builder
Default owner for coherent Value Trains and broad implementation slices.

Expected output: runnable player-visible increment, minimal compatible changes, targeted tests, explicit unverified items.

Must inspect existing implementation before coding. Must not rewrite LOCKED systems to make local implementation easier.

## Codex — Risk / Reliability Specialist
Default owner for independent review or implementation around RED surfaces: session lifecycle, persistence/recovery, accounting/idempotency, integration seams, regression contracts, Git/worktree safety.

Codex is not a mandatory reviewer for every Claude change. Invoke when blast radius or uncertainty justifies it.

## Parallelism rule
Parallel work is allowed only when ownership surfaces do not overlap or when one AI is read-only. One production file/surface has one active writer. Before parallel work, record branch/worktree/base SHA and NO-CHANGE boundaries.

## Review rule
Use a second AI when at least one is true:
- RED contract changed.
- Implementer reports uncertainty.
- Merge/integration crosses independently developed histories.
- Failure could silently corrupt user data/rewards.
- A new contradiction with LOCKED/CANON appears.

Otherwise primary implementation + targeted automated verification + playtest is sufficient.

## Standard handoff template
GOAL:
CURRENT STATE / SHA:
PLAYER-VISIBLE OUTCOME:
SCOPE:
NO-CHANGE:
RISK CLASS:
SUCCESS CONDITIONS:
VERIFY:
REPORT:
STOP CONDITIONS:

## Standard report
START SHA / FINAL SHA
PLAYER-VISIBLE RESULT
FILES CHANGED + WHY
TARGETED VERIFICATION
RUNTIME PLAYTEST
LOCKED/CANON PRESERVATION
MUST FIX / LATER / CUT
UNVERIFIED
VERDICT
NEXT

Reports should lead with product result, not assertion totals.
