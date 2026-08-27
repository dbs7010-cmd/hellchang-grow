// WORLD BLOCK → 스탠리 설명 → 실제 운동 후보 → 기존 세션 시작. **APP 쪽 흐름만** 본다.
// WORLD 판정/스테이지/모험은 여기서 만들지도, 검증하지도 않는다 (그건 WORLD/통합 소유다).
// Run: npm run verify:block-flow
import { readFileSync } from 'node:fs';

import { Exercises } from '@/config/exercises';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { MovementFamilies, type MovementFamily, type StageBlock } from '@/types/danbaek-contract';
import type { WorkoutRecord } from '@/types/workout';
import { buildDanbaekLearningProfile } from '@/utils/danbaek-learning';
import {
  exerciseIdsForMovementFamily,
  requiredExerciseForBlock,
  resolveBlockRoute,
} from '@/utils/danbaek-block-routing';
import {
  buildBlockPresentation,
  describeBlockCandidate,
} from '@/utils/danbaek-block-presentation';
import {
  clearPendingDanbaekBlock,
  getPendingDanbaekBlock,
  handOffDanbaekBlock,
  subscribeToDanbaekBlock,
} from '@/services/world/block-handoff';
import { createSession } from '@/utils/workout-session';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const record = (input: Partial<WorkoutRecord> & { id: string }): WorkoutRecord => ({
  date: '2026-08-25',
  category: 'strength',
  title: '세션',
  completed: true,
  createdAt: '2026-08-25T10:00:00.000Z',
  ...input,
});

const exercise = (exerciseId: string, sets = 3, reps = 10) => ({
  id: `e-${exerciseId}`,
  name: exerciseId,
  exerciseId,
  sets,
  reps,
  weightKg: 40,
  setDetails: Array.from({ length: sets }, (_, index) => ({
    id: `${exerciseId}-s${index}`,
    weightKg: 40,
    reps,
    completed: true,
  })),
});

const blockOf = (input: Partial<StageBlock> & { recommendedMovementFamily: MovementFamily }): StageBlock => ({
  outcome: 'block',
  stageId: 'stage-3',
  explanationKey: 'block.default',
  requirement: { reason: '이 문은 매달려서 올라가야 합니다.' },
  ...input,
});

const exerciseIds = new Set(Exercises.map((definition) => definition.id));

// ── 1. StageBlock → resolveBlockRoute → presentation ────────────────────────
{
  const block = blockOf({
    stageId: 'stage-3',
    explanationKey: 'block.pull_vertical.gate',
    recommendedMovementFamily: 'pull_vertical',
    requirement: {
      movementFamily: 'pull_vertical',
      minimumLearningStage: 'learned',
      reason: '이 문은 매달려서 올라가야 합니다.',
    },
  });

  const presentation = buildBlockPresentation({ block, exerciseDb: Exercises, records: [] });
  const route = resolveBlockRoute({ block, exerciseDb: Exercises, records: [] });

  expect('WORLD가 준 stageId를 그대로 들고 간다', presentation.stageId === 'stage-3');
  expect('설명 키를 지어내지 않고 그대로 쓴다', presentation.explanationKey === 'block.pull_vertical.gate');
  expect(
    '후보는 라우팅 어댑터가 낸 것과 같다 (새 추천 엔진을 만들지 않았다)',
    JSON.stringify(presentation.exercises) === JSON.stringify(route.exercises)
  );
  expect('스탠리가 할 말이 있다', presentation.stanleyLines.length > 0);
  expect(
    'WORLD가 준 이유가 스탠리 입에 그대로 들어간다',
    presentation.stanleyLines[0].includes('매달려서 올라가야 합니다')
  );
  expect(
    '필요한 정도를 사람 말로 말한다',
    presentation.requiredStageLabel === LearningStageLabels.learned
  );
  expect(
    '후보 이름이 스탠리 문장에도 실제 후보에서만 들어간다',
    presentation.stanleyLines[0].includes(presentation.exercises[0].exerciseName)
  );
  expect('세션에 넘길 대표 부위가 있다', presentation.muscleGroup !== undefined);
  expect('후보가 있으면 빈 안내는 없다', presentation.emptyLine === null);
}

// ── 2. movement family가 그대로 보존된다 ───────────────────────────────────
{
  for (const movementFamily of MovementFamilies) {
    const presentation = buildBlockPresentation({
      block: blockOf({ recommendedMovementFamily: movementFamily }),
      exerciseDb: Exercises,
      records: [],
    });
    expect(
      `${movementFamily}: 계열이 바뀌지 않는다`,
      presentation.movementFamily === movementFamily
    );
    expect(
      `${movementFamily}: 사람 말 이름이 라벨 표에서만 온다`,
      presentation.familyLabel === MovementFamilyLabels[movementFamily]
    );
    expect(
      `${movementFamily}: 후보는 전부 그 계열이거나 요구 운동이다`,
      presentation.exercises.every(
        (candidate) =>
          exerciseIdsForMovementFamily(movementFamily).includes(candidate.exerciseId) ||
          candidate.exerciseId === presentation.requiredExercise?.exerciseId
      )
    );
  }
}

// ── 3. specificExerciseId가 있으면 유효 후보에서 우선된다 ──────────────────
{
  const block = blockOf({
    recommendedMovementFamily: 'push_horizontal',
    requirement: {
      specificExerciseId: 'bench-press',
      reason: '벤치 몬스터는 벤치프레스만 인정합니다.',
    },
  });

  // 다른 push 운동을 많이 해본 상태여도 요구 운동이 첫 번째다.
  const records = [record({ id: 'r1', exercises: [exercise('push-up'), exercise('chest-press-machine')] })];
  const presentation = buildBlockPresentation({ block, exerciseDb: Exercises, records });

  expect('요구 운동이 첫 후보다', presentation.exercises[0]?.exerciseId === 'bench-press');
  expect(
    '요구 운동을 화면이 따로 알 수 있다',
    presentation.requiredExercise?.exerciseId === 'bench-press'
  );
  expect(
    '이름은 DB에서 온다',
    presentation.requiredExercise?.name === Exercises.find((e) => e.id === 'bench-press')?.name
  );
  expect(
    '스탠리가 그 요구를 말한다',
    presentation.stanleyLines.some((line) => line.includes('콕 집어 요구'))
  );
  expect(
    '후보 설명이 요구 운동임을 알린다',
    describeBlockCandidate(presentation, presentation.exercises[0]) === '이 구간이 요구하는 운동'
  );
  expect(
    '해본 적 있는 나머지 후보도 그대로 남는다',
    presentation.exercises.some((candidate) => candidate.exerciseId === 'push-up')
  );
  expect(
    '같은 운동이 두 번 나오지 않는다',
    new Set(presentation.exercises.map((c) => c.exerciseId)).size === presentation.exercises.length
  );

  // 계열 밖 운동을 요구해도 그것이 실제 운동이면 그대로 첫 후보다 (계약 4항의 예외).
  const outsideFamily = buildBlockPresentation({
    block: blockOf({
      recommendedMovementFamily: 'squat',
      requirement: { specificExerciseId: 'deadlift', reason: '이 바위는 들어 올려야 합니다.' },
    }),
    exerciseDb: Exercises,
    records: [],
  });
  expect('계열 밖 요구 운동도 첫 후보로 안내한다', outsideFamily.exercises[0]?.exerciseId === 'deadlift');
}

// ── 4. 없는 운동을 지어내지 않는다 ─────────────────────────────────────────
{
  const unknown = blockOf({
    recommendedMovementFamily: 'pull_vertical',
    requirement: {
      specificExerciseId: 'muscle-up-3000',
      reason: '이 구간은 앱에 없는 운동을 요구합니다.',
    },
  });
  const presentation = buildBlockPresentation({ block: unknown, exerciseDb: Exercises, records: [] });

  expect('앱이 모르는 요구 운동은 후보가 되지 않는다', presentation.requiredExercise === null);
  expect(
    '그 id가 후보 목록에 몰래 들어가지도 않는다',
    presentation.exercises.every((candidate) => candidate.exerciseId !== 'muscle-up-3000')
  );
  expect(
    '대신 계열 후보로 안내한다',
    presentation.exercises.length > 0 &&
      presentation.exercises.every((candidate) => exerciseIds.has(candidate.exerciseId))
  );
  expect(
    '스탠리도 없는 운동을 말하지 않는다',
    presentation.stanleyLines.every((line) => !line.includes('muscle-up-3000'))
  );
  expect(
    '요구 운동 조회도 같은 판정을 한다',
    requiredExerciseForBlock(unknown, Exercises) === null
  );

  // 모든 계열에 대해: 후보 id와 이름은 항상 Exercise DB의 실제 값이다.
  const inventedSomething = MovementFamilies.some((movementFamily) =>
    buildBlockPresentation({
      block: blockOf({ recommendedMovementFamily: movementFamily }),
      exerciseDb: Exercises,
      records: [],
    }).exercises.some((candidate) => {
      const definition = Exercises.find((e) => e.id === candidate.exerciseId);
      return !definition || definition.name !== candidate.exerciseName;
    })
  );
  expect('어떤 계열에서도 없는 운동/이름을 만들지 않는다', inventedSomething === false);
}

// ── 5. 후보 없는 계열이 정상 fallback 된다 ─────────────────────────────────
{
  // carry / locomotion은 아직 Exercise DB 매핑이 없다 — 그 사실 자체를 검증에 고정한다.
  for (const movementFamily of ['carry', 'locomotion'] as MovementFamily[]) {
    expect(
      `${movementFamily}: 아직 매핑된 운동이 없다 (전제 확인)`,
      exerciseIdsForMovementFamily(movementFamily).length === 0
    );

    const presentation = buildBlockPresentation({
      block: blockOf({ recommendedMovementFamily: movementFamily }),
      exerciseDb: Exercises,
      records: [],
    });

    expect(`${movementFamily}: 후보를 지어내지 않는다`, presentation.exercises.length === 0);
    expect(`${movementFamily}: 없다고 말한다`, presentation.emptyLine !== null);
    expect(
      `${movementFamily}: 안내에 계열 이름이 들어간다`,
      presentation.emptyLine?.includes(MovementFamilyLabels[movementFamily]) === true
    );
    expect(
      `${movementFamily}: 스탠리도 같은 사실을 말한다`,
      presentation.stanleyLines.some((line) => line.includes('연결할 수 있는 운동이 없습니다'))
    );
    expect(`${movementFamily}: 대표 부위를 지어내지 않는다`, presentation.muscleGroup === undefined);
  }
}

// ── 6. 스탠리 톤 — 가르치는 쪽은 스탠리, 배우는 쪽은 단백이 ────────────────
{
  const presentation = buildBlockPresentation({
    block: blockOf({ recommendedMovementFamily: 'squat' }),
    exerciseDb: Exercises,
    records: [],
  });
  const all = presentation.stanleyLines.join(' ');

  expect('관계 문장이 항상 들어간다', all.includes('단백이는 옆에서 보고 따라 합니다'));
  expect('자세를 보는 사람은 스탠리다', all.includes('제가 자세를 봐 드리면'));
  expect(
    '일반 RPG 문구를 쓰지 않는다',
    !/강하게 만들|육성|레벨업|스탯|전투력/.test(all)
  );
  expect('플레이어에게 말한다 (존댓말 지도)', /시죠|합니다|습니다/.test(all));
}

// ── 7. presentation은 학습을 바꾸지 않는다 ─────────────────────────────────
{
  const records = [record({ id: 'r1', exercises: [exercise('bench-press')] })];
  const recordsJson = JSON.stringify(records);
  const before = buildDanbaekLearningProfile({ records, generatedAt: '2026-08-26T09:00:00.000Z' });
  const beforeJson = JSON.stringify(before);

  const presentation = buildBlockPresentation({
    block: blockOf({
      recommendedMovementFamily: 'push_horizontal',
      requirement: { minimumLearningStage: 'proficient', reason: '더 봐야 합니다.' },
    }),
    exerciseDb: Exercises,
    records,
  });

  const after = buildDanbaekLearningProfile({ records, generatedAt: '2026-08-26T09:00:00.000Z' });

  expect('학습 스냅샷이 그대로다 (단계가 바뀌지 않는다)', JSON.stringify(after) === beforeJson);
  expect('WorkoutRecord를 건드리지 않는다', JSON.stringify(records) === recordsJson);
  expect(
    '화면은 요구 단계를 옮겨 적을 뿐 학습 단계를 주장하지 않는다',
    presentation.requiredStageLabel === LearningStageLabels.proficient
  );
  expect(
    '안내를 만들었다고 evidence가 늘지 않는다',
    after.capabilities.find((c) => c.movementFamily === 'push_horizontal')?.evidenceCount === 1
  );
}

// ── 8. 후보 모양이 기존 세션 시작이 받는 모양과 호환된다 ───────────────────
{
  const presentation = buildBlockPresentation({
    block: blockOf({ recommendedMovementFamily: 'pull_vertical' }),
    exerciseDb: Exercises,
    records: [],
  });
  const candidate = presentation.exercises[0];

  // 화면이 하는 것과 같은 호출: 기존 createSession(startWorkoutSession의 내부)에 그대로 넘긴다.
  const session = createSession('strength', 'session-1', '2026-08-26T09:00:00.000Z', {
    primaryMuscleGroup: presentation.muscleGroup,
    initialExercises: [candidate],
  });

  expect('세션이 만들어진다', session.exercises.length === 1);
  expect('운동 id가 그대로 들어간다', session.exercises[0].exerciseId === candidate.exerciseId);
  expect('운동 이름이 그대로 들어간다', session.exercises[0].exerciseName === candidate.exerciseName);
  expect('목표 세트가 그대로 들어간다', session.exercises[0].targetSets === candidate.targetSets);
  expect(
    '휴식 기본값이 그대로 들어간다',
    session.exercises[0].defaultRestSeconds === candidate.defaultRestSeconds
  );
  expect('세션 부위도 후보에서 온다', session.primaryMuscleGroup === presentation.muscleGroup);
  expect('세션은 기존 규칙대로 시작 상태다', session.status === 'active');
  expect('완료 세트 없이 시작한다', session.exercises[0].sets.length === 0);

  // 후보 여러 개를 한 번에 담아도 같은 경로로 들어간다.
  const many = createSession('strength', 'session-2', '2026-08-26T09:00:00.000Z', {
    initialExercises: presentation.exercises,
  });
  expect('후보 전부를 담아도 모양이 맞는다', many.exercises.length === presentation.exercises.length);
}

// ── 9. BLOCK HANDOFF — WORLD가 꽂을 자리 하나 ──────────────────────────────
{
  clearPendingDanbaekBlock();
  expect('처음에는 막힘이 없다', getPendingDanbaekBlock() === null);

  let notified = 0;
  const unsubscribe = subscribeToDanbaekBlock(() => {
    notified += 1;
  });

  const first = blockOf({ recommendedMovementFamily: 'pull_vertical' });
  handOffDanbaekBlock(first);
  expect('넘긴 block을 그대로 돌려준다 (모양을 바꾸지 않는다)', getPendingDanbaekBlock() === first);
  expect('화면이 알 수 있도록 알린다', notified === 1);

  const second = blockOf({ stageId: 'stage-4', recommendedMovementFamily: 'squat' });
  handOffDanbaekBlock(second);
  expect('한 번에 하나만 들고 있다', getPendingDanbaekBlock() === second);

  // 넘겨받은 block은 그대로 표현 모델로 들어간다 — 통합이 변환을 만들 필요가 없다.
  const pending = getPendingDanbaekBlock()!;
  const presentation = buildBlockPresentation({ block: pending, exerciseDb: Exercises, records: [] });
  expect('넘겨받은 block이 그대로 화면 모델이 된다', presentation.stageId === 'stage-4');
  expect('계열도 그대로다', presentation.movementFamily === 'squat');

  clearPendingDanbaekBlock();
  expect('비우면 없다', getPendingDanbaekBlock() === null);
  expect('비운 것도 알린다', notified === 3);

  unsubscribe();
  handOffDanbaekBlock(first);
  expect('구독을 끊으면 더 알리지 않는다', notified === 3);
  clearPendingDanbaekBlock();
}

// ── 10. APP은 WORLD 구현을 import하지 않는다 (정적 확인) ───────────────────
{
  const appFiles = [
    'src/utils/danbaek-block-routing.ts',
    'src/utils/danbaek-block-presentation.ts',
    'src/services/world/block-handoff.ts',
    'src/app/danbaek-block.tsx',
  ];

  const forbidden = /from\s+'[^']*(danbaek-world|world-evaluator|adventure|stage-runner|world-progress)/i;

  // npm script는 항상 저장소 루트에서 돈다 — 상대 경로로 읽는다(경로 모듈을 끌어오지 않는다).
  for (const file of appFiles) {
    const source = readFileSync(file, 'utf8');
    expect(`${file}: WORLD 구현을 import하지 않는다`, !forbidden.test(source));
    expect(
      `${file}: 세션 생성을 새로 만들지 않는다`,
      !/function\s+createSession|new WorkoutSession/.test(source)
    );
  }

  const screen = readFileSync('src/app/danbaek-block.tsx', 'utf8');
  expect(
    '화면은 기존 startWorkoutSession()으로만 세션을 만든다',
    screen.includes('startWorkoutSession(')
  );
  expect('화면은 기존 세션 라우트로 보낸다', screen.includes("router.replace('/session')"));
  expect(
    // 주석에서 이름을 언급하는 것은 괜찮다 — 화면이 직접 계산을 **호출**하지 않는지 본다.
    '화면 안에서 운동 추천을 계산하지 않는다',
    !/resolveBlockRoute\(|danbaek-block-routing'|danbaek-learning-map'/.test(screen)
  );
  expect(
    '화면이 WorkoutRecord를 쓰지 않는다 (읽기만 한다)',
    !/addWorkoutRecord|deleteWorkoutRecord|saveWorkoutRecord/.test(screen)
  );

  const presentationSource = readFileSync('src/utils/danbaek-block-presentation.ts', 'utf8');
  expect(
    '표현 모델은 라우팅 어댑터를 재사용한다',
    presentationSource.includes("from '@/utils/danbaek-block-routing'")
  );
  expect(
    '표현 모델이 저장소를 건드리지 않는다',
    !/data\/|repository|AsyncStorage/.test(presentationSource)
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
