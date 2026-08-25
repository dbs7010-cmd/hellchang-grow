# APP ↔ DANBAEK WORLD SHARED CONTRACT v1

Status: FROZEN FOR FOUNDATION

Purpose: allow APP and WORLD to develop in parallel without reading or mutating each other's internals.

## Boundary rule

APP produces a read-only DanbaekLearningProfile snapshot.
WORLD consumes that snapshot and produces AdventureProgress/AdventureResult.
WORLD cannot produce or modify workout learning.

## Contract shapes (design-level)

```ts
type MovementFamily =
  | 'push_horizontal'
  | 'pull_vertical'
  | 'pull_horizontal'
  | 'squat'
  | 'hinge'
  | 'push_vertical'
  | 'carry'
  | 'locomotion';

type LearningStage =
  | 'unseen'
  | 'observing'
  | 'imitating'
  | 'learned'
  | 'familiar'
  | 'proficient';

type LearnedCapability = {
  movementFamily: MovementFamily;
  learningStage: LearningStage;
  evidenceCount: number;
  lastObservedAt: string | null;
  representativeExerciseIds: string[];
};

type DanbaekLearningProfile = {
  contractVersion: 1;
  generatedAt: string;
  capabilities: LearnedCapability[];
};

type StageRequirement = {
  movementFamily?: MovementFamily;
  minimumLearningStage?: LearningStage;
  specificExerciseId?: string;
  reason: string;
};

type StageEvaluation =
  | { outcome: 'pass'; stageId: string }
  | {
      outcome: 'block';
      stageId: string;
      requirement: StageRequirement;
      recommendedMovementFamily: MovementFamily;
      explanationKey: string;
    };

type AdventureProgress = {
  contractVersion: 1;
  furthestClearedStageId: string | null;
  currentStageId: string;
};
```

## Rules

1. `evidenceCount` represents validated real-workout evidence supplied by APP; WORLD never increments it.
2. WORLD must evaluate only the snapshot it receives. No imports from WorkoutRepository/GrowthEngine/BodyState.
3. LearningStage thresholds are APP/domain responsibility. WORLD may require a stage but cannot reinterpret how real workouts earn it.
4. Stage requirements should prefer MovementFamily. `specificExerciseId` is exceptional content and must have explicit design justification.
5. A block response must be actionable: it identifies the missing/weak family and gives APP enough information to route to Stanley/workout selection.
6. No generic `power` field in v1 contract. This prevents the system from collapsing back into opaque combat power.
7. Contract changes require version bump + Director review + both team migration plan.

## Initial semantic mapping

- Bench press → push_horizontal
- Push-up → push_horizontal
- Lat pulldown → pull_vertical
- Pull-up → pull_vertical
- Barbell row / dumbbell row → pull_horizontal
- Squat variants → squat
- Deadlift / RDL family → hinge
- Overhead press family → push_vertical
- Running/walking → locomotion

This mapping is a foundation seed, not an exhaustive exercise database. APP must reuse existing exercise IDs and validate mappings against the repository before implementation.

## Anti-cheat / integrity

The contract does not claim physiological truth. It represents what Danbaek has observed/learned from valid app records. Invalidated sets, cancelled sessions, fabricated world rewards, or UI-only interactions must not become learning evidence.
