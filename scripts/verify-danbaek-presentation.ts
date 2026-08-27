// 단백이 학습 "표현" 검증 — HOME 현황 한 줄 / 세션 관찰 반응 / 결과 리빌 / 스탠리 언급 /
// 단백세상 입구 seam. 계산이 아니라 **말과 노출 규칙**을 본다 (계산은 verify:learning).
// Run: npm run verify:learning-ux
import { Exercises } from '@/config/exercises';
import { DanbaekWorldEntry, resolveDanbaekWorldEntry } from '@/config/danbaek-world-entry';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { DanbaekStageVoiceLines, MovementFamilyShortLabels } from '@/config/danbaek-voice-lines';
import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';
import type { WorkoutRecord } from '@/types/workout';
import { buildDanbaekLearningProfile, diffLearningProfiles } from '@/utils/danbaek-learning';
import {
  buildDanbaekSetVoice,
  buildDanbaekVoice,
  formatLearningStatus,
  describeLearningGain,
  hasLearnedStage,
  learnedFamilyCount,
  mostRecentlyObserved,
} from '@/utils/danbaek-learning-presence';
import { buildDanbaekWatchLine, buildTrainerBrief } from '@/utils/trainer-brief';
import { buildPtContext } from '@/utils/pt-context';

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

const profileOf = (records: WorkoutRecord[]): DanbaekLearningProfile =>
  buildDanbaekLearningProfile({ records, generatedAt: NOW });

/** 같은 종목을 여러 날에 걸쳐 반복한 기록. evidence를 단계까지 올리는 데 쓴다. */
const repeated = (exerciseId: string, times: number, startDay = 1): WorkoutRecord[] =>
  Array.from({ length: times }, (_, index) => {
    const day = String(startDay + index).padStart(2, '0');
    return record({
      id: `${exerciseId}-${day}`,
      date: `2026-08-${day}`,
      createdAt: `2026-08-${day}T10:00:00.000Z`,
      exercises: [exercise(exerciseId)],
    });
  });

// ── 1. 단백이 목소리 — 본 것이 없으면 없다고 말한다 ────────────────────────
{
  const voice = buildDanbaekVoice(profileOf([]));
  expect('본 것이 없으면 기다리는 상태다', voice.waiting === true);
  expect('그래도 한마디는 항상 있다', voice.line.length > 0);
  expect('상태 한 줄도 항상 있다', voice.status === '아직 본 동작 없음');
  expect('계열을 지어내지 않는다', voice.movementFamily === null);
  expect('단계도 unseen 그대로다', voice.learningStage === 'unseen');
  expect(
    '기록이 없다고 죄책감을 주는 말을 쓰지 않는다',
    !/안 하|못 하|게으|실패|없잖/.test(`${voice.line} ${voice.status}`)
  );
}

// ── 2. 단백이 목소리 — 실제 기록에서만 나온다 ──────────────────────────────
{
  const voice = buildDanbaekVoice(profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]));
  expect('한 번 봤으면 기다리는 상태가 아니다', voice.waiting === false);
  expect('본 계열이 그대로 나온다', voice.movementFamily === 'push_horizontal');
  expect('단계는 어댑터가 준 값 그대로다', voice.learningStage === 'observing');
  expect(
    '상태 한 줄이 그 계열과 단계를 말한다',
    voice.status === formatLearningStatus('push_horizontal', 'observing')
  );
  expect('아직 배운 게 아니라 지켜보는 중이다', voice.status.includes('지켜보는 중'));
  expect('한 번 본 것을 배웠다고 말하지 않는다', !voice.line.includes('배웠') && !voice.line.includes('할 수 있'));
}

// ── 3. 단백이 목소리 — 가장 최근에 본 계열을 말한다 ────────────────────────
{
  const profile = profileOf([
    record({ id: 'old', date: '2026-08-01', createdAt: '2026-08-01T10:00:00.000Z', exercises: [exercise('squat')] }),
    record({ id: 'new', date: '2026-08-20', createdAt: '2026-08-20T10:00:00.000Z', exercises: [exercise('bench-press')] }),
  ]);
  expect('나중에 본 계열이 화면에 나온다', buildDanbaekVoice(profile).movementFamily === 'push_horizontal');

  // 같은 순간에 두 계열을 봤으면 더 많이 본 쪽이 이긴다 — 같은 입력이면 화면이 흔들리지 않는다.
  const sameMoment = profileOf([
    ...repeated('squat', 2),
    record({
      id: 'tie',
      date: '2026-08-20',
      createdAt: '2026-08-20T10:00:00.000Z',
      exercises: [exercise('squat'), exercise('bench-press')],
    }),
  ]);
  const first = mostRecentlyObserved(sameMoment);
  const second = mostRecentlyObserved(sameMoment);
  expect('관찰 시각이 같으면 더 많이 본 계열이 이긴다', first?.movementFamily === 'squat');
  expect('같은 입력이면 같은 결과다', first?.movementFamily === second?.movementFamily);
}

// ── 4. 단백이 목소리 — 단계가 오르면 말이 달라진다 ─────────────────────────
{
  const learnedProfile = profileOf(repeated('bench-press', 4));
  const voice = buildDanbaekVoice(learnedProfile);
  expect('네 번 봤으면 배움 단계다', voice.learningStage === 'learned');
  expect('상태 한 줄도 배움으로 바뀐다', voice.status.includes(LearningStageLabels.learned));
  expect('한마디도 그 단계에서만 바뀐다', voice.line === DanbaekStageVoiceLines.learned);
  expect('배운 계열 수를 셀 수 있다', learnedFamilyCount(learnedProfile) === 1);
  expect('배움 미만은 세지 않는다', learnedFamilyCount(profileOf(repeated('bench-press', 1))) === 0);
  expect('배움 이상만 배운 것으로 본다', hasLearnedStage('learned') && !hasLearnedStage('imitating'));
}

// ── 5. 단백이 목소리 — 앱이 모르는 운동은 아는 척하지 않는다 ───────────────
{
  const voice = buildDanbaekVoice(
    profileOf([record({ id: 'custom', exercises: [exercise('custom-exercise-xyz')] })])
  );
  expect('매핑되지 않은 운동은 학습으로 보이지 않는다', voice.waiting === true);
  expect('그런 상태에서도 없는 계열을 말하지 않는다', voice.movementFamily === null);
}

// ── 6. 세션 관찰 반응 — 아는 동작에서만 단백이가 나온다 ─────────────────────
{
  const known = buildDanbaekSetVoice('bench-press');
  expect('아는 운동이면 단백이가 자기 말로 반응한다', known !== null && known.startsWith('나도 해볼래!'));
  expect('그 동작 이름이 짧게 들어간다', known?.includes(MovementFamilyShortLabels.push_horizontal) === true);
  expect(
    '세트 반응이 성장/SP 언어로 새지 않는다',
    known !== null && !/SP|레벨|XP|성장/.test(known)
  );
  expect('직접 추가한 운동은 null이다 (호출부가 기존 반응으로 떨어진다)', buildDanbaekSetVoice('custom-exercise-1') === null);
  expect('운동 id가 없으면 null이다', buildDanbaekSetVoice(undefined) === null);
}

// ── 7. 결과 리빌 — 단계가 올랐을 때만 올랐다고 말한다 ───────────────────────
{
  const before = profileOf(repeated('bench-press', 1));
  const after = profileOf(repeated('bench-press', 2));
  const [gain] = diffLearningProfiles(before, after);
  const copy = describeLearningGain(gain);
  expect('올라간 단계가 화살표로 나온다', copy.stageChanged && copy.line.includes('→'));
  expect('이전 단계가 그대로 나온다', copy.line.includes(LearningStageLabels.observing));
  expect('올라간 단계가 그대로 나온다', copy.line.includes(LearningStageLabels.imitating));
  expect('계열 이름이 나온다', copy.familyLabel === MovementFamilyLabels.push_horizontal);
}

// ── 8. 결과 리빌 — 단계가 그대로여도 지켜본 것은 말한다 (가짜 stage-up 금지) ─
{
  const before = profileOf(repeated('bench-press', 2));
  const after = profileOf(repeated('bench-press', 3));
  const gains = diffLearningProfiles(before, after);
  expect('evidence가 늘었으면 결과에 낼 것이 있다', gains.length === 1);

  const copy = describeLearningGain(gains[0]);
  expect('단계는 그대로다', copy.stageChanged === false);
  expect('단계가 오른 것처럼 화살표를 쓰지 않는다', !copy.line.includes('→'));
  expect('대신 더 봤다고 말한다', copy.line.includes('더 봤어요'));
  expect('지금 단계도 함께 보여준다', copy.line.includes(LearningStageLabels.imitating));
  expect('오늘 늘어난 만큼만 말한다', copy.line.includes('1번'));

  // 아무것도 하지 않은 세션(유효 기록 없음)은 결과에 낼 것이 없다 → 섹션 자체가 없다.
  const same = profileOf(repeated('bench-press', 3));
  expect('늘어난 evidence가 없으면 낼 것도 없다', diffLearningProfiles(same, same).length === 0);
}

// ── 9. 스탠리 — 가르치는 쪽은 여전히 스탠리다 ───────────────────────────────
{
  const empty = buildDanbaekWatchLine(profileOf([]));
  expect('본 게 없으면 없다고 말한다', empty.includes('아직 본 게 없습니다'));
  expect('그러면서 오늘 할 일을 준다', empty.includes('보여주시죠'));

  const watching = buildDanbaekWatchLine(profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]));
  expect('단백이가 무엇을 따라 하는지 말한다', watching.includes(MovementFamilyLabels.push_horizontal));
  expect('단백이는 옆에서 따라 하는 존재로만 나온다', watching.includes('옆에서'));
  expect('자세를 보는 사람은 스탠리다', watching.includes('자세는 제가 봅니다'));

  const learned = buildDanbaekWatchLine(profileOf(repeated('bench-press', 4)));
  expect('배운 뒤에는 코칭이 무게로 넘어간다', learned.includes('무게에 집중'));
  expect(
    '스탠리가 캐릭터 육성 NPC 말투로 바뀌지 않는다',
    [empty, watching, learned].every((line) => !/키우|레벨|육성|성장시/.test(line))
  );
}

// ── 10. 스탠리 브리핑 — 단백이 줄은 더해질 뿐 기존 줄을 밀어내지 않는다 ─────
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

  const withoutDanbaek = buildTrainerBrief(context);
  const withDanbaek = buildTrainerBrief(context, profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]));

  expect('학습을 주지 않으면 예전 브리핑 그대로다', withoutDanbaek.every((line) => !line.includes('단백이')));
  expect('학습을 주면 한 줄만 늘어난다', withDanbaek.length === withoutDanbaek.length + 1);
  expect(
    '기존 줄은 순서까지 그대로다',
    withDanbaek.slice(0, withoutDanbaek.length).join('|') === withoutDanbaek.join('|')
  );
  expect('늘어난 줄이 단백이 줄이다', withDanbaek[withDanbaek.length - 1].includes('단백이'));
  expect('빈 줄은 없다', withDanbaek.every((line) => line.trim().length > 0));
}

// ── 11. 단백세상 입구 — runtime seam과 방어적 닫힘을 모두 지킨다 ────────────
{
  const profile = profileOf(repeated('bench-press', 4));

  expect('통합 브랜치의 WORLD seam은 열려 있다', DanbaekWorldEntry.available === true);
  expect('기본 WORLD 경로는 실제 runtime route다', DanbaekWorldEntry.route === '/danbaek-world');
  expect('열린 기본 seam에서는 입구가 있다', resolveDanbaekWorldEntry({ profile }) !== null);
  expect(
    'available만 켜도 경로가 없으면 입구가 없다',
    resolveDanbaekWorldEntry({ profile, seam: { available: true, route: null } }) === null
  );
  expect(
    '경로만 있고 연결되지 않았으면 입구가 없다',
    resolveDanbaekWorldEntry({ profile, seam: { available: false, route: './danbaek-world-placeholder' } }) === null
  );

  const open = resolveDanbaekWorldEntry({ profile, seam: { available: true, route: './danbaek-world-placeholder' } });
  expect('열린 seam에서는 입구가 생긴다', open !== null);
  expect('경로는 seam이 준 값 그대로다', open?.route === './danbaek-world-placeholder');
  expect('입구 이름은 단백세상이다', open?.label === '단백세상');
  /*
   * 보조 문구는 **지금 단백세상이 어떤 상황인가**에서 나온다.
   *
   * 예전에는 "배운 계열 수"(N가지)를 세어 보여줬고, 배운 게 없으면 고정 문구
   * '첫 번째 길이 기다리고 있어요'를 썼다. World First Contact 이후로 입구는
   * 실제 장면(막혔는가 / 열렸는가)을 말하도록 바뀌었고, verify:home FIXTURE E는
   * 오히려 그 옛 문구가 **남아 있지 않을 것**을 요구한다. 두 verifier가 서로 반대를
   * 주장하고 있어서 여기를 현재 계약에 맞춘다 — 제품을 옛 verifier에 맞춰 되돌리지 않는다.
   */
  expect('보조 문구가 비어 있지 않다', typeof open?.subLabel === 'string' && open.subLabel.trim().length > 0);
  expect(
    '보조 문구는 계열 개수 세기가 아니라 상황을 말한다',
    open !== null && !/d+가지/.test(open.subLabel)
  );

  const nothingLearned = resolveDanbaekWorldEntry({
    profile: profileOf([]),
    seam: { available: true, route: './danbaek-world-placeholder' },
  });
  expect(
    '아직 아무것도 못 본 상태에서는 첫 길이 막혀 있다고 말한다',
    nothingLearned?.subLabel.includes('열려요') === true
  );
  expect(
    '막힌 상태를 열린 것처럼 말하지 않는다',
    nothingLearned?.subLabel.includes('열려 있어요') === false
  );
  expect(
    '본 것이 생기면 문구가 달라진다 (고정 문구가 아니다)',
    open?.subLabel !== nothingLearned?.subLabel
  );
  expect(
    '입구가 WORLD 진행도를 지어내지 않는다',
    open !== null && !/스테이지|층|클리어|모험 \d/.test(open.subLabel)
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
