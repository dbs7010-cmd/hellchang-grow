// 단백이 학습 "표현" 검증 — HOME 현황 한 줄 / 세션 관찰 반응 / 결과 리빌 / 스탠리 언급 /
// 단백세상 입구 seam. 계산이 아니라 **말과 노출 규칙**을 본다 (계산은 verify:learning).
// Run: npm run verify:learning-ux
import { Exercises } from '@/config/exercises';
import { DanbaekWorldEntry, resolveDanbaekWorldEntry } from '@/config/danbaek-world-entry';
import { MovementFamilyLabels } from '@/config/danbaek-movement-labels';
import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';
import type { WorkoutRecord } from '@/types/workout';
import { buildDanbaekLearningProfile, diffLearningProfiles } from '@/utils/danbaek-learning';
import {
  buildDanbaekPresence,
  danbaekSetObservationCopy,
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

// ── 1. HOME 현황 — 본 것이 없으면 없다고 말한다 ─────────────────────────────
{
  const presence = buildDanbaekPresence({ profile: profileOf([]), exerciseDb: Exercises });
  expect('본 것이 없으면 기다리는 상태다', presence.waiting === true);
  expect('그래도 한 줄은 항상 있다', presence.headline.length > 0);
  expect('단백이 이야기라는 게 문구에 드러난다', presence.headline.includes('단백이'));
  expect('근거가 없으면 근거 줄을 만들지 않는다', presence.detail === null);
  expect('계열을 지어내지 않는다', presence.movementFamily === null);
  expect('단계도 unseen 그대로다', presence.learningStage === 'unseen');
  expect(
    '기록이 없다고 죄책감을 주는 말을 쓰지 않는다',
    !/안 하|못 하|게으|실패|없잖/.test(presence.headline)
  );
}

// ── 2. HOME 현황 — 실제 기록에서만 나온다 ───────────────────────────────────
{
  const presence = buildDanbaekPresence({
    profile: profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]),
    exerciseDb: Exercises,
  });
  expect('한 번 봤으면 기다리는 상태가 아니다', presence.waiting === false);
  expect('본 계열이 그대로 나온다', presence.movementFamily === 'push_horizontal');
  expect('단계는 어댑터가 준 값 그대로다', presence.learningStage === 'observing');
  expect(
    '문구가 그 계열을 말한다',
    presence.headline.includes(MovementFamilyLabels.push_horizontal)
  );
  expect('아직 배운 게 아니라 지켜보는 중이다', presence.headline.includes('지켜보는 중'));
  expect('근거 줄에 실제 운동 이름이 나온다', presence.detail?.includes('벤치프레스') === true);
  expect(
    '한 번 본 것을 배웠다고 말하지 않는다',
    presence.detail !== null && !presence.detail.includes('배웠')
  );
}

// ── 3. HOME 현황 — 가장 최근에 본 계열을 말한다 ─────────────────────────────
{
  const profile = profileOf([
    record({ id: 'old', date: '2026-08-01', createdAt: '2026-08-01T10:00:00.000Z', exercises: [exercise('squat')] }),
    record({ id: 'new', date: '2026-08-20', createdAt: '2026-08-20T10:00:00.000Z', exercises: [exercise('bench-press')] }),
  ]);
  const presence = buildDanbaekPresence({ profile, exerciseDb: Exercises });
  expect('나중에 본 계열이 화면에 나온다', presence.movementFamily === 'push_horizontal');

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

// ── 4. HOME 현황 — 단계가 오르면 말이 달라진다 ──────────────────────────────
{
  const learnedProfile = profileOf(repeated('bench-press', 4));
  const presence = buildDanbaekPresence({ profile: learnedProfile, exerciseDb: Exercises });
  expect('네 번 봤으면 배웠다고 말한다', presence.learningStage === 'learned');
  expect('문구도 배움으로 바뀐다', presence.headline.includes('배웠'));
  expect('근거 줄도 배움으로 바뀐다', presence.detail?.includes('배웠') === true);
  expect('배운 계열 수를 셀 수 있다', learnedFamilyCount(learnedProfile) === 1);
  expect('배움 미만은 세지 않는다', learnedFamilyCount(profileOf(repeated('bench-press', 1))) === 0);
  expect('배움 이상만 배운 것으로 본다', hasLearnedStage('learned') && !hasLearnedStage('imitating'));
}

// ── 5. HOME 현황 — 앱이 모르는 운동은 아는 척하지 않는다 ────────────────────
{
  const presence = buildDanbaekPresence({
    profile: profileOf([record({ id: 'custom', exercises: [exercise('custom-exercise-xyz')] })]),
    exerciseDb: Exercises,
  });
  expect('매핑되지 않은 운동은 학습으로 보이지 않는다', presence.waiting === true);

  // 계약에는 있는 운동이지만 화면이 가진 DB에 없으면 이름을 지어내지 않는다.
  const noNames = buildDanbaekPresence({
    profile: profileOf([record({ id: 'r1', exercises: [exercise('bench-press')] })]),
    exerciseDb: [],
  });
  expect('이름을 모르면 근거 줄을 비운다', noNames.detail === null);
  expect('그래도 현황 한 줄은 남는다', noNames.headline.includes(MovementFamilyLabels.push_horizontal));
}

// ── 6. 세션 관찰 반응 — 아는 동작에서만 단백이가 나온다 ─────────────────────
{
  const known = danbaekSetObservationCopy('bench-press');
  expect('아는 운동이면 단백이가 따라 한다고 말한다', known !== null && known.includes('단백이'));
  expect('그 동작 이름이 들어간다', known?.includes(MovementFamilyLabels.push_horizontal) === true);
  expect('따라 한다는 말이 들어간다', known?.includes('따라 해본다') === true);
  expect(
    '세트 반응이 성장/SP 언어로 새지 않는다',
    known !== null && !/SP|레벨|XP|성장/.test(known)
  );
  expect('직접 추가한 운동은 null이다 (호출부가 기존 반응으로 떨어진다)', danbaekSetObservationCopy('custom-exercise-1') === null);
  expect('운동 id가 없으면 null이다', danbaekSetObservationCopy(undefined) === null);
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

// ── 11. 단백세상 입구 — 갈 곳이 없으면 입구를 내지 않는다 ───────────────────
{
  const profile = profileOf(repeated('bench-press', 4));

  expect('APP 브랜치의 seam은 닫혀 있다', DanbaekWorldEntry.available === false);
  expect('APP이 WORLD 경로를 지어내지 않는다', DanbaekWorldEntry.route === null);
  expect('닫힌 seam에서는 입구가 없다', resolveDanbaekWorldEntry({ profile }) === null);
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
  expect('보조 문구는 배운 계열 수에서 나온다', open?.subLabel.includes('1가지') === true);

  const nothingLearned = resolveDanbaekWorldEntry({
    profile: profileOf([]),
    seam: { available: true, route: './danbaek-world-placeholder' },
  });
  expect('배운 게 없으면 없다고 말한다', nothingLearned?.subLabel === '아직 배운 동작이 없어요');
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
