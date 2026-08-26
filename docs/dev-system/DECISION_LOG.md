# DECISION LOG

Only durable decisions belong here. Do not log routine implementation detail.

## D-001 — Player-visible Value Train is the default development unit
Decision: development completion is judged by a runnable player-visible loop, not internal layers or assertion totals.
Reason: prior layer-by-layer audit cycles produced high verification volume with poor visible velocity.
Status: LOCKED operating decision.

## D-002 — Verification depth is risk-based
Decision: RED expensive-to-repair foundations receive immediate hard verification; YELLOW integration is verified at seams/train close; GREEN reversible polish is batched and playtested.
Reason: safety must be concentrated where failures are expensive rather than spread uniformly.
Status: LOCKED operating decision.

## D-003 — Full audit is a candidate gate, not a daily ritual
Decision: full integration audits occur at release/main/major integration boundaries or justified broad-risk events.
Status: LOCKED operating decision.

## D-004 — AI roles are asymmetric
Decision: ChatGPT orchestrates/product-decides, Claude is default primary builder, Codex is default RED-risk/reliability specialist. Duplicate review requires a named reason.
Status: operating default; may change if tool capabilities materially change.

## D-005 — LOCKED/CANON requires new evidence to reopen
Decision: alternatives alone are insufficient. Conflicting authoritative sources require evidence + human decision, not autonomous redesign.
Status: LOCKED.

## D-006 — Persisted-data compatibility is a first-class contract
Decision: schema/read changes must consider existing user data, normalization, retry/idempotency, and corruption containment at boundaries.
Status: LOCKED engineering principle.

## D-007 — Machine QA and human visual/product authority are separate
Decision: automation proves deterministic contracts/evidence; human approval decides subjective CANON likeness, fun, appeal, and product direction.
Status: LOCKED.

## D-008 — First Playable before architecture expansion
Decision: World progress persistence, new economy/inventory, broad quest architecture, and speculative systems do not precede a working World→real workout→persisted consequence→World change loop unless required by that loop.
Status: current product strategy.
