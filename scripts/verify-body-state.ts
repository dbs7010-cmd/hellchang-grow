// Standalone verification for the DANBAEK BODY STATE layer:
// 근육 stage → 시각 파라미터(비선형/부위별), 체지방 우선순위(측정 > 추정 > 기본),
// definition 조합(근육×저지방), 체형 label, 펌핑의 비영속성, body 저장값 migration.
// Run: npm run verify:body
import { BodyStateConfig } from '@/config/body-state-config';
import { GrowthConfig } from '@/config/growth-config';
import type { BodyHistoryEntry } from '@/types/body';
import type { NutritionState } from '@/types/body-state';
import { MuscleGroupDetails, type MuscleGroupDetail } from '@/types/exercise';
import type { DanbaekGrowthState } from '@/types/growth';
import { applyPumpToBodyParameters, toDanbaekBodyParameters } from '@/utils/body-parameters';
import {
  buildDanbaekBodyState,
  computeDefinitionStage,
  computeMuscleMassScore,
  computeWeightTrend,
  deriveShapeProfile,
  fatStageFromBodyFatPercent,
  findLatestBodyFatPercent,
  groupMuscleStages,
  muscleStageToVisualScale,
  resolveFatStage,
} from '@/utils/body-state';
import { createDefaultGrowthState, migrateGrowthState, updateBodyComposition } from '@/utils/growth-state';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (!pass) {
    failures++;
    console.log('  expected:', expected);
    console.log('  actual:  ', actual);
  }
}

/** 값 자체가 아니라 관계를 보는 검증 — 밸런스 숫자를 조정해도 살아남는다. */
function expect(name: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) {
    failures++;
    if (detail !== undefined) console.log('  detail:', detail);
  }
}

const NOW_ISO = '2026-08-22T09:00:00.000Z';

/** 부위별 stage를 지정해 성장 상태를 만든다 (SP는 stage와 무관하게 두어도 표현은 stage만 본다). */
function growthWithStages(stages: Partial<Record<MuscleGroupDetail, number>>): DanbaekGrowthState {
  const state = createDefaultGrowthState(NOW_ISO);
  const muscles = { ...state.muscles };
  for (const muscle of MuscleGroupDetails) {
    const stage = stages[muscle] ?? 0;
    muscles[muscle] = {
      totalSp: stage > 0 ? GrowthConfig.stageThresholds[stage] : 0,
      currentStage: stage,
    };
  }
  return { ...state, muscles };
}

function allStages(stage: number): Partial<Record<MuscleGroupDetail, number>> {
  return Object.fromEntries(MuscleGroupDetails.map((muscle) => [muscle, stage]));
}

function bodyEntry(overrides: Partial<BodyHistoryEntry>): BodyHistoryEntry {
  return {
    id: 'b',
    date: '2026-08-20',
    weightKg: 75,
    source: 'manual',
    ...overrides,
  };
}

function buildState(input: {
  stages?: Partial<Record<MuscleGroupDetail, number>>;
  bodyHistory?: BodyHistoryEntry[];
  nutritionState?: NutritionState;
}) {
  return buildDanbaekBodyState({
    growth: growthWithStages(input.stages ?? {}),
    bodyHistory: input.bodyHistory ?? [],
    nutritionState: input.nutritionState,
    nowIso: NOW_ISO,
  });
}

function parametersFor(input: Parameters<typeof buildState>[0]) {
  return toDanbaekBodyParameters(buildState(input));
}

/** 체지방을 특정 stage로 고정하기 위한 신체 기록 (측정값 우선순위를 이용한다). */
function fatHistory(percent: number): BodyHistoryEntry[] {
  return [bodyEntry({ bodyFatPercent: percent })];
}

// ── 1. 근육 stage → 시각 파라미터 (테스트 1, 11) ────────────────────────────
{
  const low = parametersFor({ stages: allStages(1) });
  const high = parametersFor({ stages: allStages(5) });
  expect('a higher muscle stage means more overall mass', high.overallMass > low.overallMass, {
    low: low.overallMass,
    high: high.overallMass,
  });

  const table = BodyStateConfig.muscleStageVisualScale;
  check('stage 0 is the baseline body', muscleStageToVisualScale(0), 0);
  check('stage 5 is the exaggerated maximum', muscleStageToVisualScale(5), 1);
  expect(
    'the visual scale grows non-linearly — late stages change far more than early ones',
    table[1] - table[0] < table[2] - table[1] &&
      table[2] - table[1] < table[3] - table[2] &&
      table[3] - table[2] < table[4] - table[3] &&
      table[4] - table[3] < table[5] - table[4],
    table
  );
  expect(
    'stage 5 is dramatically bigger than stage 1, not merely double',
    muscleStageToVisualScale(5) > muscleStageToVisualScale(1) * 5,
    { stage1: muscleStageToVisualScale(1), stage5: muscleStageToVisualScale(5) }
  );
  check('an out-of-range stage is clamped, never NaN', muscleStageToVisualScale(99), 1);
}

// ── 2. 부위별 차이 보존 (테스트 2, 3) ───────────────────────────────────────
{
  const chestFocus = parametersFor({ stages: { chest: 5 } });
  expect('training only the chest moves chestScale', chestFocus.chestScale === 1, chestFocus);
  expect(
    'training only the chest leaves the legs alone',
    chestFocus.thighScale === 0 && chestFocus.gluteScale === 0 && chestFocus.calfScale === 0,
    chestFocus
  );
  expect(
    'one muscle at maximum does not max out the whole body',
    chestFocus.overallMass < 0.4,
    chestFocus.overallMass
  );

  const legFocus = parametersFor({ stages: { quads: 5, hamstrings: 5, glutes: 5, calves: 5 } });
  expect(
    'training only the lower body moves thighs / glutes / calves',
    legFocus.thighScale === 1 && legFocus.gluteScale === 1 && legFocus.calfScale === 1,
    legFocus
  );
  check('...and leaves the chest untouched', legFocus.chestScale, 0);
  expect(
    'lower body work builds more overall mass than chest-only work (bigger muscles)',
    legFocus.overallMass > chestFocus.overallMass,
    { chest: chestFocus.overallMass, legs: legFocus.overallMass }
  );

  const shoulderFocus = parametersFor({ stages: { sideDelts: 5 } });
  expect(
    'side delts widen the shoulders without touching the arms',
    shoulderFocus.shoulderScale > 0 && shoulderFocus.armScale === 0,
    shoulderFocus
  );
  const backFocus = parametersFor({ stages: { lats: 5 } });
  expect(
    'lats drive back width more than back thickness',
    backFocus.backWidth > backFocus.backThickness,
    backFocus
  );
  const upperBackFocus = parametersFor({ stages: { upperBack: 5 } });
  expect(
    'upper back drives thickness more than width',
    upperBackFocus.backThickness > upperBackFocus.backWidth,
    upperBackFocus
  );

  // 세부 → 묶음은 파생일 뿐, 세부 값은 그대로 남는다.
  const grouped = groupMuscleStages({
    ...(Object.fromEntries(MuscleGroupDetails.map((m) => [m, 0])) as Record<MuscleGroupDetail, number>),
    frontDelts: 3,
    sideDelts: 3,
    rearDelts: 0,
  });
  check('grouped shoulders average the three delts', grouped.shoulders, 2);
  check('grouping does not invent muscle elsewhere', grouped.chest, 0);
  const state = buildState({ stages: { frontDelts: 3 } });
  check('the detailed stages survive grouping', state.muscleStages.frontDelts, 3);
}

// ── 3. 체지방 우선순위 (테스트 8, 9) ────────────────────────────────────────
{
  check('a measured body fat percentage maps to a fat stage', fatStageFromBodyFatPercent(12), 1);
  check('a high measured percentage maps to a high stage', fatStageFromBodyFatPercent(32), 5);

  const measured = resolveFatStage({
    bodyFatPercent: 11,
    weightTrend: 'gaining',
    nutritionState: 'poor',
  });
  check('a real measurement wins over the estimate', measured.source, 'measured');
  check('...and uses the measured value, not the trend', measured.stage, fatStageFromBodyFatPercent(11));

  const estimated = resolveFatStage({
    weightTrend: 'gaining',
    nutritionState: 'poor',
    bodyFatPercent: undefined,
  });
  check('without a measurement, two signals produce an estimate', estimated.source, 'estimated');
  expect(
    'gaining weight with poor nutrition estimates a higher fat stage',
    estimated.stage > BodyStateConfig.fat.defaultStage,
    estimated
  );

  const cutting = resolveFatStage({
    weightTrend: 'losing',
    nutritionState: 'good',
    bodyFatPercent: undefined,
  });
  expect('losing weight with good nutrition estimates a lower fat stage',
    cutting.stage < BodyStateConfig.fat.defaultStage, cutting);

  const oneSignal = resolveFatStage({
    weightTrend: 'gaining',
    nutritionState: 'unknown',
    bodyFatPercent: undefined,
  });
  check('a single signal is not enough to claim an estimate', oneSignal.source, 'default');
  check('...and falls back to the neutral stage', oneSignal.stage, BodyStateConfig.fat.defaultStage);

  const noData = buildState({});
  check('a user with no body data still gets a usable state', noData.fatStageSource, 'default');
  check('...at the neutral fat stage', noData.fatStage, BodyStateConfig.fat.defaultStage);
  check('...with no nutrition claim', noData.nutritionState, 'unknown');
  check('...and no invented weight trend', noData.weightTrend, 'unknown');

  check(
    'the latest measurement is the one that counts',
    findLatestBodyFatPercent([
      bodyEntry({ date: '2026-08-01', bodyFatPercent: 25 }),
      bodyEntry({ date: '2026-08-20', bodyFatPercent: 14 }),
    ]),
    14
  );
  check('no measurement means none is invented', findLatestBodyFatPercent([bodyEntry({})]), undefined);
}

// ── 4. 체중 추세 ────────────────────────────────────────────────────────────
{
  check(
    'a single record cannot establish a trend',
    computeWeightTrend([bodyEntry({ date: '2026-08-20', weightKg: 75 })], NOW_ISO),
    'unknown'
  );
  check(
    'day-to-day noise stays "stable"',
    computeWeightTrend(
      [
        bodyEntry({ date: '2026-08-14', weightKg: 75 }),
        bodyEntry({ date: '2026-08-21', weightKg: 75.4 }),
      ],
      NOW_ISO
    ),
    'stable'
  );
  check(
    'a sustained rise reads as gaining',
    computeWeightTrend(
      [
        bodyEntry({ date: '2026-08-08', weightKg: 74 }),
        bodyEntry({ date: '2026-08-21', weightKg: 77 }),
      ],
      NOW_ISO
    ),
    'gaining'
  );
  check(
    'a sustained drop reads as losing',
    computeWeightTrend(
      [
        bodyEntry({ date: '2026-08-08', weightKg: 80 }),
        bodyEntry({ date: '2026-08-21', weightKg: 76 }),
      ],
      NOW_ISO
    ),
    'losing'
  );
  check(
    'records older than the window are ignored',
    computeWeightTrend(
      [
        bodyEntry({ date: '2025-01-01', weightKg: 60 }),
        bodyEntry({ date: '2026-08-21', weightKg: 77 }),
      ],
      NOW_ISO
    ),
    'unknown'
  );
}

// ── 5. 네 가지 조합 (테스트 4, 5, 6, 7) ─────────────────────────────────────
{
  const lean = buildState({ stages: allStages(1), bodyHistory: fatHistory(9) });
  const shredded = buildState({ stages: allStages(5), bodyHistory: fatHistory(9) });
  const bulky = buildState({ stages: allStages(5), bodyHistory: fatHistory(32) });
  const soft = buildState({ stages: allStages(1), bodyHistory: fatHistory(32) });

  const p = {
    lean: toDanbaekBodyParameters(lean),
    shredded: toDanbaekBodyParameters(shredded),
    bulky: toDanbaekBodyParameters(bulky),
    soft: toDanbaekBodyParameters(soft),
  };

  expect('high muscle + low fat gives the highest definition',
    shredded.definitionStage > lean.definitionStage && shredded.definitionStage > bulky.definitionStage,
    { shredded: shredded.definitionStage, lean: lean.definitionStage, bulky: bulky.definitionStage });
  expect('high muscle + low fat is near the top of the definition scale',
    shredded.definitionStage >= 4, shredded.definitionStage);

  expect('low muscle + low fat is lean, not a shredded monster',
    lean.definitionStage < shredded.definitionStage && lean.definitionStage <= 2,
    lean.definitionStage);
  expect('...and stays small overall', p.lean.overallMass < p.shredded.overallMass);

  expect('high muscle + high fat is big but not defined',
    p.bulky.overallMass > p.lean.overallMass && bulky.definitionStage <= 2,
    { mass: p.bulky.overallMass, definition: bulky.definitionStage });
  expect('...and carries a thicker waist than the shredded body',
    p.bulky.waistScale > p.shredded.waistScale,
    { bulky: p.bulky.waistScale, shredded: p.shredded.waistScale });

  expect('low muscle + high fat is soft: little definition, soft silhouette',
    soft.definitionStage === 0 && p.soft.fatSoftness > p.lean.fatSoftness,
    { definition: soft.definitionStage, softness: p.soft.fatSoftness });
  expect('...and is not mistaken for a big body',
    p.soft.overallMass < p.bulky.overallMass,
    { soft: p.soft.overallMass, bulky: p.bulky.overallMass });

  // 같은 근육 stage라도 지방/식단이 다르면 다른 파라미터가 나와야 한다 (완료 조건).
  expect('the same muscle stages with different fat produce different parameters',
    JSON.stringify(p.shredded) !== JSON.stringify(p.bulky));
  const neutralNutrition = buildState({ stages: allStages(3) });
  const poorNutrition = buildState({
    stages: allStages(3),
    nutritionState: 'poor',
    bodyHistory: [
      bodyEntry({ date: '2026-08-08', weightKg: 74 }),
      bodyEntry({ date: '2026-08-21', weightKg: 78 }),
    ],
  });
  expect('...and nutrition + weight gain alone changes the outcome too',
    poorNutrition.fatStage > neutralNutrition.fatStage,
    { neutral: neutralNutrition.fatStage, poor: poorNutrition.fatStage });

  // 체형 label은 설명일 뿐이지만, 네 방향이 서로 달라야 쓸모가 있다.
  check('the shredded body reads as muscular', shredded.shapeProfile, 'muscular');
  check('the bulky body reads as massive', bulky.shapeProfile, 'massive');
  check('the soft body reads as soft', soft.shapeProfile, 'soft');
  check('the lean body reads as lean', lean.shapeProfile, 'lean');

  console.log('\n  [debug] 네 가지 시나리오 (근육 stage 전신 1 또는 5 / 체지방 9% 또는 32%)');
  for (const [name, state] of [
    ['마른   ', lean],
    ['선명한 ', shredded],
    ['근돼   ', bulky],
    ['말랑   ', soft],
  ] as const) {
    const params = toDanbaekBodyParameters(state);
    console.log(
      `    ${name} muscle ${state.muscleMassScore} · fat ${state.fatStage} · def ${state.definitionStage}` +
        ` · ${state.shapeProfile} → mass ${params.overallMass} / waist ${params.waistScale}` +
        ` / abs ${params.abdomenDefinition} / soft ${params.fatSoftness}`
    );
  }
  console.log('');
}

// ── 6. definition 공식 자체 ─────────────────────────────────────────────────
{
  check('no muscle and maximum fat means no definition',
    computeDefinitionStage({ muscleMassScore: 0, fatStage: 5 }), 0);
  expect('maximum muscle at zero fat reaches the top of the scale',
    computeDefinitionStage({ muscleMassScore: 1, fatStage: 0 }) === 5);
  expect('being lean without muscle only gives a hint of definition',
    computeDefinitionStage({ muscleMassScore: 0, fatStage: 0 }) <= 2,
    computeDefinitionStage({ muscleMassScore: 0, fatStage: 0 }));
  expect('at equal fat, more muscle always means more definition',
    computeDefinitionStage({ muscleMassScore: 0.8, fatStage: 2 }) >
      computeDefinitionStage({ muscleMassScore: 0.2, fatStage: 2 }));
  expect('at equal muscle, more fat always means less definition',
    computeDefinitionStage({ muscleMassScore: 0.8, fatStage: 1 }) >
      computeDefinitionStage({ muscleMassScore: 0.8, fatStage: 4 }));

  check('an empty body scores zero muscle mass',
    computeMuscleMassScore(Object.fromEntries(MuscleGroupDetails.map((m) => [m, 0])) as Record<MuscleGroupDetail, number>),
    0);
  check('a maxed body scores full muscle mass',
    computeMuscleMassScore(Object.fromEntries(MuscleGroupDetails.map((m) => [m, 5])) as Record<MuscleGroupDetail, number>),
    1);

  check('shape profiles never fall through to nothing',
    typeof deriveShapeProfile({ muscleMassScore: 0.5, fatStage: 3 }), 'string');
}

// ── 7. Pump는 일시값이다 (테스트 10) ────────────────────────────────────────
{
  const growth = growthWithStages(allStages(2));
  const state = buildDanbaekBodyState({ growth, bodyHistory: [], nowIso: NOW_ISO });
  const base = toDanbaekBodyParameters(state);
  const pumped = applyPumpToBodyParameters(base, { chest: 30, triceps: 15 });

  expect('pump makes the trained muscle temporarily bigger',
    pumped.chestScale > base.chestScale, { base: base.chestScale, pumped: pumped.chestScale });
  expect('pump reaches the configured ceiling and no further',
    pumped.chestScale - base.chestScale <= BodyStateConfig.pump.maxBoost + 0.001);
  expect('an untrained muscle is not pumped',
    pumped.thighScale === base.thighScale);
  check('pump does not touch fat softness', pumped.fatSoftness, base.fatSoftness);
  check('pump does not touch definition', pumped.definition, base.definition);

  check('the permanent parameters are left untouched (a new object is returned)',
    base.chestScale, toDanbaekBodyParameters(state).chestScale);
  check('pump never enters the saved growth state',
    growth.muscles.chest.currentStage, growthWithStages(allStages(2)).muscles.chest.currentStage);
  check('...and the growth state has no pump field at all',
    (growth as unknown as { pumpByMuscle?: unknown }).pumpByMuscle, undefined);
  check('an empty pump changes nothing', applyPumpToBodyParameters(base, {}), base);
}

// ── 8. 저장과 migration (테스트 12, 13) ─────────────────────────────────────
{
  const grown = growthWithStages({ chest: 3, quads: 2 });
  const withBody = updateBodyComposition(
    grown,
    { fatStage: 2, fatStageSource: 'measured', definitionStage: 3, nutritionState: 'good' },
    NOW_ISO
  );

  check('the body axis is stored on the existing growth state', withBody.body?.fatStage, 2);
  check('nutrition input is stored', withBody.body?.nutritionState, 'good');
  check('the calculation time is recorded', withBody.body?.lastCalculatedAt, NOW_ISO);
  check('muscle stages are untouched by a body update', withBody.muscles.chest.currentStage, 3);
  check('muscle SP is untouched by a body update', withBody.muscles.chest.totalSp, grown.muscles.chest.totalSp);
  check('the daily SP tally is untouched', withBody.daily, grown.daily);

  // 앱 재실행 = 저장된 JSON을 다시 읽어 migrate하는 것과 같다.
  const reloaded = migrateGrowthState(JSON.parse(JSON.stringify(withBody)), '2026-08-23T08:00:00.000Z');
  check('the body axis survives a save/load round trip', reloaded.body?.fatStage, 2);
  check('the fat source survives too (an estimate never becomes a measurement)',
    reloaded.body?.fatStageSource, 'measured');
  check('nutrition survives a restart', reloaded.body?.nutritionState, 'good');
  check('muscle SP survives alongside it', reloaded.muscles.chest.totalSp, grown.muscles.chest.totalSp);
  check('muscle stages survive alongside it', reloaded.muscles.chest.currentStage, 3);

  // GROWTH ENGINE 시절 사용자: body가 아예 없다.
  const legacy = migrateGrowthState(
    JSON.parse(JSON.stringify({ ...grown, body: undefined })),
    NOW_ISO
  );
  check('an existing user with no body data keeps their muscle SP', legacy.muscles.chest.totalSp, grown.muscles.chest.totalSp);
  check('...and no body values are invented in storage', legacy.body, undefined);
  const legacyState = buildDanbaekBodyState({ growth: legacy, bodyHistory: [], nowIso: NOW_ISO });
  check('...while the runtime state still resolves to a safe neutral', legacyState.fatStageSource, 'default');
  check('...and their muscle stages still drive the body', legacyState.muscleStages.chest, 3);

  // 깨진/낡은 값이 들어 있어도 근육 데이터를 잃지 않는다.
  const corrupted = migrateGrowthState(
    { ...JSON.parse(JSON.stringify(grown)), body: { nutritionState: 'wat', fatStage: 'nope' } } as never,
    NOW_ISO
  );
  check('an unknown nutrition value is dropped rather than trusted', corrupted.body?.nutritionState, undefined);
  check('a non-numeric fat stage is dropped', corrupted.body?.fatStage, undefined);
  check('muscle data survives a corrupted body block', corrupted.muscles.chest.currentStage, 3);
}

console.log(
  failures === 0 ? '\nAll BODY STATE checks passed.' : `\n${failures} BODY STATE check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
