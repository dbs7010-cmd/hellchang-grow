import { Exercises } from '@/config/exercises';
import { buildDanbaekLearningProfile } from '@/utils/danbaek-learning';
import { resolveBlockRoute } from '@/utils/danbaek-block-routing';
import { runDanbaekAdventure } from '@/features/danbaek-world/adventure-runner';
import { DanbaekWorldProofStages } from '@/features/danbaek-world/proof-stages';
import type { WorkoutRecord } from '@/types/workout';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.error(`FAIL ${name}`); }
}

function record(id: string, exerciseId: string, date: string): WorkoutRecord {
  const exercise = Exercises.find((item) => item.id === exerciseId)!;
  return {
    id,
    sessionId: `session-${id}`,
    date,
    durationMinutes: 30,
    category: exercise.category,
    exercises: [{ exerciseId, name: exercise.name, sets: [{ weightKg: 40, reps: 10, completed: true }] }],
  } as WorkoutRecord;
}

const pushUpRecords = [
  record('push-1', 'push-up', '2026-08-20'),
  record('push-2', 'push-up', '2026-08-21'),
  record('push-3', 'push-up', '2026-08-22'),
  record('push-4', 'push-up', '2026-08-23'),
];
const before = buildDanbaekLearningProfile(pushUpRecords, '2026-08-26T00:00:00.000Z');
const blocked = runDanbaekAdventure(DanbaekWorldProofStages, before);
check('real push records clear movement-family gate', blocked.clearedStageIds.includes('proof-horizontal-push-gate'));
check('same profile blocks specific bench gate', blocked.currentStageId === 'proof-bench-gate' && blocked.block !== null);

const route = resolveBlockRoute({ block: blocked.block!, exerciseDb: Exercises, records: pushUpRecords });
check('WORLD block routes back to horizontal push', route.movementFamily === 'push_horizontal');
check('APP offers real mapped exercises', route.exercises.length > 0);
check('APP route includes bench press required by gate', route.exercises.some((exercise) => exercise.exerciseId === 'bench-press'));

const afterRecords = [...pushUpRecords, record('bench-1', 'bench-press', '2026-08-25')];
const after = buildDanbaekLearningProfile(afterRecords, '2026-08-26T01:00:00.000Z');
const cleared = runDanbaekAdventure(DanbaekWorldProofStages, after);
check('real bench workout changes APP-owned evidence', after.capabilities.find((cap) => cap.movementFamily === 'push_horizontal')?.representativeExerciseIds.includes('bench-press') === true);
check('same WORLD route clears after real bench evidence', cleared.outcome === 'cleared');
check('WORLD evaluation did not mutate APP profile', JSON.stringify(after) === JSON.stringify(buildDanbaekLearningProfile(afterRecords, '2026-08-26T01:00:00.000Z')));

console.log(`\nIntegration Gate 1: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;
