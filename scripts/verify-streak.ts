// Standalone verification for the pure streak transition logic (src/utils/streak.ts).
// Run: node --experimental-loader ./scripts/alias-loader.mjs scripts/verify-streak.ts
import { computeStreakUpdate } from '@/utils/streak';
import type { StreakState } from '@/types/streak';

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

const base: StreakState = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  rewardClaimed: false,
};

// 1. First ever record
{
  const result = computeStreakUpdate(base, '2026-03-10');
  check('first record starts streak at 1', result, {
    currentStreakDays: 1,
    longestStreakDays: 1,
    lastRecordDate: '2026-03-10',
    rewardClaimed: false,
  });
}

// 2. Same day, recorded again (should be a no-op, same reference)
{
  const afterFirst = computeStreakUpdate(base, '2026-03-10');
  const afterSecondSameDay = computeStreakUpdate(afterFirst, '2026-03-10');
  check('same-day repeat record does not double-increment', afterSecondSameDay, afterFirst);
  check('same-day repeat record returns identical reference (no write needed)',
    afterSecondSameDay === afterFirst, true);
}

// 3. Next day record continues the streak
{
  const day1 = computeStreakUpdate(base, '2026-03-10');
  const day2 = computeStreakUpdate(day1, '2026-03-11');
  check('consecutive next-day record increments streak', day2, {
    currentStreakDays: 2,
    longestStreakDays: 2,
    lastRecordDate: '2026-03-11',
    rewardClaimed: false,
  });
}

// 4. Skipped a day resets streak to 1, but keeps longestStreakDays
{
  const day1 = computeStreakUpdate(base, '2026-03-10');
  const day2 = computeStreakUpdate(day1, '2026-03-11');
  const day3 = computeStreakUpdate(day2, '2026-03-12');
  const skipped = computeStreakUpdate(day3, '2026-03-14'); // skipped 03-13
  check('skipping a day resets current streak to 1', skipped.currentStreakDays, 1);
  check('skipping a day preserves longestStreakDays', skipped.longestStreakDays, 3);
}

// 5. Month-end boundary (Jan 31 -> Feb 1 must count as consecutive)
{
  const jan31 = computeStreakUpdate(base, '2026-01-31');
  const feb1 = computeStreakUpdate(jan31, '2026-02-01');
  check('Jan 31 -> Feb 1 is consecutive', feb1.currentStreakDays, 2);
}

// 5b. Short-month boundary (Feb 28 -> Mar 1, non-leap year 2026)
{
  const feb28 = computeStreakUpdate(base, '2026-02-28');
  const mar1 = computeStreakUpdate(feb28, '2026-03-01');
  check('Feb 28 -> Mar 1 (non-leap year) is consecutive', mar1.currentStreakDays, 2);
}

// 6. Year-end boundary (Dec 31 -> Jan 1 must count as consecutive)
{
  const dec31 = computeStreakUpdate(base, '2026-12-31');
  const jan1 = computeStreakUpdate(dec31, '2027-01-01');
  check('Dec 31 -> Jan 1 (year rollover) is consecutive', jan1.currentStreakDays, 2);
}

// 7. Non-consecutive across a year boundary (gap) resets to 1
{
  const dec30 = computeStreakUpdate(base, '2026-12-30');
  const jan2 = computeStreakUpdate(dec30, '2027-01-02'); // skipped Dec 31 and Jan 1
  check('gap spanning year boundary resets streak to 1', jan2.currentStreakDays, 1);
}

console.log(failures === 0 ? '\nAll streak checks passed.' : `\n${failures} streak check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
