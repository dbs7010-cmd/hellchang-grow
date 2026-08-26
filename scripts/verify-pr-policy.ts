// PR 정책 검증 — **어떤 PR이 XP를 만들고, 어떤 PR이 기록에만 남는가.**
// detectPRs의 판정 자체(taxonomy)는 여기서 검증하지 않는다(verify:weight-core 88이 담당).
// 여기서 지키는 것은 보상 정책 / 표시 / 중복 축하 방지 / 옛 receipt 호환 네 가지다.
// Run: npm run verify:pr-policy
import { readFileSync } from 'node:fs';

import { AppConfig } from '@/config/app-config';
import type { SessionCompletionReceipt } from '@/types/session-completion';
import {
  describePrAchievement,
  describePrPrevious,
  type PrEvent,
} from '@/utils/exercise-history';
import {
  computeSessionXpAward,
  countRewardEligiblePrs,
  isRewardEligiblePr,
} from '@/utils/pass';
import { normalizeStoredCompletionReceipt } from '@/utils/session-completion-compat';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const weightPr: PrEvent = {
  exerciseId: 'bench-press',
  exerciseName: '벤치프레스',
  kind: 'weight',
  weightKg: 80,
  previousBestWeightKg: 75,
};

const weightedRepPr: PrEvent = {
  exerciseId: 'bench-press',
  exerciseName: '벤치프레스',
  kind: 'reps',
  weightKg: 70,
  reps: 12,
  previousBestReps: 10,
};

const bodyweightRepPr: PrEvent = {
  exerciseId: 'pull-up',
  exerciseName: '풀업',
  kind: 'reps',
  weightKg: 0,
  reps: 10,
  previousBestReps: 8,
};

const firstWeightPr: PrEvent = {
  exerciseId: 'squat',
  exerciseName: '스쿼트',
  kind: 'weight',
  weightKg: 60,
};

// ── A. weight PR → PR XP를 만든다 ──────────────────────────────────────────
{
  const award = computeSessionXpAward({ prs: [weightPr], routineCompleted: false });
  expect('A. 최고 중량 PR 하나는 XP 대상 1개다', award.rewardEligiblePrCount === 1);
  expect(
    `A. 세션 XP + PR XP(${AppConfig.passXpPerPr})가 그대로 더해진다`,
    award.xpAwarded === AppConfig.passXpPerSession + AppConfig.passXpPerPr
  );
  expect('A. 중량 PR은 보상 대상이다', isRewardEligiblePr(weightPr));
}

// ── B. weighted rep PR → PR XP 없음 ────────────────────────────────────────
{
  const award = computeSessionXpAward({ prs: [weightedRepPr], routineCompleted: false });
  expect('B. 중량 있는 횟수 PR은 XP 대상이 아니다', award.rewardEligiblePrCount === 0);
  expect('B. 그래서 세션 XP만 남는다', award.xpAwarded === AppConfig.passXpPerSession);
  expect('B. 정책 함수도 같은 답을 준다', !isRewardEligiblePr(weightedRepPr));
}

// ── C. bodyweight rep PR → PR XP 없음 ──────────────────────────────────────
{
  const award = computeSessionXpAward({ prs: [bodyweightRepPr], routineCompleted: false });
  expect('C. 맨몸 횟수 PR도 XP 대상이 아니다', award.rewardEligiblePrCount === 0);
  expect('C. 세션 XP만 남는다', award.xpAwarded === AppConfig.passXpPerSession);
}

// ── D. rep PR은 기록/근거에서 사라지지 않는다 ──────────────────────────────
{
  const prs = [weightPr, weightedRepPr, bodyweightRepPr];
  const award = computeSessionXpAward({ prs, routineCompleted: false });
  expect('D. 보상 계산이 PR 목록을 줄이지 않는다', prs.length === 3);
  expect('D. 그중 XP 대상은 하나뿐이다', award.rewardEligiblePrCount === 1);
  expect('D. 횟수 PR 두 개가 목록에 그대로 있다', prs.filter((pr) => pr.kind === 'reps').length === 2);
}

// ── E. 같은 세션에 중량 PR + 횟수 PR → 중량 PR만 보상 ──────────────────────
{
  const award = computeSessionXpAward({ prs: [weightPr, weightedRepPr], routineCompleted: false });
  expect('E. 두 PR 중 하나만 XP를 만든다', award.rewardEligiblePrCount === 1);
  expect(
    'E. XP는 중량 PR 한 개 기준이다',
    award.xpAwarded === AppConfig.passXpPerSession + AppConfig.passXpPerPr
  );

  const withRoutine = computeSessionXpAward({ prs: [weightPr, weightedRepPr], routineCompleted: true });
  expect(
    'E. 루틴 완료 보너스는 기존 값 그대로 더해진다',
    withRoutine.xpAwarded ===
      AppConfig.passXpPerSession + AppConfig.passXpPerPr + AppConfig.passXpPerRoutineCompletion
  );
  expect('E. 세션 XP 기본값은 그대로다', AppConfig.passXpPerSession === 10);
  expect('E. PR XP 값도 그대로다', AppConfig.passXpPerPr === 15);
  expect('E. 루틴 완료 XP 값도 그대로다', AppConfig.passXpPerRoutineCompletion === 20);

  expect('E. 아무 PR도 없으면 세션 XP만', computeSessionXpAward({ prs: [], routineCompleted: false }).xpAwarded === AppConfig.passXpPerSession);
  expect('E. 여러 중량 PR은 개수만큼 센다', countRewardEligiblePrs([weightPr, firstWeightPr]) === 2);
}

// ── F. 재시도는 저장된 XP를 다시 쓴다 (재계산/중복 지급 없음) ──────────────
{
  const source = readFileSync('src/context/app-data-context.tsx', 'utf8');
  expect(
    'F. 보상 저장은 snapshot.passXpAfter를 그대로 쓴다',
    source.includes('savePassState({ xp: snapshot.passXpAfter })')
  );
  expect(
    'F. 화면에 넘기는 XP도 스냅샷 값이다',
    source.includes('xpAwarded: snapshot.xpAwarded')
  );
  expect(
    'F. 완료 파이프라인이 prs.length로 XP를 만들지 않는다',
    !source.includes('prs.length * AppConfig.passXpPerPr')
  );
  expect(
    'F. XP는 정책 함수 한 곳에서만 계산된다',
    source.includes('computeSessionXpAward({ prs, routineCompleted })')
  );

  const coreLoop = readFileSync('src/utils/core-loop.ts', 'utf8');
  expect(
    'F. 이미 저장된 receipt가 있으면 그것을 이어서 쓴다',
    coreLoop.includes('stored?.sessionId === initial.sessionId ? stored : initial')
  );
}

// ── G. 옛 receipt(kind 없음) → weight PR로 복원 ────────────────────────────
{
  const legacy = {
    version: 1,
    sessionId: 'session-legacy',
    completedAt: '2026-08-20T10:00:00.000Z',
    growthApplied: true,
    workoutRecordSaved: true,
    rewardsSaved: false,
    snapshot: {
      prs: [{ exerciseId: 'bench-press', exerciseName: '벤치프레스', weightKg: 80, previousBestWeightKg: 75 }],
      xpAwarded: 25,
      passXpAfter: 125,
      passLevel: 2,
      routineCompleted: false,
    },
  } as unknown as SessionCompletionReceipt;

  const normalized = normalizeStoredCompletionReceipt(legacy)!;
  expect('G. 옛 receipt를 읽는 데 성공한다', normalized !== null);
  expect('G. 버전을 올리지 않는다', normalized.version === 1);
  expect('G. sessionId가 그대로다 (멱등성 키 보존)', normalized.sessionId === 'session-legacy');
  expect('G. 진행 단계 플래그가 그대로다', normalized.growthApplied === true && normalized.rewardsSaved === false);
  expect('G. kind 없는 PR은 중량 PR로 해석된다', normalized.snapshot.prs[0].kind === 'weight');
  expect('G. PR 개수가 줄지 않는다', normalized.snapshot.prs.length === 1);
  expect('G. 저장된 XP를 다시 계산하지 않는다', normalized.snapshot.xpAwarded === 25 && normalized.snapshot.passXpAfter === 125);
  expect(
    'G. 복원된 PR은 그대로 보상 정책에 걸린다 (중량 PR = XP 대상)',
    countRewardEligiblePrs(normalized.snapshot.prs) === 1
  );

  const modern = normalizeStoredCompletionReceipt({
    ...legacy,
    snapshot: {
      ...legacy.snapshot,
      prs: [{ exerciseId: 'pull-up', exerciseName: '풀업', kind: 'reps', weightKg: 0, reps: 10 }],
    },
  } as unknown as SessionCompletionReceipt)!;
  expect('G. 이미 kind가 있으면 건드리지 않는다', modern.snapshot.prs[0].kind === 'reps');
  expect('G. receipt가 없으면 null 그대로다', normalizeStoredCompletionReceipt(null) === null);

  const repository = readFileSync('src/data/session-completion-repository.ts', 'utf8');
  expect(
    'G. 읽기 경계가 실제로 정규화를 거친다 (믿을 수 있는 receipt에 적용)',
    repository.includes('normalizeStoredCompletionReceipt(stored.receipt)')
  );
  expect(
    'G. 정규화가 저장소 방어 판정(classify) 뒤에 온다 — 순서가 뒤바뀌면 깨진 값을 정규화하게 된다',
    repository.indexOf('classifyStoredReceiptRaw') < repository.indexOf('normalizeStoredCompletionReceipt(stored.receipt)')
  );
}

// ── H. 맨몸 횟수 PR 표시에 0kg이 나오지 않는다 ─────────────────────────────
{
  const achievement = describePrAchievement(bodyweightRepPr);
  expect('H. 맨몸 PR은 맨몸으로 말한다', achievement === '맨몸 10회');
  expect('H. 0kg이라는 표시가 없다', !achievement.includes('0kg'));
  const previous = describePrPrevious(bodyweightRepPr);
  expect('H. 이전 기록도 맨몸으로 말한다', previous === '맨몸 8회');
  expect('H. 이전 기록에도 0kg이 없다', previous !== null && !previous.includes('0kg'));
}

// ── I. 중량 있는 횟수 PR은 횟수 성취로 표시된다 ────────────────────────────
{
  const achievement = describePrAchievement(weightedRepPr);
  expect('I. 중량과 횟수를 함께 말한다', achievement === '70kg × 12회');
  expect('I. 중량 PR처럼 무게만 말하지 않는다', achievement !== '70kg');
  expect('I. 이전 기록도 같은 중량의 횟수로 말한다', describePrPrevious(weightedRepPr) === '70kg × 10회');
  expect(
    'I. previousBestWeightKg가 없다고 첫 기록으로 오판하지 않는다',
    weightedRepPr.previousBestWeightKg === undefined && describePrPrevious(weightedRepPr) !== null
  );

  expect('I. 중량 PR 표시는 예전 그대로다', describePrAchievement(weightPr) === '80kg');
  expect('I. 중량 PR의 이전 기록도 그대로다', describePrPrevious(weightPr) === '75kg');
  expect('I. 진짜 첫 기록만 이전 값이 없다', describePrPrevious(firstWeightPr) === null);
}

// ── J. 같은 중량의 후속 rep PR이 축하에서 접히지 않는다 ────────────────────
{
  const session = readFileSync('src/app/session.tsx', 'utf8');
  const keyLine = session.match(/return `\$\{pr\.exerciseId\}[^`]*`;/)?.[0] ?? '';
  expect('J. 축하 식별자가 종류를 포함한다', keyLine.includes('pr.kind'));
  expect('J. 축하 식별자가 달성 횟수를 포함한다', keyLine.includes('pr.reps'));
  expect('J. 중량도 계속 포함한다', keyLine.includes('pr.weightKg'));

  // 같은 운동/같은 중량에서 세 가지 성취가 서로를 지우지 않아야 한다.
  const key = (pr: PrEvent) => `${pr.exerciseId}-${pr.kind}-${pr.weightKg}-${pr.reps ?? ''}`;
  const sameWeightWeightPr: PrEvent = { exerciseId: 'bench-press', exerciseName: '벤치프레스', kind: 'weight', weightKg: 70 };
  const firstRepPr: PrEvent = { ...weightedRepPr, reps: 11 };
  const laterRepPr: PrEvent = { ...weightedRepPr, reps: 12 };
  const keys = new Set([key(sameWeightWeightPr), key(firstRepPr), key(laterRepPr)]);
  expect('J. 중량 PR과 횟수 PR이 한 개로 접히지 않는다', keys.size === 3);
  expect('J. 같은 중량의 다음 횟수 PR도 새 성취다', key(firstRepPr) !== key(laterRepPr));
  expect('J. 같은 성취를 두 번 보면 같은 식별자다', key(laterRepPr) === key({ ...laterRepPr }));

  expect('J. 결과 화면도 같은 식별자를 쓴다', session.includes('key={prKey(pr)}'));
  expect(
    'J. 표시에 새 formatter를 중복 구현하지 않았다',
    session.includes('describePrAchievement(pr)') && session.includes('describePrPrevious(pr)')
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
