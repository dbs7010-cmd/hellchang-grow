// 홈이 보여주는 몸 상태 값 규칙 검증 — **없는 값을 만들지 않는다**.
// 레이아웃을 옮길 때 조용히 깨지기 쉬운 규칙이라 순수 함수로 고정해 둔다.
// Run: npm run verify:home
import { readFileSync } from 'node:fs';

import { resolveDanbaekWorldEntry } from '@/config/danbaek-world-entry';
import type { BodyHistoryEntry } from '@/types/body';
import type { UserProfile } from '@/types/user';
import type { WorkoutRecord } from '@/types/workout';
import { buildPtContext, type PtContext } from '@/utils/pt-context';
import { buildDanbaekLearningProfile } from '@/utils/danbaek-learning';
import {
  buildHomeBodyMetrics,
  buildHomePerformance,
  buildHomeView,
  EmptyMetricValue,
  latestBodyRecord,
} from '@/utils/home-presentation';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const profile: UserProfile = {
  id: 'u1',
  createdAt: '2026-08-01T00:00:00.000Z',
  genderExpression: 'male',
  bodyPresetId: 'balanced',
  bodyParameters: { size: 50, tone: 50 },
  heightCm: 176,
  weightKg: 74.2,
  bodyGoal: 'balanced',
  setupMethod: 'preset',
};

const entry = (input: Partial<BodyHistoryEntry> & { date: string }): BodyHistoryEntry => ({
  id: `b-${input.date}`,
  weightKg: 77,
  source: 'manual',
  ...input,
});

const valueOf = (metrics: ReturnType<typeof buildHomeBodyMetrics>, label: string) =>
  metrics.find((metric) => metric.label === label)?.value;

// ── HOME World 입구도 실제 첫 gate 판정을 그대로 쓴다 ──────────────────────
{
  const emptyLearning = buildDanbaekLearningProfile({ records: [], generatedAt: '2026-08-27T00:00:00.000Z' });
  const benchRecord: WorkoutRecord = {
    id: 'world-entry-bench', date: '2026-08-27', category: 'strength', title: '가슴',
    completed: true, createdAt: '2026-08-27T00:00:00.000Z',
    exercises: [{ id: 'bench', name: '벤치프레스', exerciseId: 'bench-press', sets: 1, reps: 10,
      weightKg: 40, setDetails: [{ id: 'bench-set', weightKg: 40, reps: 10, completed: true }] }],
  };
  const learned = buildDanbaekLearningProfile({ records: [benchRecord], generatedAt: '2026-08-27T00:00:00.000Z' });
  const lockedEntry = resolveDanbaekWorldEntry({ profile: emptyLearning });
  const unlockedEntry = resolveDanbaekWorldEntry({ profile: learned });
  expect('FIXTURE D: HOME locked는 다음 실제 벤치프레스 행동을 말한다',
    lockedEntry?.subLabel.includes('벤치프레스') === true && lockedEntry.subLabel.includes('열려요'));
  expect('FIXTURE E: HOME unlocked는 열린 상태를 말한다', unlockedEntry?.subLabel.includes('열려 있어요') === true);
  expect('FIXTURE E: HOME unlocked에 stale locked 문구가 없다',
    unlockedEntry?.subLabel.includes('첫 번째 길이 기다리고 있어요') === false);
}

// ── 1. 기록이 없으면 온보딩 체중만 쓰고 나머지는 만들지 않는다 ─────────────
{
  const metrics = buildHomeBodyMetrics({ profile, bodyHistory: [], workoutRecordCount: 0 });

  expect('네 칸이 항상 나온다 (칸이 사라지지 않는다)', metrics.length === 4);
  expect('체중은 프로필 입력값으로 떨어진다', valueOf(metrics, '체중') === '74.2kg');
  expect('입력한 적 없는 골격근량은 만들지 않는다', valueOf(metrics, '골격근량') === EmptyMetricValue);
  expect('입력한 적 없는 체지방률도 만들지 않는다', valueOf(metrics, '체지방률') === EmptyMetricValue);
  expect('기록이 0회면 0회라고 말한다', valueOf(metrics, '운동 기록') === '0회');
  expect(
    '없는 값을 0으로 채우지 않는다',
    !metrics.some((metric) => metric.value === '0kg' || metric.value === '0%')
  );
}

// ── 2. 실제로 입력한 값만 표시된다 ─────────────────────────────────────────
{
  const metrics = buildHomeBodyMetrics({
    profile,
    bodyHistory: [entry({ date: '2026-08-20', weightKg: 77, skeletalMuscleKg: 35.1, bodyFatPercent: 16.8 })],
    workoutRecordCount: 5,
  });

  expect('입력한 체중이 프로필 값을 대신한다', valueOf(metrics, '체중') === '77kg');
  expect('입력한 골격근량이 그대로 나온다', valueOf(metrics, '골격근량') === '35.1kg');
  expect('입력한 체지방률이 그대로 나온다', valueOf(metrics, '체지방률') === '16.8%');
  expect('운동 기록 수도 그대로다', valueOf(metrics, '운동 기록') === '5회');
}

// ── 3. 가장 최근 기록을 쓴다 (순서가 뒤섞여 들어와도) ──────────────────────
{
  const history = [
    entry({ date: '2026-08-10', weightKg: 79, skeletalMuscleKg: 34 }),
    entry({ date: '2026-08-25', weightKg: 76.5, skeletalMuscleKg: 35.4 }),
    entry({ date: '2026-08-18', weightKg: 78, skeletalMuscleKg: 34.8 }),
  ];

  expect('가장 최근 날짜가 이긴다', latestBodyRecord(history)?.date === '2026-08-25');

  const metrics = buildHomeBodyMetrics({ profile, bodyHistory: history, workoutRecordCount: 3 });
  expect('최근 체중이 나온다', valueOf(metrics, '체중') === '76.5kg');
  expect('최근 골격근량이 나온다', valueOf(metrics, '골격근량') === '35.4kg');
  expect(
    '최근 기록에 없는 값은 옛 기록에서 끌어오지 않는다',
    valueOf(metrics, '체지방률') === EmptyMetricValue
  );
  expect('기록이 없으면 null이다', latestBodyRecord([]) === null);
}

// ── 4. 순서가 고정이다 (레이아웃이 바뀌어도 읽는 순서는 같다) ──────────────
{
  const metrics = buildHomeBodyMetrics({ profile, bodyHistory: [], workoutRecordCount: 1 });
  expect(
    '체중 · 골격근량 · 체지방률 · 운동 기록 순서다',
    metrics.map((metric) => metric.label).join() === '체중,골격근량,체지방률,운동 기록'
  );

  const twice = JSON.stringify(buildHomeBodyMetrics({ profile, bodyHistory: [], workoutRecordCount: 1 }));
  expect('같은 입력이면 같은 결과다', twice === JSON.stringify(metrics));
}

// ── 5. 홈이 지금 무엇을 말하는가 — 상태 세 개뿐 ────────────────────────────
//
// 홈의 주인공은 현실에서 운동하는 사람이다. 그래서 첫 질문은 "오늘 내 운동이 어디까지
// 왔는가"이고, 답은 정확히 셋뿐이다. 새 저장도, 새 시간 정책도 여기 들어오지 않는다.

const TODAY = '2026-08-26';

const ptContextOf = (overrides: {
  workoutCompleted?: boolean;
  activeSession?: PtContext['today']['activeSession'];
  recentPRs?: PtContext['recentTraining']['recentPRs'];
  recentExercises?: PtContext['recentTraining']['recentExercises'];
  weeklyWorkoutCount?: number;
  weeklyVolumeKg?: number;
  streakDays?: number;
  lastWorkoutDate?: string | null;
}): PtContext => ({
  today: {
    date: TODAY,
    workoutCompleted: overrides.workoutCompleted ?? false,
    activeSession: overrides.activeSession ?? null,
  },
  profile: {
    goal: 'balanced',
    heightCm: 176,
    weightKg: 74.2,
    skeletalMuscleKg: null,
    bodyFatPercent: null,
  },
  recentTraining: {
    lastWorkoutDate: overrides.lastWorkoutDate ?? null,
    totalWorkoutCount: 0,
    weeklyWorkoutCount: overrides.weeklyWorkoutCount ?? 0,
    weeklyVolumeKg: overrides.weeklyVolumeKg ?? 0,
    streakDays: overrides.streakDays ?? 0,
    recentExercises: overrides.recentExercises ?? [],
    recentPRs: overrides.recentPRs ?? [],
  },
  currentRoutine: null,
});

{
  const pre = buildHomeView({ ptContext: ptContextOf({}) });
  const inProgress = buildHomeView({
    ptContext: ptContextOf({
      workoutCompleted: true,
      activeSession: { status: 'active', currentExerciseName: '벤치프레스', completedSets: 2, currentExerciseCompletedSets: 2 },
    }),
  });
  const post = buildHomeView({
    ptContext: ptContextOf({ workoutCompleted: true, weeklyWorkoutCount: 3, streakDays: 2 }),
  });

  expect('아무 일도 없으면 운동 전이다', pre.state === 'PRE_WORKOUT');
  expect('오늘 기록이 있으면 운동 후다', post.state === 'POST_WORKOUT');
  // 오늘 기록이 있어도 진행 중인 세션이 이긴다 — 하루 두 번 운동하는 사람에게
  // "오늘 운동 완료"를 띄우면 지금 하고 있는 세션이 화면에서 사라진다.
  expect('진행 중인 세션이 오늘 기록을 이긴다', inProgress.state === 'IN_PROGRESS');

  expect(
    '상태는 셋뿐이다',
    [pre.state, inProgress.state, post.state].every((state) =>
      ['PRE_WORKOUT', 'IN_PROGRESS', 'POST_WORKOUT'].includes(state)
    )
  );
}

// ── 6. 문구 잠금 ───────────────────────────────────────────────────────────
//
// 같은 버튼 문구가 화면마다 박혀 있으면 한 곳을 고칠 때 나머지가 조용히 다른 말을 한다.
// 홈 문구는 이 순수 함수 하나에서만 나오고, 앱 어디에도 옛 문구가 남아 있으면 안 된다.
{
  const pre = buildHomeView({ ptContext: ptContextOf({}) });
  const preWithRoutine = buildHomeView({
    ptContext: ptContextOf({}),
    scheduledRoutineName: '가슴 A',
  });
  const inProgress = buildHomeView({
    ptContext: ptContextOf({
      activeSession: { status: 'active', currentExerciseName: '벤치프레스', completedSets: 2, currentExerciseCompletedSets: 2 },
    }),
  });
  const post = buildHomeView({
    ptContext: ptContextOf({ workoutCompleted: true, weeklyWorkoutCount: 3, streakDays: 2 }),
  });

  expect('운동 전에는 시작하자고 한다', pre.primary.label === '운동 시작');
  expect('진행 중에는 이어서 하자고 한다', inProgress.primary.label === '운동 계속하기');
  expect('오늘 예약된 루틴이 있으면 그 이름을 말한다', preWithRoutine.primary.note === '오늘 · 가슴 A');
  expect(
    '진행 중 보조 문구는 실제 세션 상태다',
    inProgress.primary.note === '벤치프레스 · 2세트 완료'
  );

  // 완료를 다시 누를 수 있는 행동으로 만들면 "한 번 더 해라"가 된다.
  expect('오늘 운동 완료는 행동이 아니라 상태다', post.primary.kind === 'state');
  expect('완료 문구가 고정이다', post.primary.label === '오늘 운동 완료');
  expect('운동 전/진행 중은 행동이다', pre.primary.kind === 'action' && inProgress.primary.kind === 'action');

  expect('완료했을 때만 보조 행동이 생긴다', post.secondary !== null && pre.secondary === null && inProgress.secondary === null);
  expect('보조 행동은 오늘 운동 기록이다', post.secondary?.label === '오늘 운동 기록');
  // 요약이 아니라 **그 기록**으로 가야 한다 — 예전에는 히스토리 탭의 한 줄에서 끝났다.
  const postWithRecord = buildHomeView({
    ptContext: ptContextOf({ workoutCompleted: true, weeklyWorkoutCount: 1 }),
    todayRecordId: 'r-today',
  });
  expect('오늘 기록을 알면 그 기록으로 간다', postWithRecord.secondary?.recordId === 'r-today');
  expect('모르면 기록 id를 지어내지 않는다', post.secondary?.recordId === null);

  const views = [pre, preWithRoutine, inProgress, post];
  expect(
    '홈 어디에도 옛 문구가 남지 않는다',
    !views.some((view) => JSON.stringify(view).includes('운동으로 돌아가기'))
  );

  // 사용자에게 보이는 화면 전체에서도 사라져야 한다 — 홈만 고치면 운동/트레이너 탭이
  // 같은 버튼을 다른 이름으로 부른다.
  const screens = [
    'src/app/(tabs)/index.tsx',
    'src/app/(tabs)/workout.tsx',
    'src/app/(tabs)/trainer.tsx',
    'src/app/session.tsx',
  ];
  const stale = screens.filter((file) => readFileSync(file, 'utf8').includes('운동으로 돌아가기'));
  expect('앱 화면 어디에도 옛 문구가 없다', stale.length === 0);
}

// ── 7. 오늘 가장 강한 실제 성취 ─────────────────────────────────────────────
//
// 새 PR 정의도 새 보상도 만들지 않는다. 이미 저장된 기록에서 하나를 고를 뿐이고,
// 고를 것이 없으면 아무것도 세우지 않는다.
{
  const weightPr = {
    exerciseId: 'bench-press',
    name: '벤치프레스',
    kind: 'weight' as const,
    weightKg: 80,
    reps: null,
    date: TODAY,
    previousBestWeightKg: 75,
    previousBestReps: null,
  };
  const repsPr = {
    exerciseId: 'pull-up',
    name: '풀업',
    kind: 'reps' as const,
    weightKg: 0,
    reps: 12,
    date: TODAY,
    previousBestWeightKg: null,
    previousBestReps: 10,
  };

  /*
    대표 성취는 **종류**가 아니라 **자기 기록 대비 얼마나 늘었는가**로 고른다.
    여기서 중량 PR은 75→80kg(+6.7%), 횟수 PR은 10→12회(+20%)다. 예전에는 "중량 PR이면
    무조건 먼저"라 더 크게 는 쪽이 가려졌다.
  */
  const both = buildHomePerformance(ptContextOf({ recentPRs: [repsPr, weightPr] }));
  expect('자기 기록 대비 더 많이 오른 쪽이 대표다', both?.source === 'repsPr');
  expect('값 표기는 기존 포맷터가 만든다', both?.value === '맨몸 12회');
  expect(
    '목록 순서를 바꿔도 같은 성취를 고른다',
    JSON.stringify(buildHomePerformance(ptContextOf({ recentPRs: [weightPr, repsPr] }))) ===
      JSON.stringify(both)
  );

  // 반대 방향도 성립해야 규칙이다: 횟수 +10%(10→11) vs 중량 +20%(75→90).
  const smallerRepGain = { ...repsPr, reps: 11, previousBestReps: 10 };
  const biggerWeightGain = { ...weightPr, weightKg: 90, previousBestWeightKg: 75 };
  const weightWins = buildHomePerformance(
    ptContextOf({ recentPRs: [smallerRepGain, biggerWeightGain] })
  );
  expect('중량 쪽이 더 많이 올랐으면 중량이 대표다', weightWins?.source === 'weightPr');
  expect('이전 최고를 지어내지 않고 그대로 말한다', weightWins?.note === '이전 최고 75kg');

  const onlyReps = buildHomePerformance(ptContextOf({ recentPRs: [repsPr] }));
  expect('횟수 PR은 중량으로 말하지 않는다', onlyReps?.value === '맨몸 12회');
  expect('횟수 PR도 성취로 세운다', onlyReps?.source === 'repsPr');

  // 지난주 PR이 오늘 세운 기록을 가리면 안 된다.
  const oldWeightPr = { ...weightPr, date: '2026-08-19' };
  const todayRepsOverOldWeight = buildHomePerformance(
    ptContextOf({ recentPRs: [{ ...repsPr, date: TODAY }, oldWeightPr] })
  );
  expect('오늘 세운 기록이 지난 기록보다 먼저다', todayRepsOverOldWeight?.source === 'repsPr');

  const olderOnly = buildHomePerformance(ptContextOf({ recentPRs: [oldWeightPr] }));
  expect('오늘이 아니면 언제인지 함께 말한다', olderOnly?.note?.includes('7일 전') === true);

  const recentSet = buildHomePerformance(
    ptContextOf({
      recentExercises: [
        { exerciseId: 'squat', name: '스쿼트', date: TODAY, topSet: { weightKg: 100, reps: 5 }, setCount: 3 },
      ],
    })
  );
  expect('PR이 없으면 최근 실제 세트를 쓴다', recentSet?.source === 'recentSet');
  expect('최근 세트는 실제 값 그대로다', recentSet?.value === '100kg × 5회');

  const count = buildHomePerformance(ptContextOf({ weeklyWorkoutCount: 3, streakDays: 2 }));
  expect('세트 기록이 없으면 이번 주 운동 횟수를 쓴다', count?.source === 'workoutCount');
  expect('연속 일수가 있으면 함께 말한다', count?.note === '연속 2일');

  const volume = buildHomePerformance(ptContextOf({ weeklyVolumeKg: 3400 }));
  expect('마지막 근거는 볼륨이다', volume?.source === 'volume');

  /*
    첫 기록에는 비교할 과거가 없다. 그래서 실제로 늘어난 기록이 항상 먼저다 —
    "처음 해봤다"가 "지난번보다 늘었다"를 가리면 안 된다.
  */
  const firstRecordHeavy = {
    exerciseId: 'leg-press',
    name: '레그프레스',
    kind: 'weight' as const,
    weightKg: 150,
    reps: null,
    date: TODAY,
    previousBestWeightKg: null,
    previousBestReps: null,
  };
  const realImprovement = {
    exerciseId: 'bench-press',
    name: '벤치프레스',
    kind: 'weight' as const,
    weightKg: 62.5,
    reps: null,
    date: TODAY,
    previousBestWeightKg: 60,
    previousBestReps: null,
  };
  const improvementFirst = buildHomePerformance(
    ptContextOf({ recentPRs: [firstRecordHeavy, realImprovement] })
  );
  expect(
    '무게가 커도 첫 기록이 실제 상승을 이기지 않는다',
    improvementFirst?.title === '벤치프레스 최고 중량'
  );
  expect(
    '순서를 바꿔도 결과가 같다',
    JSON.stringify(
      buildHomePerformance(ptContextOf({ recentPRs: [realImprovement, firstRecordHeavy] }))
    ) === JSON.stringify(improvementFirst)
  );

  /*
    첫 기록끼리는 무게로 줄 세우지 않는다 — 레그프레스 150kg가 벤치프레스 62.5kg보다
    대단하다는 뜻이 아니고, 종목 간 강함을 비교할 근거가 앱에 없다. 대신 가장 최근 것을
    쓰고, 문구가 "첫 기록"이라고 그대로 말해 과장하지 않는다.
  */
  const firstRecordLight = { ...firstRecordHeavy, exerciseId: 'dumbbell', name: '덤벨 벤치프레스', weightKg: 20 };
  const firstOnly = buildHomePerformance(ptContextOf({ recentPRs: [firstRecordLight, firstRecordHeavy] }));
  expect('첫 기록끼리는 가장 최근 것을 쓴다', firstOnly?.title === '덤벨 벤치프레스 최고 중량');
  expect('첫 기록은 첫 기록이라고 말한다', firstOnly?.note === '첫 기록');
  expect(
    '첫 기록을 두고 더 무거운 종목을 대표로 올리지 않는다',
    firstOnly?.title !== '레그프레스 최고 중량'
  );

  expect('아무 기록도 없으면 성취를 지어내지 않는다', buildHomePerformance(ptContextOf({})) === null);
  expect(
    '기록이 없는 사람의 홈에는 성취 카드가 없다',
    buildHomeView({ ptContext: ptContextOf({}) }).performance === null
  );
}

// ── 8. 홈 화면 배선 ────────────────────────────────────────────────────────
{
  const home = readFileSync('src/app/(tabs)/index.tsx', 'utf8');

  expect('상태와 문구를 화면에서 다시 정하지 않는다', home.includes('buildHomeView('));
  expect('주인공 렌더러는 그대로다', home.includes('<PlayerCharacter'));
  expect('단백이는 사라지지 않는다', home.includes('<DanbaekVoiceBubble'));

  // 순서가 곧 우선순위다: 오늘의 운동 → 실제 성취 → 단백이 반응 → 진행도 → 단백세상.
  const order = ['styles.todayBlock', 'home.performance', 'styles.stage', '<DanbaekVoiceBubble', 'styles.progressBlock', 'worldEntry &&'];
  const positions = order.map((token) => home.indexOf(token));
  expect('모든 층이 화면에 있다', positions.every((position) => position >= 0));
  expect(
    '오늘의 운동이 캐릭터보다 먼저다',
    positions.every((position, index) => index === 0 || positions[index - 1] < position)
  );

  expect('단백세상 입구는 골드 CTA가 아니다', home.includes('styles.worldEntryRow'));
  expect(
    '오늘 이미 운동했어도 추가 운동 경로가 남는다',
    home.includes("home.state !== 'IN_PROGRESS'") && home.includes('<RecommendedStrip')
  );
}

// ── 9. 옛 기록이 없는 성취로 승격되지 않는다 ────────────────────────────────
//
// WEIGHT CORE 이전 기록에는 세트별 completed 플래그가 없다. 그래서 읽는 쪽이 요약값
// (sets/weightKg/reps)으로 근사하는데, 그 근사가 0회를 통과시키면 **한 번도 들지 않은
// 무게**가 listPRs → PtContext → 홈의 "실제 성취"까지 그대로 올라간다.
//
// 여기서 검증하는 것은 판정 규칙이 아니라 읽는 경계다 — 실제 저장된 기록은 건드리지 않는다.
{
  const legacyRecord = (input: { id: string; date: string; reps?: number }): WorkoutRecord => ({
    id: input.id,
    date: input.date,
    category: 'strength',
    title: '레거시 세션',
    completed: true,
    createdAt: `${input.date}T10:00:00.000Z`,
    // setDetails 없음 = 옛 기록
    exercises: [
      {
        id: 'e1',
        exerciseId: 'deadlift',
        name: '데드리프트',
        sets: 3,
        weightKg: 100,
        ...(input.reps === undefined ? {} : { reps: input.reps }),
      },
    ],
  });

  const contextFor = (records: WorkoutRecord[]) =>
    buildPtContext({
      profile,
      bodyHistory: [],
      workoutRecords: records,
      streak: { currentStreakDays: 0, longestStreakDays: 0, rewardClaimed: false },
      routines: [],
      activeSession: null,
      today: '2026-08-26',
    });

  // 무효: 3세트 100kg인데 0회 — 실제로 든 적이 없다.
  const invalid = contextFor([legacyRecord({ id: 'legacy-0', date: '2026-08-24', reps: 0 })]);
  expect('0회짜리 옛 기록은 PR이 되지 않는다', invalid.recentTraining.recentPRs.length === 0);
  expect(
    '0회짜리 옛 기록은 최고 세트도 되지 않는다',
    invalid.recentTraining.recentExercises.every((exercise) => exercise.topSet === null)
  );

  const invalidSignal = buildHomePerformance(invalid);
  expect(
    '홈이 들지 않은 무게를 성취로 말하지 않는다',
    invalidSignal === null || !invalidSignal.value.includes('100kg')
  );
  expect(
    '홈이 없는 최고 중량을 만들지 않는다',
    invalidSignal?.source !== 'weightPr' && invalidSignal?.source !== 'recentSet'
  );

  // 횟수 자체가 없는 옛 기록도 같은 취급이다 — 단서가 없으면 성취도 없다.
  const missingReps = contextFor([legacyRecord({ id: 'legacy-none', date: '2026-08-24' })]);
  expect('횟수가 아예 없는 옛 기록도 PR이 아니다', missingReps.recentTraining.recentPRs.length === 0);
  expect(
    '횟수가 없으면 홈도 그 무게를 말하지 않는다',
    !(buildHomePerformance(missingReps)?.value ?? '').includes('100kg')
  );

  // 유효: 실제로 수행한 옛 기록은 전부 그대로 살아 있어야 한다.
  const valid = contextFor([legacyRecord({ id: 'legacy-ok', date: '2026-08-24', reps: 5 })]);
  expect('실제로 수행한 옛 기록은 여전히 PR이다', valid.recentTraining.recentPRs.length === 1);
  expect('그 PR의 중량은 그대로다', valid.recentTraining.recentPRs[0]?.weightKg === 100);
  expect(
    '그 기록의 최고 세트도 그대로다',
    valid.recentTraining.recentExercises[0]?.topSet?.weightKg === 100 &&
      valid.recentTraining.recentExercises[0]?.topSet?.reps === 5
  );

  const validSignal = buildHomePerformance(valid);
  expect('홈은 실제로 든 무게를 그대로 말한다', validSignal?.source === 'weightPr');
  expect('값 표기도 그대로다', validSignal?.value === '100kg');
}

// ── 홈과 스탠리가 같은 하루를 다르게 말하지 않는다 ─────────────────────────
//
// 예전에는 홈이 "중량 PR 우선", 스탠리가 "목록 첫 번째"라 같은 기록을 두고 서로 다른
// 성취를 대표로 말할 수 있었다. 지금은 정책 함수 하나를 공유한다.
{
  const usesPolicy = (file: string) =>
    readFileSync(file, 'utf8').includes('selectRepresentativePr');
  expect(
    '홈이 공용 대표 성취 정책을 쓴다',
    usesPolicy('src/utils/home-presentation.ts')
  );
  expect(
    '스탠리도 같은 정책을 쓴다',
    usesPolicy('src/utils/trainer-brief.ts')
  );
  expect(
    '홈이 목록 첫 번째를 그냥 집지 않는다',
    !readFileSync('src/utils/home-presentation.ts', 'utf8').includes("pool.find((candidate) => candidate.kind === 'weight')")
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
