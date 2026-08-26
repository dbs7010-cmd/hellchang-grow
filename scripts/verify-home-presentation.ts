// 홈이 보여주는 몸 상태 값 규칙 검증 — **없는 값을 만들지 않는다**.
// 레이아웃을 옮길 때 조용히 깨지기 쉬운 규칙이라 순수 함수로 고정해 둔다.
// Run: npm run verify:home
import { readFileSync } from 'node:fs';

import type { BodyHistoryEntry } from '@/types/body';
import type { UserProfile } from '@/types/user';
import type { PtContext } from '@/utils/pt-context';
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
      activeSession: { status: 'active', currentExerciseName: '벤치프레스', completedSets: 2 },
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
      activeSession: { status: 'active', currentExerciseName: '벤치프레스', completedSets: 2 },
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
  expect('보조 행동은 기존 히스토리 탭으로 간다', post.secondary?.route === '/(tabs)/history');

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
  };
  const repsPr = {
    exerciseId: 'pull-up',
    name: '풀업',
    kind: 'reps' as const,
    weightKg: 0,
    reps: 12,
    date: TODAY,
    previousBestWeightKg: null,
  };

  const both = buildHomePerformance(ptContextOf({ recentPRs: [repsPr, weightPr] }));
  expect('중량 PR이 횟수 PR을 이긴다', both?.source === 'weightPr');
  expect('중량 PR 값은 기존 포맷터가 만든다', both?.value === '80kg');
  expect('이전 최고를 지어내지 않고 그대로 말한다', both?.note === '이전 최고 75kg');

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

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
