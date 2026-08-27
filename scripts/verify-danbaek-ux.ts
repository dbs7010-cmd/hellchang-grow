// 제품화 패스 검증 — 단백이 목소리 / 스탠리 역할 분리 / 학습 보드 / BLOCK 주 행동.
// 계산이 아니라 **누가 무슨 말을 할 수 있는가**를 본다 (계산은 verify:learning).
// Run: npm run verify:danbaek-ux
import { Exercises } from '@/config/exercises';
import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import {
  DanbaekBlockVoiceLines,
  DanbaekGainVoiceLines,
  DanbaekStageVoiceLines,
  MovementFamilyShortLabels,
} from '@/config/danbaek-voice-lines';
import { LearningStages, MovementFamilies, type MovementFamily, type StageBlock } from '@/types/danbaek-contract';
import type { WorkoutRecord } from '@/types/workout';
import { buildDanbaekLearningProfile, diffLearningProfiles } from '@/utils/danbaek-learning';
import {
  buildDanbaekGainVoice,
  buildDanbaekSetVoice,
  buildDanbaekVoice,
  buildLearningBoard,
  formatLearningStatus,
  learnedFamilyCount,
  seenFamilyCount,
} from '@/utils/danbaek-learning-presence';
import { buildBlockPresentation } from '@/utils/danbaek-block-presentation';
import { buildPtContext } from '@/utils/pt-context';
import { buildTrainerBriefSections } from '@/utils/trainer-brief';
import { withInstrumentalParticle } from '@/utils/korean';

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

const repeated = (exerciseId: string, times: number): WorkoutRecord[] =>
  Array.from({ length: times }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return record({
      id: `${exerciseId}-${day}`,
      date: `2026-08-${day}`,
      createdAt: `2026-08-${day}T10:00:00.000Z`,
      exercises: [exercise(exerciseId)],
    });
  });

/** 단계보다 앞선 주장으로 읽히는 표현. 낮은 단계에서 나오면 앱이 거짓말을 한 것이다. */
const AHEAD_OF_STAGE = /할 수 있|배웠|익숙|능숙|나도 해\b|다 알아|마스터/;

// ── 1. 단백이 목소리는 학습 단계보다 앞서지 않는다 ─────────────────────────
{
  expect(
    '모든 단계에 대사가 있다 (빠진 단계에서 화면이 비지 않는다)',
    LearningStages.every((stage) => (DanbaekStageVoiceLines[stage] ?? '').length > 0)
  );

  // 본 적 없음 / 한 번 봄 / 두 번 봄 — 아직 "할 수 있다"고 말하면 안 된다.
  const notYet = [
    profileOf([]),
    profileOf(repeated('bench-press', 1)),
    profileOf(repeated('bench-press', 2)),
  ];
  for (const profile of notYet) {
    const voice = buildDanbaekVoice(profile);
    expect(
      `${voice.learningStage}: 단계보다 앞서 말하지 않는다 ("${voice.line}")`,
      !AHEAD_OF_STAGE.test(voice.line)
    );
  }

  // 배운 뒤에야 할 수 있다고 말한다.
  const learned = buildDanbaekVoice(profileOf(repeated('bench-press', 4)));
  expect('배움 단계에서는 할 수 있다고 말해도 된다', learned.learningStage === 'learned');
  expect('그 단계의 대사가 나온다', learned.line === DanbaekStageVoiceLines.learned);

  const proficient = buildDanbaekVoice(profileOf(repeated('bench-press', 16)));
  expect('능숙 단계 대사도 단계에서만 나온다', proficient.line === DanbaekStageVoiceLines.proficient);

  // 대사는 단계로만 색인된다 — 같은 상태면 항상 같은 말(무작위 없음).
  const twice = [buildDanbaekVoice(profileOf(repeated('bench-press', 4))).line, buildDanbaekVoice(profileOf(repeated('bench-press', 4))).line];
  expect('같은 상태면 같은 말을 한다 (화면이 흔들리지 않는다)', twice[0] === twice[1]);
}

// ── 2. 두 층으로 말한다: 단백이 한마디 + 정확한 상태 ───────────────────────
{
  const voice = buildDanbaekVoice(profileOf(repeated('lat-pulldown', 2)));
  expect('한마디가 있다', voice.line.length > 0);
  expect('상태 한 줄이 있다', voice.status.length > 0);
  expect(
    '상태에는 동작과 단계가 그대로 들어간다',
    voice.status === `${MovementFamilyShortLabels.pull_vertical} · ${LearningStageLabels.imitating}`
  );
  expect('시스템 설명문이 한마디 자리를 차지하지 않는다', !voice.line.includes('·'));
  expect(
    '한마디가 3인칭 시스템 문장이 아니다',
    !voice.line.startsWith('단백이가') && !voice.line.includes('지켜보는 중')
  );

  const empty = buildDanbaekVoice(profileOf([]));
  expect('본 게 없으면 그렇게 말한다', empty.status === '아직 본 동작 없음');
  expect('그래도 한마디는 있다', empty.line === DanbaekStageVoiceLines.unseen);
  expect(
    '운동하지 않았다고 탓하지 않는다',
    !/안 하|게으|또 안|실패|왜 안/.test(`${empty.line} ${empty.status}`)
  );

  // 상태 표기는 모든 계열에서 짧은 이름을 쓴다 (칩 한 줄에 들어가야 한다).
  for (const family of MovementFamilies) {
    const status = formatLearningStatus(family, 'observing');
    expect(`${family}: 상태 표기가 짧은 이름을 쓴다`, status.startsWith(MovementFamilyShortLabels[family]));
    expect(`${family}: 상태 표기가 20자를 넘지 않는다`, status.length <= 20);
  }
}

// ── 3. 세트 반응 / 결과 반응도 같은 규칙을 따른다 ──────────────────────────
{
  const known = buildDanbaekSetVoice('bench-press');
  expect('아는 운동이면 단백이가 자기 말로 반응한다', known === `나도 해볼래! · ${MovementFamilyShortLabels.push_horizontal}`);
  expect('모르는 운동이면 null이다 (호출부가 기존 반응으로 떨어진다)', buildDanbaekSetVoice('custom-1') === null);
  expect('id가 없으면 null이다', buildDanbaekSetVoice(undefined) === null);

  const stageUp = diffLearningProfiles(profileOf(repeated('bench-press', 1)), profileOf(repeated('bench-press', 2)));
  const moreOnly = diffLearningProfiles(profileOf(repeated('bench-press', 2)), profileOf(repeated('bench-press', 3)));
  expect('단계가 오르면 늘었다고 말한다', buildDanbaekGainVoice(stageUp) === '한 걸음 늘었어!');
  expect('단계가 그대로면 더 봤다고만 말한다', buildDanbaekGainVoice(moreOnly) === DanbaekGainVoiceLines.moreEvidence);
  expect('배운 것이 없으면 말하지 않는다', buildDanbaekGainVoice([]) === null);
  expect(
    '단계가 안 올랐는데 올랐다고 하지 않는다',
    buildDanbaekGainVoice(moreOnly)?.includes('늘었') !== true
  );
}
// ── 4. 학습 보드 — 본 것만, 많이 본 순서로 ─────────────────────────────────
{
  const profile = profileOf([
    ...repeated('bench-press', 3),
    record({ id: 'r-sq', date: '2026-08-20', createdAt: '2026-08-20T10:00:00.000Z', exercises: [exercise('squat')] }),
  ]);
  const board = buildLearningBoard(profile);

  expect('본 계열만 나온다 (할 일 목록이 되지 않는다)', board.every((row) => row.evidenceCount > 0));
  expect('많이 본 순서다', board[0].movementFamily === 'push_horizontal');
  expect('짧은 이름을 쓴다', board[0].label === MovementFamilyShortLabels.push_horizontal);
  expect('단계 이름은 정책 표에서 온다 (3번 봄 = 따라 하는 중)', board[0].stageLabel === LearningStageLabels.imitating);
  expect('본 횟수는 스냅샷 값 그대로다', board[0].evidenceCount === 3);
  expect('상한을 지킨다', buildLearningBoard(profile, 1).length === 1);
  expect('본 게 없으면 빈 목록이다', buildLearningBoard(profileOf([])).length === 0);
  expect('본 계열 수를 셀 수 있다', seenFamilyCount(profile) === 2);
  expect('배운 계열 수는 그보다 작거나 같다', learnedFamilyCount(profile) <= seenFamilyCount(profile));
}

// ── 5. 스탠리는 스탠리 역할만 한다 ─────────────────────────────────────────
{
  const context = buildPtContext({
    profile: null,
    bodyHistory: [],
    workoutRecords: [record({ id: 'r1', date: '2026-08-25', exercises: [exercise('bench-press')] })],
    streak: { currentStreakDays: 1, longestStreakDays: 1, rewardClaimed: false },
    routines: [],
    activeSession: null,
    today: '2026-08-26',
  });

  const sections = buildTrainerBriefSections(context);
  expect('지금 상태 한 줄이 있다', sections.status.length > 0);
  expect('오늘 중요한 한 가지가 있다', sections.focus.length > 0);
  expect('근거는 따로 깔린다', sections.records.length > 0);
  expect('한 가지가 근거에 중복되지 않는다', !sections.records.includes(sections.focus));
  expect(
    '스탠리 브리핑에 단백이가 섞이지 않는다 (역할 분리)',
    ![sections.status, sections.focus, ...sections.records].some((line) => line.includes('단백이'))
  );
  expect(
    '스탠리는 전문가 말투를 유지한다',
    /습니다|시죠|셨네요|입니다/.test(`${sections.status} ${sections.focus}`)
  );
  expect(
    '단백이 대사는 스탠리 말투를 쓰지 않는다',
    LearningStages.every((stage) => !/습니다|하시죠/.test(DanbaekStageVoiceLines[stage]))
  );
}

// ── 6. BLOCK — 사용자가 알아야 할 세 가지 + 주 행동 하나 ───────────────────
{
  const block: StageBlock = {
    outcome: 'block',
    stageId: 'stage-3',
    explanationKey: 'block.pull_vertical.gate',
    requirement: {
      movementFamily: 'pull_vertical',
      minimumLearningStage: 'learned',
      reason: '이 문은 매달려서 올라가야 합니다.',
    },
    recommendedMovementFamily: 'pull_vertical',
  };

  const presentation = buildBlockPresentation({ block, exerciseDb: Exercises, records: [] });

  expect('단백이가 먼저 자기 말로 말한다', presentation.danbaekLine === DanbaekBlockVoiceLines.needsPractice);
  expect('왜 막혔는지는 WORLD가 준 이유 그대로다', presentation.whyBlockedLine === block.requirement.reason);
  expect(
    '무엇을 배우면 되는지가 사람 말로 나온다',
    presentation.whatToLearnLine.includes(MovementFamilyShortLabels.pull_vertical)
  );
  expect(
    '세 줄 어디에도 계약 용어가 없다',
    ![presentation.danbaekLine, presentation.whyBlockedLine, presentation.whatToLearnLine].some((line) =>
      /movement|family|stage|contract|evidence|pull_vertical/i.test(line)
    )
  );

  const primary = presentation.primaryAction!;
  expect('지금 할 행동이 하나로 정해진다', primary !== null);
  expect('그 행동은 후보 순서 첫 번째다', primary.exercise.exerciseId === presentation.exercises[0].exerciseId);
  expect('버튼 문구에 운동 이름이 들어간다', primary.label.includes(primary.exercise.exerciseName));
  expect('조사가 이름에 맞게 붙는다', primary.label === `${withInstrumentalParticle(primary.exercise.exerciseName)} 시작`);
  expect('나머지 후보는 따로 빠진다', presentation.otherExercises.length === presentation.exercises.length - 1);
  expect(
    '나머지 후보에 주 행동이 중복되지 않는다',
    !presentation.otherExercises.some((candidate) => candidate.exerciseId === primary.exercise.exerciseId)
  );

  // 특정 운동을 요구하면 그것이 주 행동이다.
  const specific = buildBlockPresentation({
    block: {
      ...block,
      recommendedMovementFamily: 'push_horizontal',
      requirement: { specificExerciseId: 'bench-press', reason: '벤치 몬스터입니다.' },
    },
    exerciseDb: Exercises,
    records: [record({ id: 'r1', exercises: [exercise('push-up')] })],
  });
  expect('요구 운동이 주 행동이 된다', specific.primaryAction?.exercise.exerciseId === 'bench-press');
  expect('그 이유도 한 줄로 말한다', specific.primaryAction?.note === '이 구간이 요구하는 운동이에요');
  expect(
    '무엇을 배우면 되는지도 그 운동으로 바뀐다',
    specific.whatToLearnLine.includes(Exercises.find((e) => e.id === 'bench-press')!.name)
  );

  // 후보가 없는 계열은 주 행동을 지어내지 않는다.
  for (const family of ['carry', 'locomotion'] as MovementFamily[]) {
    const empty = buildBlockPresentation({
      block: { ...block, recommendedMovementFamily: family },
      exerciseDb: Exercises,
      records: [],
    });
    expect(`${family}: 주 행동을 지어내지 않는다`, empty.primaryAction === null);
    expect(`${family}: 다른 후보도 없다`, empty.otherExercises.length === 0);
    expect(`${family}: 단백이가 기다린다고만 말한다`, empty.danbaekLine === DanbaekBlockVoiceLines.noRoute);
    expect(`${family}: 없다는 안내는 남는다`, empty.emptyLine !== null);
  }
}

// ── 7. 표현 층은 데이터를 바꾸지 않는다 ────────────────────────────────────
{
  const records = [record({ id: 'r1', exercises: [exercise('bench-press')] })];
  const recordsJson = JSON.stringify(records);
  const profile = profileOf(records);
  const profileJson = JSON.stringify(profile);

  buildDanbaekVoice(profile);
  buildLearningBoard(profile);
  buildDanbaekSetVoice('bench-press');
  buildBlockPresentation({
    block: {
      outcome: 'block',
      stageId: 's1',
      explanationKey: 'k',
      requirement: { reason: '이유' },
      recommendedMovementFamily: 'push_horizontal',
    },
    exerciseDb: Exercises,
    records,
  });

  expect('WorkoutRecord가 그대로다', JSON.stringify(records) === recordsJson);
  expect('학습 스냅샷이 그대로다', JSON.stringify(profile) === profileJson);
  expect(
    '같은 입력이면 같은 화면이 나온다',
    JSON.stringify(buildDanbaekVoice(profileOf(records))) === JSON.stringify(buildDanbaekVoice(profileOf(records)))
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
