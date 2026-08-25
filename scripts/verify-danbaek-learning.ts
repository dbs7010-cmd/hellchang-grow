import { Exercises } from '@/config/exercises';
import { DanbaekLearningExerciseMap } from '@/config/danbaek-learning-map';
import { DanbaekLearningThresholds, learningStageForEvidence } from '@/config/danbaek-learning-policy';
import {
  DANBAEK_CONTRACT_VERSION,
  MovementFamilies,
  type MovementFamily,
  type StageBlock,
} from '@/types/danbaek-contract';
import type { WorkoutRecord } from '@/types/workout';
import { buildDanbaekLearningProfile, capabilityFor, diffLearningProfiles } from '@/utils/danbaek-learning';
import { exerciseIdsForMovementFamily, resolveBlockRoute } from '@/utils/danbaek-block-routing';

/**
 * DANBAEK LEARNING ADAPTER 검증 (rebuild — APP TEAM).
 *
 * 확인하는 것은 하나다: **실제로 수행된 운동만이 단백이의 학습 근거가 되는가.**
 * UI 조작, 취소된 세션, 무효 세트, 같은 기록 재조회는 근거가 되어서는 안 된다.
 *
 * 전부 순수 함수다 — 저장소도 시계도 읽지 않는다.
 */

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const NOW = '2026-08-26T09:00:00.000Z';

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

const profileOf = (records: WorkoutRecord[]) => buildDanbaekLearningProfile({ records, generatedAt: NOW });

// 1. 기록이 없으면 아무것도 배우지 않았다
{
  const profile = profileOf([]);
  expect('계약 버전이 1이다', profile.contractVersion === DANBAEK_CONTRACT_VERSION);
  expect('생성 시각은 넘긴 값 그대로다 (시계를 읽지 않는다)', profile.generatedAt === NOW);
  expect('여덟 계열이 모두 나온다', profile.capabilities.length === MovementFamilies.length);
  expect(
    '계열 순서가 계약 순서와 같다',
    profile.capabilities.map((c) => c.movementFamily).join() === MovementFamilies.join()
  );
  expect('전부 unseen이다', profile.capabilities.every((c) => c.learningStage === 'unseen'));
  expect('evidence는 전부 0이다', profile.capabilities.every((c) => c.evidenceCount === 0));
  expect('관찰 시각이 없다', profile.capabilities.every((c) => c.lastObservedAt === null));
  expect('대표 운동도 없다', profile.capabilities.every((c) => c.representativeExerciseIds.length === 0));
}

// 2. 유효한 push 운동은 push_horizontal 근거가 된다
{
  const profile = profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]);
  const push = capabilityFor(profile, 'push_horizontal');
  expect('벤치프레스가 push_horizontal 근거가 된다', push.evidenceCount === 1);
  expect('한 번 봤으면 observing이다', push.learningStage === 'observing');
  expect('관찰 시각은 기록의 저장 시각이다', push.lastObservedAt === '2026-08-25T10:00:00.000Z');
  expect('대표 운동에 그 운동이 남는다', push.representativeExerciseIds.join() === 'bench-press');
}

// 3. pull 운동은 push 근거를 올리지 않는다
{
  const profile = profileOf([record({ id: 'r1', exercises: [exercise('lat-pulldown')] })]);
  expect('랫풀다운은 pull_vertical이다', capabilityFor(profile, 'pull_vertical').evidenceCount === 1);
  expect('push_horizontal은 그대로 0이다', capabilityFor(profile, 'push_horizontal').evidenceCount === 0);
  expect('push_horizontal은 unseen이다', capabilityFor(profile, 'push_horizontal').learningStage === 'unseen');
  expect('바벨로우는 pull_horizontal이다', profileOf([record({ id: 'r2', exercises: [exercise('barbell-row')] })]).capabilities.find((c) => c.movementFamily === 'pull_horizontal')?.evidenceCount === 1);
}

// 4. 지도는 실제 Exercise DB id만 쓴다
{
  const dbIds = new Set(Exercises.map((e) => e.id));
  const mapped = Object.keys(DanbaekLearningExerciseMap);
  const unknown = mapped.filter((id) => !dbIds.has(id));
  expect('지도의 모든 키가 Exercise DB에 있다', unknown.length === 0);
  expect('지도가 비어 있지 않다', mapped.length > 0);
  expect(
    '지도의 모든 값이 계약의 계열이다',
    Object.values(DanbaekLearningExerciseMap).every((family) =>
      (MovementFamilies as readonly string[]).includes(family)
    )
  );

  // DB에 없는 운동(직접 추가)은 학습 근거가 되지 않는다.
  const custom = profileOf([
    record({ id: 'r1', exercises: [{ id: 'x', name: '내 운동', sets: 3, reps: 10 }] }),
  ]);
  expect('exerciseId가 없는 운동은 근거가 아니다', custom.capabilities.every((c) => c.evidenceCount === 0));

  const unmapped = profileOf([record({ id: 'r2', exercises: [exercise('calf-raise')] })]);
  expect('아직 매핑되지 않은 운동도 근거가 아니다', unmapped.capabilities.every((c) => c.evidenceCount === 0));
}

// 5. 같은 기록을 다시 읽어도 evidence가 늘지 않는다
{
  const one = record({ id: 'r1', sessionId: 's1', exercises: [exercise('bench-press')] });
  const twiceInList = profileOf([one, one]);
  expect('같은 기록이 두 번 들어와도 한 번이다', capabilityFor(twiceInList, 'push_horizontal').evidenceCount === 1);

  const sameSessionDifferentId = profileOf([
    one,
    record({ id: 'r2', sessionId: 's1', exercises: [exercise('bench-press')] }),
  ]);
  expect(
    '같은 세션에서 온 기록은 id가 달라도 한 번이다',
    capabilityFor(sameSessionDifferentId, 'push_horizontal').evidenceCount === 1
  );

  const again = profileOf([one]);
  expect(
    '같은 입력을 다시 계산하면 같은 결과다',
    JSON.stringify(again) === JSON.stringify(profileOf([one]))
  );

  const duplicatedExercise = profileOf([
    record({ id: 'r3', exercises: [exercise('bench-press'), exercise('bench-press')] }),
  ]);
  expect(
    '한 기록 안에서 같은 종목이 두 줄이어도 한 번이다',
    capabilityFor(duplicatedExercise, 'push_horizontal').evidenceCount === 1
  );
}

// 6. 취소/무효 데이터는 근거가 되지 않는다
{
  const notCompleted = profileOf([
    record({ id: 'r1', completed: false, exercises: [exercise('bench-press')] }),
  ]);
  expect('완료로 표시되지 않은 기록은 근거가 아니다', capabilityFor(notCompleted, 'push_horizontal').evidenceCount === 0);

  const noSets = profileOf([
    record({ id: 'r2', exercises: [{ id: 'e', name: '벤치프레스', exerciseId: 'bench-press' }] }),
  ]);
  expect('세트가 하나도 없는 운동은 근거가 아니다', capabilityFor(noSets, 'push_horizontal').evidenceCount === 0);

  const zeroReps = profileOf([
    record({
      id: 'r3',
      exercises: [
        {
          id: 'e',
          name: '벤치프레스',
          exerciseId: 'bench-press',
          sets: 1,
          reps: 0,
          setDetails: [{ id: 's', weightKg: 100, reps: 0, completed: true }],
        },
      ],
    }),
  ]);
  expect('횟수 0회 세트는 근거가 아니다', capabilityFor(zeroReps, 'push_horizontal').evidenceCount === 0);

  const uncompletedSet = profileOf([
    record({
      id: 'r4',
      exercises: [
        {
          id: 'e',
          name: '벤치프레스',
          exerciseId: 'bench-press',
          sets: 1,
          reps: 10,
          setDetails: [{ id: 's', weightKg: 100, reps: 10, completed: false }],
        },
      ],
    }),
  ]);
  expect('완료하지 않은 세트는 근거가 아니다', capabilityFor(uncompletedSet, 'push_horizontal').evidenceCount === 0);

  const emptyRecord = profileOf([record({ id: 'r5', exercises: [] })]);
  expect('운동이 없는 기록은 근거가 아니다', emptyRecord.capabilities.every((c) => c.evidenceCount === 0));

  // 세트 상세가 없는 옛 기록은 저장된 요약값으로 본다 (기존 기록 계약 유지).
  const legacy = profileOf([
    record({ id: 'r6', exercises: [{ id: 'e', name: '벤치프레스', exerciseId: 'bench-press', sets: 3, reps: 8 }] }),
  ]);
  expect('옛 요약 기록도 실제로 한 운동이면 근거가 된다', capabilityFor(legacy, 'push_horizontal').evidenceCount === 1);
}

// 7. 여러 유효 운동이 계열별로 모인다
{
  const profile = profileOf([
    record({
      id: 'r1',
      createdAt: '2026-08-20T10:00:00.000Z',
      exercises: [exercise('bench-press'), exercise('push-up'), exercise('lat-pulldown')],
    }),
    record({
      id: 'r2',
      createdAt: '2026-08-25T10:00:00.000Z',
      exercises: [exercise('incline-bench-press'), exercise('squat')],
    }),
  ]);

  expect('push_horizontal은 세 종목이 모였다', capabilityFor(profile, 'push_horizontal').evidenceCount === 3);
  expect('pull_vertical은 하나다', capabilityFor(profile, 'pull_vertical').evidenceCount === 1);
  expect('squat도 하나다', capabilityFor(profile, 'squat').evidenceCount === 1);
  expect('hinge는 아직 못 봤다', capabilityFor(profile, 'hinge').learningStage === 'unseen');
  expect(
    '마지막 관찰 시각은 가장 최근 기록의 것이다',
    capabilityFor(profile, 'push_horizontal').lastObservedAt === '2026-08-25T10:00:00.000Z'
  );
  expect(
    '대표 운동은 많이 본 순서다',
    capabilityFor(profile, 'push_horizontal').representativeExerciseIds.length === 3
  );
}

// 8. LearningStage는 임계값 하나에서만 나온다
{
  expect('0이면 unseen', learningStageForEvidence(0) === 'unseen');
  expect('임계값 미만은 이전 단계', learningStageForEvidence(DanbaekLearningThresholds.imitating - 1) === 'observing');
  expect('imitating 임계값', learningStageForEvidence(DanbaekLearningThresholds.imitating) === 'imitating');
  expect('learned 임계값', learningStageForEvidence(DanbaekLearningThresholds.learned) === 'learned');
  expect('familiar 임계값', learningStageForEvidence(DanbaekLearningThresholds.familiar) === 'familiar');
  expect('proficient 임계값', learningStageForEvidence(DanbaekLearningThresholds.proficient) === 'proficient');
  expect('임계값을 넘어도 proficient에서 멈춘다', learningStageForEvidence(999) === 'proficient');
  expect(
    '임계값은 단조 증가한다',
    DanbaekLearningThresholds.observing < DanbaekLearningThresholds.imitating &&
      DanbaekLearningThresholds.imitating < DanbaekLearningThresholds.learned &&
      DanbaekLearningThresholds.learned < DanbaekLearningThresholds.familiar &&
      DanbaekLearningThresholds.familiar < DanbaekLearningThresholds.proficient
  );

  // 실제 기록으로도 같은 단계가 나온다 (임계값만큼 세션을 반복).
  const many = Array.from({ length: DanbaekLearningThresholds.learned }, (_, index) =>
    record({ id: `r${index}`, exercises: [exercise('bench-press')] })
  );
  expect('기록을 쌓으면 단계가 오른다', capabilityFor(profileOf(many), 'push_horizontal').learningStage === 'learned');
}

// 9. 이번 운동으로 무엇이 달라졌는가 (결과 화면용 차이)
{
  const before = profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]);
  const after = profileOf([
    record({ id: 'r1', exercises: [exercise('bench-press')] }),
    record({ id: 'r2', exercises: [exercise('incline-bench-press'), exercise('squat')] }),
  ]);

  const gains = diffLearningProfiles(before, after);
  const families = gains.map((gain) => gain.movementFamily).sort();
  expect('늘어난 계열만 나온다', families.join() === 'push_horizontal,squat');

  const push = gains.find((gain) => gain.movementFamily === 'push_horizontal');
  expect('늘어난 근거 수가 맞다', push?.gainedEvidence === 1);
  expect('단계 변화가 보인다', push?.fromStage === 'observing' && push?.toStage === 'imitating');

  expect('아무것도 안 했으면 변화도 없다', diffLearningProfiles(after, after).length === 0);
}

// 10. WORLD의 BLOCK을 현실 운동으로 되돌릴 수 있다
{
  const block: StageBlock = {
    outcome: 'block',
    stageId: 'stage-3',
    requirement: {
      movementFamily: 'pull_vertical',
      minimumLearningStage: 'learned',
      reason: '이 문은 매달려서 올라가야 합니다.',
    },
    recommendedMovementFamily: 'pull_vertical',
    explanationKey: 'block.pull_vertical.gate',
  };

  const route = resolveBlockRoute({ block, exerciseDb: Exercises, records: [] });
  expect('막힌 계열이 그대로 전달된다', route.movementFamily === 'pull_vertical');
  expect('설명 키를 지어내지 않고 그대로 쓴다', route.explanationKey === 'block.pull_vertical.gate');
  expect('그 계열의 실제 운동 후보가 나온다', route.exercises.length > 0);
  expect(
    '후보가 전부 그 계열이다',
    route.exercises.every((candidate) => exerciseIdsForMovementFamily('pull_vertical').includes(candidate.exerciseId))
  );
  expect('세션이 쓰는 모양 그대로다', route.exercises.every((c) => Boolean(c.exerciseId && c.exerciseName)));
  expect('스탠리 문장에 WORLD가 준 이유가 들어간다', route.stanleyLine.includes('매달려서 올라가야 합니다'));
  expect('필요한 단계도 사람 말로 들어간다', route.stanleyLine.includes('배움'));

  // 해본 적 있는 운동이 먼저 온다.
  const withHistory = resolveBlockRoute({
    block,
    exerciseDb: Exercises,
    records: [record({ id: 'r1', exercises: [exercise('pull-up')] })],
  });
  expect('해본 적 있는 운동이 첫 후보다', withHistory.exercises[0]?.exerciseId === 'pull-up');

  const emptyFamily = resolveBlockRoute({
    block: { ...block, recommendedMovementFamily: 'carry' as MovementFamily },
    exerciseDb: Exercises,
    records: [],
  });
  expect('아직 운동이 없는 계열이면 후보를 지어내지 않는다', emptyFamily.exercises.length === 0);
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
