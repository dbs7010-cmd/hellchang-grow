// 홈이 보여주는 몸 상태 값 규칙 검증 — **없는 값을 만들지 않는다**.
// 레이아웃을 옮길 때 조용히 깨지기 쉬운 규칙이라 순수 함수로 고정해 둔다.
// Run: npm run verify:home
import type { BodyHistoryEntry } from '@/types/body';
import type { UserProfile } from '@/types/user';
import {
  buildHomeBodyMetrics,
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

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
