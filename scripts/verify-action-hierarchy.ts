// 행동 위계 검증 — **칠해진 것이 누를 것이다**.
//
// 예전에는 "중요함"을 같은 배경(backgroundElement) 위의 금색 글자/테두리로만 표현했다.
// 그래서 운동 화면에서 [✓ 세트 완료]와 [운동 종료]가 같은 회색 사각형이었고, 오늘의 운동에서는
// 세 갈래 시작 경로가 전부 같은 줄로 보였다. HOME만 homeGold로 채워진 CTA를 갖고 있어서
// 홈에서 운동으로 넘어가는 순간 다른 앱처럼 읽혔다.
//
// 규칙은 하나다: 한 화면의 주 행동(과 실제로 달성한 것)만 금색으로 **채운다**.
// Run: npm run verify:action-hierarchy
import { readFileSync } from 'node:fs';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const button = readFileSync('src/components/ui/primary-button.tsx', 'utf8');
const tile = readFileSync('src/components/ui/metric-tile.tsx', 'utf8');
const start = readFileSync('src/app/workout-start.tsx', 'utf8');
const session = readFileSync('src/app/session.tsx', 'utf8');

// ── 주 행동은 칠해진다 ──────────────────────────────────────────────────────
{
  expect(
    'gold CTA는 금색으로 채워진다',
    button.includes('isGold && { backgroundColor: theme.gold')
  );
  expect(
    'gold CTA는 카드와 같은 배경을 쓰지 않는다',
    !/isGold\s*\?\s*'backgroundElement'/.test(button)
  );
  expect(
    '채워진 CTA의 글자는 배경색으로 뒤집힌다 (금색 위 금색 글자 금지)',
    button.includes('isGold\n                ? { color: theme.background }') ||
      button.includes('? { color: theme.background }')
  );
  expect('quiet 변형이 존재한다', button.includes("'quiet'"));
  expect(
    '보조/후퇴 행동은 채우지 않고 물러난다',
    button.includes('(isSecondary || isQuiet) && { borderWidth: 1')
  );
}

// ── 운동 화면에서 주 행동과 종료가 같은 무게가 아니다 ──────────────────────
{
  expect('세트 완료는 주 행동이다', /label="✓ 세트 완료"[\s\S]{0,80}variant="gold"/.test(session));
  expect('다음 세트 시작도 주 행동이다', /label="다음 세트 시작"[\s\S]{0,80}variant="gold"/.test(session));

  // 운동 종료는 세트 완료 옆에서 잘못 눌리면 세션이 끝난다 — 가장 물러나야 한다.
  const endButtons = [...session.matchAll(/label="운동 종료"[\s\S]{0,120}?variant="(\w+)"/g)].map(
    (m) => m[1]
  );
  expect('운동 종료 버튼을 찾았다', endButtons.length >= 2);
  expect(
    '운동 종료는 어디서도 주 행동으로 칠해지지 않는다',
    endButtons.every((variant) => variant !== 'gold')
  );
  expect(
    '운동 종료는 물러난 변형을 쓴다',
    endButtons.every((variant) => variant === 'quiet')
  );
  expect(
    '기록 자세히 보기는 [확인]보다 물러난다',
    /label="기록 자세히 보기"[\s\S]{0,80}variant="quiet"/.test(session)
  );
}

// ── 실제로 달성한 것만 칠한다 ──────────────────────────────────────────────
{
  expect(
    'PR 타일은 채워진 성취로 보인다',
    tile.includes('accent ? { backgroundColor: theme.gold }')
  );
  expect(
    'PR 타일도 금색 위 금색 숫자를 쓰지 않는다',
    tile.includes('accent ? { color: theme.background }')
  );
}

// ── 오늘의 운동에서 첫 경로가 나머지와 같은 줄이 아니다 ────────────────────
{
  expect(
    '주 시작 경로는 채워진다',
    start.includes('{ backgroundColor: theme.gold, borderColor: theme.gold')
  );
  expect('주 시작 경로는 실제로 더 크다', start.includes('quickRowAccent'));
  expect(
    '주 시작 경로의 글자도 배경색으로 뒤집힌다',
    start.includes("accent ? { color: theme.background }")
  );
}

// ── HOME은 이 train에서 다시 디자인하지 않는다 ─────────────────────────────
{
  const home = readFileSync('src/app/(tabs)/index.tsx', 'utf8');
  expect('HOME의 주 CTA는 여전히 homeGold다', home.includes("variant=\"homeGold\""));
  expect('HOME은 공용 gold 변형으로 갈아타지 않았다', !home.includes('variant="gold"'));
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
