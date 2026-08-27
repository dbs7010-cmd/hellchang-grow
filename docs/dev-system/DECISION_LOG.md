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

## D-009 — Product balance is Workout 50 / Danbaek World 50
Decision: Danbaek World is an independent game half of the product, not a reward screen. The workout app remains equally important and professionally useful.
Status: LOCKED product direction.

## D-010 — Player observes; Danbaek acts
Decision: the real-world player is an exercise-loving human who observes another world and teaches through their own real workouts. The playable actor inside Danbaek World is Danbaek, not a player avatar/doppelganger.
Status: LOCKED world rule.

## D-011 — Danbaek is openly the prince
Decision: Danbaek is known from the beginning as the prince of a friendly, cute world. The setting does not emphasize rigid hierarchy or court-law simulation.
Status: LOCKED story rule.

## D-012 — Core conflict: Sugar corrupts Danbaek World
Decision: Sugar is the demon-king-like central antagonist/corrupting force. Story structure is a simple, readable heroic adventure rather than mystery-first lore complexity.
Status: LOCKED story direction.

## D-013 — Danbaek World does not know exercise/muscular problem-solving
Decision: its protein-like inhabitants do not possess the concept/practice of training and muscular actions such as lifting, pushing, pulling, carrying, bracing, or running as the player understands them. Ordinary physical solutions therefore function as puzzles inside that world.
Status: LOCKED world rule.

## D-014 — Exercise knowledge becomes world capability
Decision: real workouts teach Danbaek physical capabilities. Balanced muscle-group training, set diversity, accumulated progression and related movement patterns expand what Danbaek can do. The game should motivate consistent and varied real training rather than one-off exploitative sets.
Status: LOCKED gameplay principle. Exact balancing remains tunable.

## D-015 — Easy visual situation-puzzles, not text-choice gameplay
Decision: Danbaek World is character-first, visual and interaction-led. Situations should be understood through scene/action/reaction with simple touch interactions where useful. It must not become a visual-novel loop of long text and repeated choice buttons. The puzzle is intentionally easy to the human player; the novelty is that the solution is revolutionary to Danbaek World.
Status: LOCKED gameplay/presentation principle.

## D-016 — Do not reveal the exercise answer before the player understands the situation
Decision: show the problem first. Let the player recognize a natural physical solution. Exercise/PT translation can follow when Danbaek lacks the required capability. Avoid UI that immediately says 'do bench press to open this door' before the situation is experienced.
Status: LOCKED puzzle-design principle.

## D-017 — Progress can block, but failure/game-over is not the goal
Decision: no punitive game-over loop is required. Danbaek may reach a genuine blocker that creates the thought 'I need to train/grow to get past this.' With consistent, reasonably balanced weekly exercise, progression should normally continue without excessive stop-start frustration.
Status: LOCKED progression principle. Cadence/balance remains tunable.

## D-018 — Combat is seasoning, not the continuous core
Decision: mix occasional small enemies and mid-boss/boss situations into exploration/puzzles. Do not turn Danbaek World into constant combat grinding. Learned physical capabilities should also solve combat situations naturally.
Status: LOCKED content direction.

## D-019 — Danbaek is the initial unique exercise hero
Decision: during the first major phase, Danbaek alone learns exercise and should feel heroic. Do not immediately spread exercise knowledge to all residents or build civilization-wide training simulation. Broader characters/teaching can be explored in a later phase.
Status: LOCKED Phase 1 direction.

## D-020 — Real body is not avatar mirroring
Decision: Danbaek is not a body doppelganger. Consistency, variety, app use and sincere real training drive Danbaek's growth; the user's appearance/body composition must not directly make Danbaek weak or visually copy the user.
Status: LOCKED product rule.

## D-021 — Story tone is sincere adventure, not self-aware comedy
Decision: the premise can be cute and inherently funny, but scenes, dialogue and stakes should be written as if making a sincere adventure game. Do not constantly wink at the player or force jokes about obvious solutions. Humor should emerge naturally from the world's logic and characters.
Status: LOCKED narrative tone.

## D-022 — Phase 2 social/character expansion is deferred
Decision: non-workout-day exploration, broader character roster, teaching others, and larger social/world systems are valid future directions but are not current implementation scope. When Phase 2 begins, reassess whether cosmetics, collectible characters, or a 'player PTs multiple characters' model fits the established player↔Danbaek relationship before implementing monetization around it.
Status: DEFERRED product decision; not permission to implement now.

## D-023 — World progress is derived, never stored
Decision: what is blocked or cleared in Danbaek World is always recomputed from persisted workout learning. World may hold in-memory presentation state — which segment the player last saw, whether they left for a workout from a gate — purely to time a reveal or offer a return link, and that state must never become progression.
Reason: a stored World progress record is a second source of truth for "did the player earn this", and the first thing that would drift away from real training. Keeping it derived means the only way to open a path stays doing the actual workout.
Status: LOCKED for World work until a separately approved progression design exists.
