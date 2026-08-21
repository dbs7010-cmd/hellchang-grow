import { MuscleGroupDetails, type MuscleGroupDetail } from '@/types/exercise';
import type { DanbaekBodyParameters } from '@/types/body-state';
import type { GrowthApplicationResult } from '@/types/growth';
import { createDefaultGrowthState } from '@/utils/growth-state';
import { buildGrowthRevealMuscles, hasPermanentBodyChange } from '@/utils/growth-reveal';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const stages = (value = 0) => Object.fromEntries(
  MuscleGroupDetails.map((muscle) => [muscle, value])
) as Record<MuscleGroupDetail, number>;
const result = (input: Partial<GrowthApplicationResult>): GrowthApplicationResult => ({
  sessionId: 'session-result',
  gainedSpByMuscle: {},
  previousStages: stages(),
  currentStages: stages(),
  stageChanges: [],
  pumpByMuscle: {},
  totalSpGained: 0,
  ...input,
});
const params = (chestScale: number): DanbaekBodyParameters => ({
  chestScale, shoulderScale: 0, armScale: 0, backWidth: 0, backThickness: 0,
  waistScale: 0, abdomenDefinition: 0, gluteScale: 0, thighScale: 0, calfScale: 0,
  overallMass: 0, fatSoftness: 0, definition: 0,
});

const growthAfter = createDefaultGrowthState('2026-08-22T12:00:00.000Z');
growthAfter.muscles.chest = { totalSp: 280, currentStage: 0 };
growthAfter.muscles.triceps = { totalSp: 80, currentStage: 0 };

const noStage = buildGrowthRevealMuscles({
  growth: result({
    gainedSpByMuscle: { chest: 30, triceps: 10 },
    pumpByMuscle: { chest: 30, triceps: 10 },
    totalSpGained: 40,
  }),
  growthAfter,
});
expect('A: only muscles with positive gained SP are shown', noStage.length === 2);
expect('A: muscles are ordered by actual gained SP', noStage[0]?.muscle === 'chest');
expect('A: no-stage progress uses real before/after totals', noStage[0]?.progressBefore < noStage[0]?.progressAfter);
expect('A: no stage is invented', noStage.every((muscle) => !muscle.stageChanged));

growthAfter.muscles.chest = { totalSp: 310, currentStage: 1 };
const chestStage = buildGrowthRevealMuscles({
  growth: result({
    gainedSpByMuscle: { chest: 20 },
    previousStages: { ...stages(), chest: 0 },
    currentStages: { ...stages(), chest: 1 },
    stageChanges: [{ muscle: 'chest', group: 'chest', previousStage: 0, currentStage: 1 }],
    totalSpGained: 20,
  }),
  growthAfter,
});
expect('B: chest stage rise comes directly from GrowthEngine stages', chestStage[0]?.stageChanged === true);
expect('B: stage labels preserve exact before/after stage', chestStage[0]?.previousStage === 0 && chestStage[0]?.currentStage === 1);

growthAfter.muscles.triceps = { totalSp: 305, currentStage: 1 };
const multiStage = buildGrowthRevealMuscles({
  growth: result({
    gainedSpByMuscle: { chest: 20, triceps: 15 },
    previousStages: { ...stages(), chest: 0, triceps: 0 },
    currentStages: { ...stages(), chest: 1, triceps: 1 },
    stageChanges: [
      { muscle: 'chest', group: 'chest', previousStage: 0, currentStage: 1 },
      { muscle: 'triceps', group: 'arms', previousStage: 0, currentStage: 1 },
    ],
    totalSpGained: 35,
  }),
  growthAfter,
});
expect('C: multiple real stage rises are all retained', multiStage.filter((muscle) => muscle.stageChanged).length === 2);

const tiny = buildGrowthRevealMuscles({
  growth: result({ gainedSpByMuscle: { chest: .2 }, totalSpGained: .2 }),
  growthAfter,
});
expect('D: tiny real SP remains visible', tiny[0]?.gainedSp === .2);
expect('D: tiny SP does not create a stage rise', tiny[0]?.stageChanged === false);

expect('E: identical permanent parameters suppress BEFORE/AFTER', !hasPermanentBodyChange(params(.1), params(.1)));
expect('B/E: a real parameter delta enables BEFORE/AFTER', hasPermanentBodyChange(params(.1), params(.2)));
expect('F: null growth creates no fake reveal rows', buildGrowthRevealMuscles({ growth: null, growthAfter }).length === 0);

console.log(failures === 0 ? '\nAll GROWTH REVEAL checks passed.' : `\n${failures} GROWTH REVEAL check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
