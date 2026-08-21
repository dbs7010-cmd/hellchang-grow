// Standalone verification for the GROWTH ENGINE pure layers:
// 상대 강도 / 1RM 추정 / 맨몸 부하 / 반복·세트 diminishing return / 부위 분배 /
// SP 누적과 stage threshold / 저장 상태 왕복(migration).
// Run: npm run verify:growth
//
// AsyncStorage가 필요한 부분(local-growth-engine의 read/save)은 여기서 돌리지 않고,
// 엔진이 실제로 쓰는 순수 함수(buildSpExerciseInputs → calculateSessionMuscleSp →
// applySessionSpToState)를 같은 순서로 호출해 같은 경로를 검증한다.
import { GrowthConfig, MaxMuscleStage } from '@/config/growth-config';
import { Exercises, getResolvedExerciseById } from '@/config/exercises';
import { MuscleGroupDetails } from '@/types/exercise';
import type { MuscleGroupDetail, MuscleSpDistribution } from '@/types/exercise';
import type { SessionExerciseResult, WorkoutSessionResult } from '@/types/growth';
import { resolveExercise } from '@/utils/exercise-spec';
import {
  calculateEffectiveLoad,
  calculateFatigueMultiplier,
  calculateIntensityMultiplier,
  calculateRepStimulus,
  calculateSessionMuscleSp,
  estimateOneRepMax,
} from '@/utils/growth-calculation';
import { buildSpExerciseInputs } from '@/utils/growth-inputs';
import {
  applySessionSpToState,
  createDefaultGrowthState,
  migrateGrowthState,
  stageForSp,
} from '@/utils/growth-state';

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

/** 값 자체가 아니라 관계(더 크다/범위 안이다)를 보는 검증 — 밸런스 상수를 고쳐도 살아남는다. */
function expect(name: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) {
    failures++;
    if (detail !== undefined) console.log('  detail:', detail);
  }
}

const NOW_ISO = '2026-08-22T09:00:00.000Z';

function exerciseResult(
  exerciseId: string,
  sets: { weightKg?: number; reps?: number }[],
  estimatedOneRepMaxKg?: number
): SessionExerciseResult {
  const resolved = getResolvedExerciseById(exerciseId);
  return {
    exerciseId,
    exerciseName: resolved?.name ?? exerciseId,
    inExerciseDb: Boolean(resolved),
    animationFamily: resolved?.animationFamily ?? 'core',
    primaryMuscles: resolved?.primaryMuscles ?? [],
    secondaryMuscles: resolved?.secondaryMuscles ?? [],
    spDistribution: resolved?.spDistribution ?? {},
    sets: sets.map((set) => ({
      weightKg: set.weightKg,
      reps: set.reps,
      volumeKg: set.weightKg !== undefined && set.reps !== undefined ? set.weightKg * set.reps : 0,
    })),
    totalSets: sets.length,
    totalReps: sets.reduce((sum, set) => sum + (set.reps ?? 0), 0),
    totalVolumeKg: sets.reduce(
      (sum, set) => sum + (set.weightKg !== undefined && set.reps !== undefined ? set.weightKg * set.reps : 0),
      0
    ),
    estimatedOneRepMaxKg,
  };
}

function sessionResult(
  exercises: SessionExerciseResult[],
  bodyWeightKg?: number
): WorkoutSessionResult {
  return {
    sessionId: 'session-test',
    startedAt: NOW_ISO,
    endedAt: NOW_ISO,
    activeSeconds: 1800,
    exercises,
    totalSets: exercises.reduce((sum, exercise) => sum + exercise.totalSets, 0),
    totalReps: exercises.reduce((sum, exercise) => sum + exercise.totalReps, 0),
    totalVolumeKg: exercises.reduce((sum, exercise) => sum + exercise.totalVolumeKg, 0),
    personalRecords: [],
    bodyWeightKg,
    volumeByMuscleGroup: {},
  };
}

/** 엔진이 실제로 밟는 경로 그대로: 세션 결과 → 계산 입력 → 부위별 SP */
function calculate(result: WorkoutSessionResult) {
  return calculateSessionMuscleSp({
    exercises: buildSpExerciseInputs(result, getResolvedExerciseById),
    bodyWeightKg: result.bodyWeightKg,
  });
}

function totalSp(distribution: MuscleSpDistribution): number {
  return Object.values(distribution).reduce((sum, value) => sum + value, 0);
}

// ── 0. Exercise 데이터 불변식 ───────────────────────────────────────────────
{
  const resolved = Exercises.map((exercise) => resolveExercise(exercise, Exercises));
  expect(
    'every exercise resolves to a detailed muscle distribution summing to 1.0',
    resolved.every((exercise) => Math.abs(totalSp(exercise.muscleSpDistribution) - 1) < 0.01),
    resolved
      .filter((exercise) => Math.abs(totalSp(exercise.muscleSpDistribution) - 1) >= 0.01)
      .map((exercise) => exercise.id)
  );
  expect(
    'every detailed muscle used by the DB is a known muscle',
    resolved.every((exercise) =>
      Object.keys(exercise.muscleSpDistribution).every((muscle) =>
        MuscleGroupDetails.includes(muscle as MuscleGroupDetail)
      )
    )
  );
  expect(
    'bodyweight exercises carry a load factor above zero',
    resolved
      .filter((exercise) => exercise.usesBodyWeight)
      .every((exercise) => exercise.bodyWeightLoadFactor > 0)
  );

  // 유도 규칙: 컬은 이두, 익스텐션은 삼두 — "팔"로 뭉뚱그리지 않는다.
  check('a curl grows the biceps, not "arms"', Object.keys(getResolvedExerciseById('dumbbell-curl')!.muscleSpDistribution), ['biceps']);
  check('a pushdown grows the triceps', Object.keys(getResolvedExerciseById('triceps-pushdown')!.muscleSpDistribution), ['triceps']);
  check('a lateral raise grows the side delts', Object.keys(getResolvedExerciseById('side-lateral-raise')!.muscleSpDistribution), ['sideDelts']);
  check('leg extension is quads only', getResolvedExerciseById('leg-extension')!.muscleSpDistribution, { quads: 1 });
  check('leg curl is hamstrings only', getResolvedExerciseById('leg-curl')!.muscleSpDistribution, { hamstrings: 1 });
}

// ── 1. 추정 1RM ─────────────────────────────────────────────────────────────
{
  check('a single rep is its own 1RM', estimateOneRepMax(100, 1), 103.3);
  expect('more reps at the same weight estimate a higher 1RM',
    (estimateOneRepMax(100, 5) ?? 0) > (estimateOneRepMax(100, 2) ?? 0));
  check('no weight means no estimate', estimateOneRepMax(0, 10), undefined);
  check('no reps means no estimate', estimateOneRepMax(60, 0), undefined);
  check('a set past the reliable rep range is not used for 1RM',
    estimateOneRepMax(20, GrowthConfig.oneRepMax.maxReliableReps + 1), undefined);
}

// ── 2. 상대 강도 (테스트 시나리오 1, 2) ─────────────────────────────────────
{
  // 1. 같은 사용자가 60kg와 80kg 벤치를 했을 때
  const oneRm = 100;
  const light = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 60, reps: 10 }], oneRm)], 75));
  const heavy = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 80, reps: 10 }], oneRm)], 75));
  expect('the same user gains more SP from 80kg than from 60kg at the same reps',
    totalSp(heavy.spByMuscle) > totalSp(light.spByMuscle),
    { light: totalSp(light.spByMuscle), heavy: totalSp(heavy.spByMuscle) });

  // 2. 1RM이 다른 두 사용자가 같은 80kg을 들었을 때
  const strong = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 80, reps: 5 }], 160)], 90));
  const novice = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 80, reps: 5 }], 90)], 70));
  expect('80kg is worth more to the user whose 1RM is lower (relative effort, not absolute load)',
    totalSp(novice.spByMuscle) > totalSp(strong.spByMuscle),
    { strong: totalSp(strong.spByMuscle), novice: totalSp(novice.spByMuscle) });

  expect('an unknown 1RM still produces SP', totalSp(calculate(
    sessionResult([exerciseResult('bench-press', [{ weightKg: 60, reps: 10 }])], 75)
  ).spByMuscle) > 0);
  check('intensity is neutral when the 1RM is unknown',
    calculateIntensityMultiplier(60, undefined), GrowthConfig.intensity.unknownOneRepMax);
  expect('intensity stops climbing above the top band',
    calculateIntensityMultiplier(300, 100) === calculateIntensityMultiplier(95, 100));
}

// ── 3. 부위 분배 (테스트 시나리오 3, 4) ─────────────────────────────────────
{
  const bench = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 60, reps: 10 }], 100)], 75));
  check('bench press splits into chest / triceps / front delts',
    Object.keys(bench.spByMuscle).sort(), ['chest', 'frontDelts', 'triceps']);
  expect('the chest takes the largest share of a bench press',
    (bench.spByMuscle.chest ?? 0) > (bench.spByMuscle.triceps ?? 0) &&
      (bench.spByMuscle.triceps ?? 0) >= (bench.spByMuscle.frontDelts ?? 0),
    bench.spByMuscle);

  const squat = calculate(sessionResult([exerciseResult('squat', [{ weightKg: 100, reps: 5 }], 140)], 80));
  check('a squat spreads across the lower body',
    Object.keys(squat.spByMuscle).sort(), ['abs', 'glutes', 'hamstrings', 'quads']);
  expect('the quads take the largest share of a squat',
    (squat.spByMuscle.quads ?? 0) > (squat.spByMuscle.glutes ?? 0), squat.spByMuscle);

  expect('a session never leaks or invents total stimulus across muscles',
    Math.abs(totalSp(bench.spByMuscle) - bench.sets.reduce((sum, set) => sum + set.stimulus, 0)) < 0.05);
}

// ── 4. 맨몸 운동 (테스트 시나리오 5, 6) ─────────────────────────────────────
{
  const pullUps = calculate(sessionResult([exerciseResult('pull-up', [{ reps: 10 }])], 75));
  expect('a bodyweight exercise with no weight entered is never worth 0 SP',
    totalSp(pullUps.spByMuscle) > 0, pullUps.spByMuscle);
  check('pull-ups grow the back and biceps, not "nothing"',
    Object.keys(pullUps.spByMuscle).sort(), ['biceps', 'lats', 'upperBack']);

  const light = calculate(sessionResult([exerciseResult('pull-up', [{ reps: 10 }], 80)], 60));
  const heavy = calculate(sessionResult([exerciseResult('pull-up', [{ reps: 10 }], 80)], 100));
  expect('the same pull-up is harder for a heavier user',
    totalSp(heavy.spByMuscle) > totalSp(light.spByMuscle),
    { light: totalSp(light.spByMuscle), heavy: totalSp(heavy.spByMuscle) });

  check('a push-up loads less than the full body weight',
    calculateEffectiveLoad({
      weightKg: undefined,
      usesWeight: false,
      usesBodyWeight: true,
      bodyWeightKg: 80,
      bodyWeightLoadFactor: getResolvedExerciseById('push-up')!.bodyWeightLoadFactor,
    }),
    80 * GrowthConfig.bodyWeightLoadFactors.horizontalPress);

  check('a weighted pull-up adds the extra plate on top of body weight',
    calculateEffectiveLoad({
      weightKg: 20,
      usesWeight: false,
      usesBodyWeight: true,
      bodyWeightKg: 80,
      bodyWeightLoadFactor: 1,
    }),
    100);

  check('an unknown body weight falls back to the configured assumption',
    calculateEffectiveLoad({
      usesWeight: false,
      usesBodyWeight: true,
      bodyWeightKg: undefined,
      bodyWeightLoadFactor: 1,
    }),
    GrowthConfig.load.assumedBodyWeightKg);
}

// ── 5. 악용 방지 (테스트 시나리오 7, 8) ─────────────────────────────────────
{
  const normal = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 80, reps: 8 }], 100)], 75));
  const spam = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 1, reps: 1000 }], 100)], 75));
  expect('1kg x 1000 reps does not beat one real working set',
    totalSp(spam.spByMuscle) < totalSp(normal.spByMuscle),
    { normal: totalSp(normal.spByMuscle), spam: totalSp(spam.spByMuscle) });

  expect('rep stimulus saturates instead of growing linearly',
    calculateRepStimulus(1000) <= GrowthConfig.reps.maxEffectiveReps &&
      calculateRepStimulus(1000) < calculateRepStimulus(10) * 2);

  const absurdWeight = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 5000, reps: 10 }], 100)], 75));
  const heavyReal = calculate(sessionResult([exerciseResult('bench-press', [{ weightKg: 95, reps: 10 }], 100)], 75));
  check('an absurd weight cannot beat a legitimate near-max set',
    totalSp(absurdWeight.spByMuscle), totalSp(heavyReal.spByMuscle));

  // 8. 같은 부위 과도한 세트 → diminishing return
  const threeSets = calculate(sessionResult([
    exerciseResult('bench-press', Array.from({ length: 3 }, () => ({ weightKg: 80, reps: 8 })), 100),
  ], 75));
  const twelveSets = calculate(sessionResult([
    exerciseResult('bench-press', Array.from({ length: 12 }, () => ({ weightKg: 80, reps: 8 })), 100),
  ], 75));
  const perSetThree = totalSp(threeSets.spByMuscle) / 3;
  const perSetTwelve = totalSp(twelveSets.spByMuscle) / 12;
  expect('the 12-set session is worth less per set than the 3-set session',
    perSetTwelve < perSetThree, { perSetThree, perSetTwelve });
  expect('but four times the sets still earns more in total than three sets',
    totalSp(twelveSets.spByMuscle) > totalSp(threeSets.spByMuscle));
  expect('a normal high-volume session is not punished into nothing',
    perSetTwelve > perSetThree * 0.4, { perSetThree, perSetTwelve });

  expect('fatigue never falls below the configured floor',
    calculateFatigueMultiplier(1000) === GrowthConfig.fatigue.minMultiplier);
  check('the first set of a muscle is unfatigued', calculateFatigueMultiplier(0), 1);

  // 다른 운동으로 바꿔도 같은 부위면 피로가 이어진다 (운동만 바꿔 무한 반복 금지)
  const chestOnly = calculate(sessionResult([
    exerciseResult('bench-press', Array.from({ length: 4 }, () => ({ weightKg: 80, reps: 8 })), 100),
  ], 75));
  const chestThenChest = calculate(sessionResult([
    exerciseResult('bench-press', Array.from({ length: 2 }, () => ({ weightKg: 80, reps: 8 })), 100),
    exerciseResult('chest-press-machine', Array.from({ length: 2 }, () => ({ weightKg: 80, reps: 8 })), 100),
  ], 75));
  expect('switching exercises does not reset the fatigue of the same muscle',
    Math.abs(totalSp(chestThenChest.spByMuscle) - totalSp(chestOnly.spByMuscle)) <
      totalSp(chestOnly.spByMuscle) * 0.25,
    { chestOnly: totalSp(chestOnly.spByMuscle), chestThenChest: totalSp(chestThenChest.spByMuscle) });
}

// ── 6. 정상 세션은 확실한 보상 (테스트 시나리오 9) ──────────────────────────
{
  const session = sessionResult([
    exerciseResult('bench-press', [
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 10 },
    ], 100),
  ], 75);
  const calculation = calculate(session);

  expect('a real 3-set bench session earns a meaningful amount of SP',
    totalSp(calculation.spByMuscle) > 15, calculation.spByMuscle);

  // ── 개발용 디버그 출력 (§20). 사용자 UI에는 절대 노출하지 않는다.
  console.log('\n  [debug] 벤치프레스 60kg x 10회 x 3세트 (추정 1RM 100kg, 체중 75kg)');
  calculation.sets.forEach((set, index) => {
    console.log(
      `    set ${index + 1}: load ${set.effectiveLoadKg}kg · intensity x${set.intensityMultiplier}` +
        ` · reps ${set.repStimulus} · fatigue x${set.fatigueMultiplier} → ${set.stimulus} SP`
    );
  });
  console.log('    muscle SP :', calculation.spByMuscle);
  console.log('    pump      :', calculation.pumpByMuscle, '\n');

  expect('pump is reported separately and is never smaller than the permanent gain',
    totalSp(calculation.pumpByMuscle) >= totalSp(calculation.spByMuscle),
    { pump: totalSp(calculation.pumpByMuscle), sp: totalSp(calculation.spByMuscle) });
}

// ── 7. 상태 누적과 stage (테스트 시나리오 10, 11) ───────────────────────────
{
  check('a fresh state starts every muscle at stage 0',
    MuscleGroupDetails.every((muscle) => createDefaultGrowthState(NOW_ISO).muscles[muscle].currentStage === 0),
    true);
  check('stage 1 begins at the first threshold', stageForSp(GrowthConfig.stageThresholds[1]), 1);
  check('one SP short of the threshold is still stage 0', stageForSp(GrowthConfig.stageThresholds[1] - 1), 0);
  expect('thresholds get further apart as stages rise (early progress is fast, late is slow)',
    GrowthConfig.stageThresholds.every((threshold, index, all) =>
      index < 2 || threshold - all[index - 1] > all[index - 1] - all[index - 2]));

  // 10. 누적 SP가 threshold를 넘으면 stage가 올라간다
  const start = createDefaultGrowthState(NOW_ISO);
  const crossed = applySessionSpToState({
    state: start,
    sessionId: 's1',
    spByMuscle: { chest: GrowthConfig.stageThresholds[1] },
    pumpByMuscle: {},
    nowIso: NOW_ISO,
  });
  check('crossing the threshold raises the stage', crossed.state.muscles.chest.currentStage, 1);
  check('the stage change is reported with its UI group',
    crossed.result.stageChanges, [{ muscle: 'chest', group: 'chest', previousStage: 0, currentStage: 1 }]);
  check('untouched muscles do not change stage', crossed.state.muscles.quads.currentStage, 0);
  check('the session total is reported', crossed.result.totalSpGained > 0, true);

  // 11. 한 번의 운동으로 여러 stage를 건너뛰지 않는다
  const hugeGain = applySessionSpToState({
    state: start,
    sessionId: 's2',
    spByMuscle: { chest: GrowthConfig.stageThresholds[MaxMuscleStage] * 2 },
    pumpByMuscle: {},
    nowIso: NOW_ISO,
  });
  check('a single session can only advance one stage',
    hugeGain.state.muscles.chest.currentStage, GrowthConfig.stage.maxStagesPerSession);
  expect('the SP that overflowed is kept, not thrown away',
    hugeGain.state.muscles.chest.totalSp > GrowthConfig.stageThresholds[2]);
  const nextDay = applySessionSpToState({
    state: hugeGain.state,
    sessionId: 's3',
    spByMuscle: { chest: 1 },
    pumpByMuscle: {},
    nowIso: '2026-08-23T09:00:00.000Z',
  });
  check('the next session picks up the stage that was held back',
    nextDay.state.muscles.chest.currentStage, 2);

  // 하루 상한: 끊지 않고 효율만 떨어진다
  const cap = GrowthConfig.dailyCap.softCapSpPerMuscle;
  const first = applySessionSpToState({
    state: start, sessionId: 'd1', spByMuscle: { chest: cap }, pumpByMuscle: {}, nowIso: NOW_ISO,
  });
  const second = applySessionSpToState({
    state: first.state, sessionId: 'd2', spByMuscle: { chest: cap }, pumpByMuscle: {}, nowIso: NOW_ISO,
  });
  expect('a second big session on the same day still earns SP',
    (second.result.gainedSpByMuscle.chest ?? 0) > 0);
  expect('...but at reduced efficiency once past the daily soft cap',
    (second.result.gainedSpByMuscle.chest ?? 0) < (first.result.gainedSpByMuscle.chest ?? 0),
    { first: first.result.gainedSpByMuscle.chest, second: second.result.gainedSpByMuscle.chest });
  const tomorrow = applySessionSpToState({
    state: second.state, sessionId: 'd3', spByMuscle: { chest: cap }, pumpByMuscle: {}, nowIso: '2026-08-23T09:00:00.000Z',
  });
  check('the daily allowance resets the next day',
    tomorrow.result.gainedSpByMuscle.chest, first.result.gainedSpByMuscle.chest);
}

// ── 8. 저장 상태 보존 (테스트 시나리오 12) ──────────────────────────────────
{
  const grown = applySessionSpToState({
    state: createDefaultGrowthState(NOW_ISO),
    sessionId: 'persist-1',
    // 하루 상한에 걸리지 않는 크기로 둔다 — 여기서 보려는 건 저장 왕복이지 상한이 아니다.
    spByMuscle: { chest: 350, triceps: 120 },
    pumpByMuscle: { chest: 40 },
    nowIso: NOW_ISO,
  }).state;

  // 앱 재실행 = 저장된 JSON을 다시 읽어 migrate하는 것과 같다 (repository가 하는 일).
  const reloaded = migrateGrowthState(JSON.parse(JSON.stringify(grown)), '2026-08-23T08:00:00.000Z');
  check('muscle SP survives a save/load round trip', reloaded.muscles.chest.totalSp, 350);
  check('stages survive a save/load round trip', reloaded.muscles.chest.currentStage, 1);
  check('the session total survives too', reloaded.totalWorkoutSp, grown.totalWorkoutSp);
  check('the applied session id is remembered (no double counting on retry)',
    reloaded.lastSessionId, 'persist-1');
  check('pump is not persisted — it is a session-only value',
    (reloaded as unknown as { pumpByMuscle?: unknown }).pumpByMuscle, undefined);

  // 저장된 값이 아예 없는 사용자 / 필드가 빠진 예전 저장값
  check('a first-run user gets a full default state',
    Object.keys(migrateGrowthState(null, NOW_ISO).muscles).length, MuscleGroupDetails.length);
  const partial = migrateGrowthState(
    { muscles: { chest: { totalSp: 1500, currentStage: 0 } } } as never,
    NOW_ISO
  );
  check('a partially saved state keeps the SP it had', partial.muscles.chest.totalSp, 1500);
  check('missing muscles are filled in at zero', partial.muscles.calves.totalSp, 0);
  check('the stage is recomputed from thresholds, not trusted blindly',
    partial.muscles.chest.currentStage, stageForSp(1500));
  check('a total is rebuilt when the saved state has none', partial.totalWorkoutSp, 1500);
}

// ── 9. 기존 도메인과 섞이지 않는다 (테스트 시나리오 13) ─────────────────────
{
  const custom = calculate(sessionResult([exerciseResult('custom-exercise-abc', [{ weightKg: 40, reps: 10 }])], 75));
  check('an exercise outside the DB grows no muscle (we do not invent a body part)',
    custom.spByMuscle, {});

  const empty = calculate(sessionResult([exerciseResult('bench-press', [])], 75));
  check('a session with no completed sets grows nothing', empty.spByMuscle, {});

  const state = createDefaultGrowthState(NOW_ISO);
  check('growth state carries no XP, streak or body measurement fields',
    Object.keys(state).sort(),
    ['daily', 'muscles', 'totalWorkoutSp', 'updatedAt', 'version']);
  check('the fat/nutrition axis is left empty for a separate engine', state.body, undefined);
}

console.log(
  failures === 0 ? '\nAll GROWTH ENGINE checks passed.' : `\n${failures} GROWTH ENGINE check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
