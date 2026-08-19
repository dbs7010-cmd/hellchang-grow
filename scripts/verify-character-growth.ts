// Standalone verification for the character growth resolver (pure function).
// Run: npm run verify:character-growth
import { CharacterGrowthStages, CharacterGrowthTargets } from '@/config/character-growth';
import { resolveCharacterGrowth } from '@/utils/character-growth-resolver';
import type { BodyHistoryEntry } from '@/types/body';
import type { WorkoutRecord } from '@/types/workout';

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

/** 완료 세트 하나짜리 웨이트 기록. volumeKg만큼의 볼륨을 만든다. */
function strengthRecord(id: string, volumeKg: number): WorkoutRecord {
  return {
    id,
    date: '2026-08-01',
    category: 'strength',
    title: '세션',
    completed: true,
    createdAt: '2026-08-01T09:00:00.000Z',
    exercises: [
      {
        id: `${id}-e1`,
        exerciseId: 'bench-press',
        name: '벤치프레스',
        setDetails: [{ id: `${id}-s1`, weightKg: volumeKg, reps: 1, completed: true }],
      },
    ],
  };
}

function cardioRecord(id: string): WorkoutRecord {
  return {
    id,
    date: '2026-08-01',
    category: 'running',
    title: '러닝',
    durationMinutes: 30,
    completed: true,
    createdAt: '2026-08-01T09:00:00.000Z',
  };
}

function bodyEntry(id: string, date: string, extra: Partial<BodyHistoryEntry> = {}): BodyHistoryEntry {
  return { id, date, weightKg: 74, source: 'manual', ...extra };
}

// 1. 데이터가 하나도 없으면 안전한 기본 단계로 떨어진다
{
  const result = resolveCharacterGrowth({ workoutRecords: [], passXp: 0, bodyHistory: [] });
  check('빈 데이터는 stage1', result.stage, 'stage1');
  check('빈 데이터는 isDefault', result.isDefault, true);
  check('빈 데이터는 참여 신호 없음', result.usedSignals, []);
  check('빈 데이터는 진행도 0', result.progress, 0);
}

// 2. 체중만으로는 단계가 바뀌지 않는다 (단일 신체 수치로 성장하지 않는다)
{
  const heavy = resolveCharacterGrowth({
    workoutRecords: [],
    passXp: 0,
    bodyHistory: [bodyEntry('b1', '2026-08-10', { weightKg: 120 }), bodyEntry('b2', '2026-01-01', { weightKg: 60 })],
  });
  check('체중 변화만 있으면 신호로 쓰이지 않는다', heavy.usedSignals, []);
  check('체중 변화만으로는 stage1 유지', heavy.stage, 'stage1');
}

// 3. 유산소만 기록한 경우: 세션 신호는 잡히고 볼륨 신호는 빠진다 (0점으로 끌어내리지 않는다)
{
  const result = resolveCharacterGrowth({
    workoutRecords: [cardioRecord('c1'), cardioRecord('c2')],
    passXp: 0,
    bodyHistory: [],
  });
  check('유산소만 있으면 세션 신호만 참여', result.usedSignals, ['workoutSessions']);
  check('유산소만 있어도 기본값 취급은 아니다', result.isDefault, false);
}

// 4. 누적이 쌓이면 단계가 올라간다
{
  const half = Math.round(CharacterGrowthTargets.volumeKg / 2);
  const midway = resolveCharacterGrowth({
    workoutRecords: [strengthRecord('r1', half)],
    passXp: Math.round(CharacterGrowthTargets.passXp / 2),
    bodyHistory: [],
  });
  // 볼륨 0.5 / 세션 (1/200=0.005) / XP 0.5 → 가중 평균이 0.2~0.4 사이
  check('중간 정도 누적이면 stage2~3 사이', ['stage2', 'stage3'].includes(midway.stage), true);
  check('중간 누적은 세 신호가 참여', midway.usedSignals.sort(), ['passXp', 'workoutSessions', 'workoutVolume']);
}

// 5. 목표치를 채우면 최고 단계, 넘겨도 1을 넘지 않는다
{
  const records = Array.from({ length: CharacterGrowthTargets.sessions }, (_, i) =>
    strengthRecord(`r${i}`, CharacterGrowthTargets.volumeKg)
  );
  const maxed = resolveCharacterGrowth({
    workoutRecords: records,
    passXp: CharacterGrowthTargets.passXp * 10,
    bodyHistory: [],
  });
  check('목표를 채우면 stage5', maxed.stage, 'stage5');
  check('진행도는 1을 넘지 않는다', maxed.progress <= 1, true);
}

// 6. 체성분 신호는 사용자가 직접 넣은 값이 2개 이상 있을 때만 참여한다
{
  const oneEntry = resolveCharacterGrowth({
    workoutRecords: [],
    passXp: 0,
    bodyHistory: [bodyEntry('b1', '2026-08-10', { skeletalMuscleKg: 35 })],
  });
  check('기록이 1개면 체성분 신호 없음', oneEntry.usedSignals, []);

  const twoEntries = resolveCharacterGrowth({
    workoutRecords: [],
    passXp: 0,
    bodyHistory: [
      bodyEntry('b1', '2026-08-10', { skeletalMuscleKg: 35 }),
      bodyEntry('b2', '2026-01-01', { skeletalMuscleKg: 30 }),
    ],
  });
  check('기록이 2개면 체성분 신호 참여', twoEntries.usedSignals, ['bodyComposition']);
  check(
    '골격근량이 목표만큼 늘면 그 신호는 만점 → stage5',
    twoEntries.stage,
    'stage5'
  );

  const noMetrics = resolveCharacterGrowth({
    workoutRecords: [],
    passXp: 0,
    bodyHistory: [bodyEntry('b1', '2026-08-10'), bodyEntry('b2', '2026-01-01')],
  });
  check('체중만 있는 기록 2개는 체성분 신호가 아니다', noMetrics.usedSignals, []);
}

// 7. 없는 신호는 "0점"이 아니라 계산에서 빠진다 (가중치 재정규화)
//    → 인바디를 한 번도 입력하지 않은 사용자가 입력한 사용자보다 불리해지지 않는다.
{
  const workoutRecords = [strengthRecord('r1', CharacterGrowthTargets.volumeKg)];
  const passXp = CharacterGrowthTargets.passXp;

  // A: 체성분 데이터 자체가 없다 → bodyComposition 신호가 빠진다
  const notEntered = resolveCharacterGrowth({ workoutRecords, passXp, bodyHistory: [] });
  // B: 체성분을 넣었지만 변화가 0이다 → bodyComposition 신호가 0점으로 참여한다
  const enteredNoChange = resolveCharacterGrowth({
    workoutRecords,
    passXp,
    bodyHistory: [
      bodyEntry('b1', '2026-08-10', { skeletalMuscleKg: 30 }),
      bodyEntry('b2', '2026-01-01', { skeletalMuscleKg: 30 }),
    ],
  });

  check('입력 안 한 쪽은 체성분 신호가 빠진다', notEntered.usedSignals.includes('bodyComposition'), false);
  check('입력한 쪽은 체성분 신호가 참여한다', enteredNoChange.usedSignals.includes('bodyComposition'), true);
  check(
    '체성분을 입력하지 않았다고 진행도가 깎이지 않는다',
    notEntered.progress > enteredNoChange.progress,
    true
  );
}

// 8. 단계는 항상 정의된 5개 중 하나다
{
  const result = resolveCharacterGrowth({
    workoutRecords: [strengthRecord('r1', 1)],
    passXp: 1,
    bodyHistory: [],
  });
  check('알 수 없는 단계를 돌려주지 않는다', CharacterGrowthStages.includes(result.stage), true);
}

console.log(
  failures === 0
    ? '\nAll character growth checks passed.'
    : `\n${failures} character growth check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
