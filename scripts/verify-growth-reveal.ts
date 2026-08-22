import { MuscleGroupDetails, type MuscleGroupDetail } from '@/types/exercise';
import type { DanbaekBodyParameters } from '@/types/body-state';
import type { GrowthApplicationResult, MuscleStageChange } from '@/types/growth';
import { createDefaultGrowthState } from '@/utils/growth-state';
import {
  buildGrowthComparisonCamera,
  buildGrowthRevealMuscles,
  buildGrowthHighlight,
  buildGrowthRevealSequence,
  hasPermanentBodyChange,
  resolveGrowthComparisonCamera,
  resolveGrowthFocus,
  revealBodyParameters,
} from '@/utils/growth-reveal';

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


// ── Result reveal 순서: 항상 실제(영구) 몸으로 끝난다 ──────────────────────
const pumpBody = params(.9);
const beforeBody = params(.1);
const afterBody = params(.2);
const snapshot = {
  bodyParametersWithPump: pumpBody,
  bodyParametersBefore: beforeBody,
  bodyParametersAfter: afterBody,
};

const noChangeSequence = buildGrowthRevealSequence({ permanentChanged: false, reducedMotion: false });
expect('B1: no permanent change still runs PUMP then AFTER', JSON.stringify(noChangeSequence) === JSON.stringify(['pump', 'after']));
expect('B1: no permanent change never ends on the pumped body', noChangeSequence[noChangeSequence.length - 1] === 'after');
expect('B1: BEFORE is skipped when nothing changed permanently', !noChangeSequence.includes('before'));

expect('B2: skipping from PUMP lands on the permanent body', revealBodyParameters('after', snapshot) === afterBody);

const changedSequence = buildGrowthRevealSequence({ permanentChanged: true, reducedMotion: false });
expect('B3: a permanent change reveals BEFORE -> PUMP -> AFTER', JSON.stringify(changedSequence) === JSON.stringify(['before', 'pump', 'after']));
expect('B3: the comparison body comes first so AFTER reads as the result', changedSequence[0] === 'before');
expect('B3: the reveal never ends on the pumped body', changedSequence[changedSequence.length - 1] === 'after');

expect('B4: AFTER draws the permanent bodyParametersAfter', revealBodyParameters('after', snapshot) === snapshot.bodyParametersAfter);
expect('B4: PUMP draws the pumped snapshot only', revealBodyParameters('pump', snapshot) === snapshot.bodyParametersWithPump);
expect('B4: BEFORE draws the pre-workout snapshot', revealBodyParameters('before', snapshot) === snapshot.bodyParametersBefore);

expect('B5: reduced motion goes straight to the permanent body', JSON.stringify(buildGrowthRevealSequence({ permanentChanged: true, reducedMotion: true })) === JSON.stringify(['after']));
expect('B5: reveal never invents a body outside the session snapshot', ['pump', 'before', 'after'].every((phase) => [pumpBody, beforeBody, afterBody].includes(revealBodyParameters(phase as never, snapshot))));


// ── AFTER 강조는 실제로 오른 단계에서만 나온다 ──────────────────────────────
expect('4/6: no stage change means no growth wording at all', buildGrowthHighlight([]) === null);
const chestRise: MuscleStageChange[] = [{ muscle: 'chest', group: 'chest', previousStage: 0, currentStage: 1 }];
expect('5: a real chest stage rise names the chest', buildGrowthHighlight(chestRise) === '가슴 성장!');
const legRise: MuscleStageChange[] = [{ muscle: 'quads', group: 'legs', previousStage: 1, currentStage: 2 }, { muscle: 'glutes', group: 'legs', previousStage: 0, currentStage: 1 }];
expect('7: two details in one group are named once', buildGrowthHighlight(legRise) === '하체 성장!');
const twoGroups: MuscleStageChange[] = [{ muscle: 'chest', group: 'chest', previousStage: 0, currentStage: 1 }, { muscle: 'lats', group: 'back', previousStage: 0, currentStage: 1 }];
expect('7: two real groups are both named', buildGrowthHighlight(twoGroups) === '가슴 · 등 성장!');
const manyGroups: MuscleStageChange[] = [{ muscle: 'chest', group: 'chest', previousStage: 0, currentStage: 1 }, { muscle: 'lats', group: 'back', previousStage: 0, currentStage: 1 }, { muscle: 'quads', group: 'legs', previousStage: 0, currentStage: 1 }];
expect('7: more than two groups stay on one line', buildGrowthHighlight(manyGroups) === '가슴 · 등 외 1곳 성장!');
const highlightSnapshot = JSON.stringify(twoGroups);
buildGrowthHighlight(twoGroups);
buildGrowthHighlight(twoGroups);
expect('8/9: building the highlight repeatedly never changes the growth result', JSON.stringify(twoGroups) === highlightSnapshot);
expect('10: reduced motion still resolves to a single AFTER phase', JSON.stringify(buildGrowthRevealSequence({ permanentChanged: true, reducedMotion: true })) === JSON.stringify(['after']));


// ── 실제 성장 비교 카메라: 확대만 하고 성장은 만들지 않는다 ─────────────────
const change = (muscle: MuscleGroupDetail, group: MuscleStageChange['group']): MuscleStageChange =>
  ({ muscle, group, previousStage: 0, currentStage: 1 });

expect('A: no stage change means there is no comparison focus at all', resolveGrowthFocus([]) === null);
expect('A: no stage change means no zoom camera is built', resolveGrowthComparisonCamera([]) === null);

expect('B: a chest stage rise focuses the upper body', resolveGrowthFocus([change('chest', 'chest')]) === 'upper');
expect('C: a back stage rise focuses the upper body', resolveGrowthFocus([change('lats', 'back')]) === 'upper');
expect('C: a shoulder stage rise focuses the upper body', resolveGrowthFocus([change('sideDelts', 'shoulders')]) === 'upper');
expect('C: an arm stage rise focuses the upper body', resolveGrowthFocus([change('biceps', 'arms')]) === 'upper');
expect('C: chest and arms together stay on one upper camera', resolveGrowthFocus([change('chest', 'chest'), change('triceps', 'arms')]) === 'upper');

expect('D: a quad stage rise focuses the lower body', resolveGrowthFocus([change('quads', 'legs')]) === 'lower');
expect('D: glutes and calves stay on one lower camera', resolveGrowthFocus([change('glutes', 'legs'), change('calves', 'legs')]) === 'lower');

expect('E: an abs stage rise focuses the core', resolveGrowthFocus([change('abs', 'core')]) === 'core');

expect('F: upper and lower rising together fall back to the full body', resolveGrowthFocus([change('chest', 'chest'), change('quads', 'legs')]) === 'full');
expect('F: a fullBody stage rise focuses the full body', resolveGrowthFocus([change('abs', 'fullBody')]) === 'full');

const unknownGroup = [{ muscle: 'chest', group: 'unmappedGroup', previousStage: 0, currentStage: 1 }] as unknown as MuscleStageChange[];
expect('G: an unknown muscle group falls back to the full body', resolveGrowthFocus(unknownGroup) === 'full');

// H. BEFORE/AFTER는 같은 카메라를 써야 한다 — 배율/이동/창이 하나라도 다르면 착시가 생긴다.
const beforeCamera = resolveGrowthComparisonCamera([change('chest', 'chest')]);
const afterCamera = resolveGrowthComparisonCamera([change('chest', 'chest')]);
expect('H: the same stage change always resolves to the identical camera', JSON.stringify(beforeCamera) === JSON.stringify(afterCamera));
expect('H: the camera keeps the CANON viewBox height as the character height', beforeCamera?.characterHeight === 280);
expect('H: both sides share one clipped viewport height', beforeCamera?.viewportHeight === afterCamera?.viewportHeight);
expect('H: rebuilding a focus twice gives the same zoom and offset', JSON.stringify(buildGrowthComparisonCamera('upper')) === JSON.stringify(buildGrowthComparisonCamera('upper')));

// 실제로 확대가 일어나야 의미가 있다. 기존 비교는 105/280 = 0.375배였다.
const oldComparisonScale = 105 / 280;
(['upper', 'lower', 'core', 'full'] as const).forEach((focus) => {
  const camera = buildGrowthComparisonCamera(focus);
  expect(`H: the ${focus} camera magnifies beyond the old shrunken comparison`, camera.zoom > oldComparisonScale * 1.5);
  expect(`H: the ${focus} camera stays within a readable zoom`, camera.zoom <= 2.4);
});

// I. 카메라는 BodyParameters를 읽지도 바꾸지도 않는다.
const cameraSafetyBefore = params(.1);
const cameraSafetyAfter = params(.18);
const cameraSafetySnapshot = JSON.stringify([cameraSafetyBefore, cameraSafetyAfter]);
resolveGrowthComparisonCamera([change('chest', 'chest')]);
buildGrowthComparisonCamera('lower');
expect('I: building the comparison camera never mutates the compared bodies', JSON.stringify([cameraSafetyBefore, cameraSafetyAfter]) === cameraSafetySnapshot);
expect('I: the compared bodies are still the exact session snapshots', revealBodyParameters('before', { bodyParametersWithPump: pumpBody, bodyParametersBefore: cameraSafetyBefore, bodyParametersAfter: cameraSafetyAfter }) === cameraSafetyBefore);
const stageChangeInput = [change('chest', 'chest')];
const stageChangeSnapshot = JSON.stringify(stageChangeInput);
resolveGrowthComparisonCamera(stageChangeInput);
expect('I: resolving a focus never mutates the GrowthEngine stage changes', JSON.stringify(stageChangeInput) === stageChangeSnapshot);

// J/L. 확대를 붙여도 기존 reveal 계약은 그대로다.
expect('J: BEFORE -> PUMP -> AFTER still holds with the zoom camera in place', JSON.stringify(buildGrowthRevealSequence({ permanentChanged: true, reducedMotion: false })) === JSON.stringify(['before', 'pump', 'after']));
expect('J: an unchanged session still runs PUMP -> AFTER', JSON.stringify(buildGrowthRevealSequence({ permanentChanged: false, reducedMotion: false })) === JSON.stringify(['pump', 'after']));
expect('L: reduced motion still lands straight on the permanent body', JSON.stringify(buildGrowthRevealSequence({ permanentChanged: false, reducedMotion: true })) === JSON.stringify(['after']));

// K. 성장 문구와 카메라는 같은 stageChanges 하나에서만 나온다.
expect('K: no stage change means neither growth wording nor zoom exists', buildGrowthHighlight([]) === null && resolveGrowthComparisonCamera([]) === null);
expect('K: a real stage rise produces both the wording and the camera', buildGrowthHighlight([change('quads', 'legs')]) === '하체 성장!' && resolveGrowthComparisonCamera([change('quads', 'legs')])?.focus === 'lower');

console.log(failures === 0 ? '\nAll GROWTH REVEAL checks passed.' : `\n${failures} GROWTH REVEAL check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
