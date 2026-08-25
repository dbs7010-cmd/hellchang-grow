import {
  DANBAEK_CONTRACT_VERSION,
  type DanbaekLearningProfile,
} from '@/types/danbaek-contract';
import { runDanbaekAdventure } from '@/features/danbaek-world/adventure-runner';
import { presentDanbaekWorldBlock } from '@/features/danbaek-world/presentation';
import { DanbaekWorldProofStages } from '@/features/danbaek-world/proof-stages';
import { evaluateDanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

const insufficient: DanbaekLearningProfile = {
  contractVersion: DANBAEK_CONTRACT_VERSION,
  generatedAt: '2026-08-26T00:00:00.000Z',
  capabilities: [
    {
      movementFamily: 'push_horizontal',
      learningStage: 'imitating',
      evidenceCount: 2,
      lastObservedAt: '2026-08-25T00:00:00.000Z',
      representativeExerciseIds: ['bench-press'],
    },
  ],
};

const learnedWithoutBench: DanbaekLearningProfile = {
  ...insufficient,
  capabilities: [
    {
      ...insufficient.capabilities[0],
      learningStage: 'learned',
      evidenceCount: 3,
      representativeExerciseIds: ['push-up'],
    },
  ],
};

const learnedBench: DanbaekLearningProfile = {
  ...learnedWithoutBench,
  capabilities: [
    {
      ...learnedWithoutBench.capabilities[0],
      evidenceCount: 4,
      representativeExerciseIds: ['push-up', 'bench-press'],
    },
  ],
};

const beforeSnapshot = JSON.stringify(insufficient);
const firstRun = runDanbaekAdventure(DanbaekWorldProofStages, insufficient);
check('arrival passes before first gate', firstRun.clearedStageIds.includes('proof-arrival'));
check('insufficient push blocks horizontal gate', firstRun.outcome === 'blocked');
check('block identifies push family', firstRun.block?.recommendedMovementFamily === 'push_horizontal');
check('WORLD does not mutate input profile', JSON.stringify(insufficient) === beforeSnapshot);
if (firstRun.block) {
  const presentation = presentDanbaekWorldBlock(firstRun.block);
  check('block presentation routes to Stanley', presentation.actionLabel === '스탠리에게 배우러 가기');
  check('block presentation preserves movement family', presentation.recommendedMovementFamily === 'push_horizontal');
}

const secondRun = runDanbaekAdventure(DanbaekWorldProofStages, learnedWithoutBench);
check('learned push passes family gate', secondRun.clearedStageIds.includes('proof-horizontal-push-gate'));
check('specific bench gate still blocks without bench evidence', secondRun.currentStageId === 'proof-bench-gate');
check('specific gate uses specific exercise explanation', secondRun.block?.explanationKey === 'world.block.specific_exercise_required');
if (secondRun.block) {
  const presentation = presentDanbaekWorldBlock(secondRun.block);
  check('specific exercise id survives handoff', presentation.specificExerciseId === 'bench-press');
}

const malformedCrossFamily: DanbaekLearningProfile = {
  ...learnedWithoutBench,
  capabilities: [
    learnedWithoutBench.capabilities[0],
    {
      movementFamily: 'pull_horizontal',
      learningStage: 'proficient',
      evidenceCount: 99,
      lastObservedAt: '2026-08-25T00:00:00.000Z',
      representativeExerciseIds: ['bench-press'],
    },
  ],
};
const benchGate = DanbaekWorldProofStages.find((stage) => stage.id === 'proof-bench-gate');
check('proof bench gate exists', Boolean(benchGate));
if (benchGate) {
  check(
    'specific exercise in wrong movement family cannot unlock gate',
    evaluateDanbaekWorldStage(benchGate, malformedCrossFamily).outcome === 'block'
  );
}

const thirdRun = runDanbaekAdventure(DanbaekWorldProofStages, learnedBench);
check('additional APP-provided bench evidence clears same route', thirdRun.outcome === 'cleared');
check('cleared route has no block payload', thirdRun.block === null);
check('all proof stages clear in order', thirdRun.clearedStageIds.join('|') === DanbaekWorldProofStages.map((stage) => stage.id).join('|'));

console.log(`\nDanbaek World verification: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;
