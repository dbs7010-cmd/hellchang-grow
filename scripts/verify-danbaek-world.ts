// 단백세상 첫 구간이 "상태 화면"이 아니라 **상황**으로 읽히는가, 그리고 그 상황이
// 실제 운동 기록에서만 바뀌는가. WORLD 판정 자체(stage-evaluator)는 block-flow가 보고,
// 여기서는 그 판정이 장면/지도/행동/복귀로 이어지는 seam만 본다.
// Run: npm run verify:world
import { readFileSync } from 'node:fs';

import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { DanbaekWorldVoiceLines } from '@/config/danbaek-voice-lines';
import {
  DanbaekWorldFirstContact,
  DanbaekWorldNextPath,
  DanbaekWorldProofStages,
  DanbaekWorldStageScenes,
} from '@/features/danbaek-world/proof-stages';
import {
  buildDanbaekWorldScene,
  describeFirstPathEntry,
} from '@/features/danbaek-world/world-view-model';
import {
  clearWorldReturn,
  getWorldReturn,
  markWorldWorkoutHandoff,
  observeWorldVisit,
  resetWorldVisitMemory,
} from '@/services/world/world-visit';
import type { DanbaekLearningProfile } from '@/types/danbaek-contract';
import type { WorkoutRecord } from '@/types/workout';
import { buildDanbaekLearningProfile } from '@/utils/danbaek-learning';

let failures = 0;
function expect(name: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) failures++;
}

const NOW = '2026-08-26T09:00:00.000Z';
const read = (path: string) => readFileSync(path, 'utf8');

const benchRecord: WorkoutRecord = {
  id: 'r-bench',
  date: '2026-08-26',
  category: 'strength',
  title: '가슴',
  completed: true,
  createdAt: NOW,
  exercises: [
    {
      id: 'e-bench',
      name: '벤치프레스',
      exerciseId: 'bench-press',
      sets: 3,
      reps: 10,
      weightKg: 40,
      setDetails: [0, 1, 2].map((index) => ({
        id: `bench-s${index}`,
        weightKg: 40,
        reps: 10,
        completed: true,
      })),
    },
  ],
};

const latPulldownRecord: WorkoutRecord = {
  id: 'r-lat-pulldown',
  date: '2026-08-27',
  category: 'strength',
  title: '등',
  completed: true,
  createdAt: '2026-08-27T09:00:00.000Z',
  exercises: [
    {
      id: 'e-lat-pulldown',
      name: '랫풀다운',
      exerciseId: 'lat-pulldown',
      sets: 3,
      reps: 10,
      weightKg: 30,
      setDetails: [0, 1, 2].map((index) => ({
        id: `lat-s${index}`,
        weightKg: 30,
        reps: 10,
        completed: true,
      })),
    },
  ],
};

const profileFrom = (records: WorkoutRecord[]): DanbaekLearningProfile =>
  buildDanbaekLearningProfile({ records, generatedAt: NOW });

const blocked = buildDanbaekWorldScene(profileFrom([]));
const secondBlocked = buildDanbaekWorldScene(profileFrom([benchRecord]));
const cleared = buildDanbaekWorldScene(profileFrom([benchRecord, latPulldownRecord]));

// ── HOME도 같은 World truth를 말한다 ────────────────────────────────────────
{
  const firstLockedEntry = describeFirstPathEntry(profileFrom([]));
  const secondBlockedEntry = describeFirstPathEntry(profileFrom([benchRecord]));
  const secondClearedEntry = describeFirstPathEntry(profileFrom([benchRecord, latPulldownRecord]));
  expect('HOME FIRST LOCKED: 벤치프레스라는 실제 다음 행동을 말한다',
    firstLockedEntry.includes('벤치프레스') && firstLockedEntry.includes('열려요'));
  expect('HOME SECOND BLOCKED: 첫 길이 열렸고 랫풀다운이 다음임을 말한다',
    secondBlockedEntry.includes('첫 번째 길이 열려 있어요') && secondBlockedEntry.includes('랫풀다운'));
  expect('HOME SECOND CLEARED: stale blocked 문구 없이 현재 끝과 다음 길을 말한다',
    secondClearedEntry.includes('당기는 절벽을 올랐어요') &&
      secondClearedEntry.includes(DanbaekWorldNextPath.label) &&
      !secondClearedEntry.includes('벤치프레스'));
}

// ── 막힌 순간이 상황으로 읽힌다 ────────────────────────────────────────────────
//
// 예전 화면은 "● 막힌 문"이라는 칸 하나였다. 그건 상태지 상황이 아니다 — 눈앞에서 무슨
// 일이 벌어지는지, 왜 안 되는지, 지금 뭘 하면 되는지가 각각 한 줄로 있어야 한다.
{
  expect('아무것도 안 배웠으면 막힌다', blocked.state === 'blocked');
  expect('막힌 문은 닫혀 있다', blocked.gate === 'closed');

  if (blocked.state === 'blocked') {
    expect(
      '눈앞의 장면은 그 구간이 직접 쓴 문장이다',
      blocked.sceneLine === DanbaekWorldStageScenes[blocked.stageId].blockedLine
    );
    expect('장면은 실패를 보여준다', blocked.sceneLine.includes('꿈쩍'));
    expect('왜 막혔는지는 스테이지 요구 문장 그대로다', blocked.whyLine === blocked.block.requirement.reason);
    expect('단백이가 먼저 반응한다', blocked.danbaekLine.length > 0);

    // CTA는 "운동 메뉴"가 아니라 이 상황을 푸는 행동이어야 한다.
    expect('행동은 지금 막은 동작에서 나온다', blocked.actionLabel.includes('밀기'));
    expect('행동은 보여주러 가는 일이다', blocked.actionLabel.includes('보여주러'));
    expect(
      '행동이 메뉴 이름이 아니다',
      !/운동 메뉴|운동 고르|목록|리스트/.test(blocked.actionLabel)
    );
  }
}

// ── 바뀌는 유일한 이유는 실제 운동 기록이다 ──────────────────────────────────
//
// WORLD가 따로 진행도를 들고 있으면 운동하지 않고도 열리는 길이 생긴다. 입력은 학습
// 프로필 하나뿐이고, 그 프로필은 완료된 운동 기록에서만 나온다.
{
  expect('실제 벤치프레스 기록이 생기면 첫 문을 지나 두 번째 상황에 도착한다',
    secondBlocked.state === 'blocked' && secondBlocked.stageId === 'pull-cliff');
  expect('첫 segment 뒤에도 두 번째 segment는 실제 당기기 기록 전까지 막혀 있다',
    secondBlocked.gate === 'closed' && secondBlocked.obstacle === 'cliff');
  expect('실제 랫풀다운 기록까지 생기면 두 번째 segment가 열린다', cleared.state === 'cleared');
  expect('두 segment를 마치면 길은 열려 있다', cleared.gate === 'open');
  expect('같은 함수가 기록 없이는 여전히 막는다', blocked.state === 'blocked');

  // 판정이 무엇에 의존하는지는 import 목록이 말해 준다. 저장소/보상/성장/세션 상태를
  // 하나라도 끌어오는 순간 "운동하지 않아도 열리는 길"이 만들어질 수 있다.
  const imports = [
    'src/features/danbaek-world/world-view-model.ts',
    'src/features/danbaek-world/adventure-runner.ts',
    'src/features/danbaek-world/proof-stages.ts',
  ].flatMap((path) => [...read(path).matchAll(/from '([^']+)'/g)].map((match) => match[1]));

  expect(
    'WORLD 판정은 저장소/보상/성장/세션을 끌어오지 않는다',
    imports.every((path) => !/^@\/(data|context|hooks)\//.test(path)) &&
      !imports.some((path) => /pass|growth|reward|session|storage/i.test(path))
  );
  expect(
    'WORLD 판정의 입력은 학습 계약 하나다',
    imports.includes('@/types/danbaek-contract')
  );
}

// ── 말이 실제 학습 단계를 앞서지 않는다 ──────────────────────────────────────
//
// 벤치프레스를 한 번 봤을 뿐인데 "이제 다 할 줄 알아"가 나오면 그 순간 앱이 거짓말이다.
{
  if (cleared.state === 'cleared') {
    const capability = profileFrom([benchRecord, latPulldownRecord]).capabilities.find(
      (candidate) => candidate.movementFamily === 'pull_vertical'
    );
    expect('한 번 본 동작의 단계는 실제로 낮다', capability?.learningStage === 'observing');
    expect(
      '상태 줄이 실제 단계를 그대로 말한다',
      capability !== undefined && cleared.statusLine.includes(LearningStageLabels[capability.learningStage])
    );
    expect(
      '단백이 한마디가 능숙함을 주장하지 않는다',
      !/마스터|다 할|능숙|익숙/.test(cleared.danbaekLine)
    );
  }
}

// ── 지도는 어디까지 왔는지만 말한다 ──────────────────────────────────────────
{
  const labels = (scene: typeof blocked) => scene.journey.map((node) => `${node.label}:${node.state}`);
  expect(
    '막혔을 때 지도는 지나온 곳/지금 곳/앞으로 갈 곳을 구분한다',
    labels(blocked).join(' > ') === '출발:done > 막힌 문:current > 당기는 절벽:ahead > 굽이진 돌길:ahead'
  );
  expect(
    '첫 문을 열면 당기는 절벽이 실제 현재 상황이 된다',
    labels(secondBlocked).join(' > ') === '출발:done > 막힌 문:done > 당기는 절벽:current > 굽이진 돌길:ahead'
  );
  expect(
    '열린 뒤 지도에 남는 현재 칸이 없다',
    cleared.journey.every((node) => node.state !== 'current')
  );
  expect(
    '다음 길은 언제나 아직 못 간 곳이다',
    blocked.journey[blocked.journey.length - 1].state === 'ahead' &&
      cleared.journey[cleared.journey.length - 1].state === 'ahead'
  );
  // 기대만 만들고 판정에는 쓰이지 않는다. 스테이지로 만들면 문을 연 순간 다시 막혀서
  // 방금 얻은 성취가 화면에서 사라진다.
  expect(
    '두 번째 playable 뒤의 다음 길만 아직 스테이지가 아니다',
    !DanbaekWorldProofStages.some((stage) => stage.id === 'next-path')
  );
  expect('당기는 길은 실제 두 번째 스테이지다',
    DanbaekWorldProofStages.some((stage) => stage.id === 'pull-cliff'));
  if (cleared.state === 'cleared') {
    expect('열린 뒤 다음 목표가 보인다', cleared.nextGoal.label === DanbaekWorldNextPath.label);
    expect('다음 목표는 개발 상태가 아니라 장면이다', !/준비 중|TODO|구현/.test(cleared.nextGoal.teaser));
  }
}

// ── "내가 하고 왔더니 열렸다"는 순간은 한 번만 나온다 ────────────────────────
//
// 매번 지금 상태만 그리면 다시 들어와도 그냥 열린 문일 뿐이라 변화 자체가 안 보인다.
// 반대로 매번 축하하면 그것도 거짓이다.
{
  resetWorldVisitMemory();
  const first = observeWorldVisit({ stageId: 'push-door', outcome: 'blocked' });
  expect('처음 들어왔을 때는 축하하지 않는다', first.justCleared === false);

  const afterWorkout = observeWorldVisit({
    stageId: 'pull-cliff',
    outcome: 'blocked',
    clearedStageIds: ['arrival', 'push-door'],
  });
  expect('막혀 있던 곳이 열리면 그 순간을 알린다', afterWorkout.justCleared === true);
  expect('다음 stage가 즉시 막혀도 방금 연 첫 문을 식별한다',
    afterWorkout.justClearedStageId === 'push-door');

  const again = observeWorldVisit({
    stageId: 'pull-cliff',
    outcome: 'blocked',
    clearedStageIds: ['arrival', 'push-door'],
  });
  expect('다시 들어와도 같은 축하를 반복하지 않는다', again.justCleared === false);

  resetWorldVisitMemory();
  observeWorldVisit({ stageId: 'pull-cliff', outcome: 'blocked' });
  expect(
    '여전히 막혀 있으면 축하하지 않는다',
    observeWorldVisit({ stageId: 'pull-cliff', outcome: 'blocked' }).justCleared === false
  );

  resetWorldVisitMemory();
  observeWorldVisit({ stageId: 'pull-cliff', outcome: 'blocked' });
  const secondReturn = observeWorldVisit({ stageId: 'pull-cliff', outcome: 'cleared' });
  expect('두 번째 상황도 같은 관문을 본 뒤 바뀐 순간만 축하한다', secondReturn.justCleared);
}

// ── 운동하러 나갔다가 돌아오는 길 ────────────────────────────────────────────
{
  resetWorldVisitMemory();
  expect('막힌 곳에서 나가지 않았으면 돌아갈 곳도 없다', getWorldReturn() === null);

  markWorldWorkoutHandoff({ stageId: 'push-door', movementFamily: 'push_horizontal' });
  expect('막힌 곳에서 운동하러 나가면 돌아갈 곳이 생긴다', getWorldReturn()?.stageId === 'push-door');

  clearWorldReturn();
  expect('돌아왔으면 그 표시는 사라진다', getWorldReturn() === null);

  const source = read('src/services/world/world-visit.ts');
  expect(
    '방문 기억은 저장되지 않는다 (사용자 데이터가 아니다)',
    !/AsyncStorage|StorageKeys|repository|data\//.test(source)
  );
}

// ── 화면 배선 ────────────────────────────────────────────────────────────────
{
  const world = read('src/app/danbaek-world.tsx');
  expect('주인공은 여전히 단백이다', world.includes('<PlayerCharacter'));
  expect('두 번째 상황은 문 복사가 아니라 절벽으로 보인다',
    world.includes('<WorldCliff') && read('src/components/world/world-cliff.tsx').includes('rope'));
  expect('단백이 말풍선은 공용 컴포넌트 하나를 쓴다', world.includes('<DanbaekVoiceBubble'));
  expect(
    '행동 버튼은 스크롤 밖 고정 자리에 있다 (작은 화면에서 잘리지 않게)',
    /footer=\{/.test(world) && world.includes('scene.actionLabel')
  );
  expect('화면이 판정을 다시 하지 않는다', !world.includes('evaluateDanbaekWorldStage'));
  // import 경로(proof-stages 등)는 사용자에게 보이지 않는다 — 화면에 그려지는 말만 본다.
  const worldCopy = world
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('import') && !line.includes("from '@/"))
    .join('\n');
  expect('개발자용 상태 문구가 없다', !/준비 중|TODO|proof|debug/i.test(worldCopy));

  const session = read('src/app/session.tsx');
  expect(
    '결과 화면에서 곧장 단백세상으로 돌아갈 수 있다',
    session.includes("'/danbaek-world'") && session.includes('단백세상으로 돌아가기')
  );
  expect(
    '돌아가기는 표시일 뿐 완료 파이프라인을 건드리지 않는다',
    session.includes('clearWorldReturn();') && !/markWorldWorkoutHandoff/.test(session)
  );
}

// ── 첫 접촉은 실제 gate와 사용자가 본 경험만 말한다 ───────────────────────
{
  resetWorldVisitMemory();
  const lockedFirstVisit = observeWorldVisit({ stageId: blocked.stageId, outcome: 'blocked' });
  const lockedIntro = DanbaekWorldFirstContact.locked.lines.join(' ');
  expect('FIXTURE A: 방문 전 + locked는 첫 접촉이다', lockedFirstVisit.firstVisit);
  expect('FIXTURE A: 닫힌 길과 실제 벤치프레스 조건을 말한다',
    DanbaekWorldFirstContact.locked.title.includes('닫혀') && lockedIntro.includes('벤치프레스'));

  resetWorldVisitMemory();
  const clearedFirstVisit = observeWorldVisit({ stageId: secondBlocked.stageId, outcome: 'blocked' });
  const unlockedIntro = DanbaekWorldFirstContact.alreadyUnlocked.lines.join(' ');
  expect('FIXTURE B: 운동 먼저 + 첫 방문도 첫 접촉이다', clearedFirstVisit.firstVisit);
  expect('FIXTURE B: 기록 덕분에 이미 열렸다고 말한다',
    DanbaekWorldFirstContact.alreadyUnlocked.title.includes('이미') && unlockedIntro.includes('운동 기록 덕분'));
  expect('FIXTURE B: 보지 않은 과거 locked 경험을 주장하지 않는다',
    !/아까|전에|막혀 있|꿈쩍/.test(`${DanbaekWorldFirstContact.alreadyUnlocked.title} ${unlockedIntro} ${secondBlocked.danbaekLine}`));

  resetWorldVisitMemory();
  observeWorldVisit({ stageId: blocked.stageId, outcome: 'blocked' });
  const firstCleared = buildDanbaekWorldScene(profileFrom([benchRecord]));
  const returned = observeWorldVisit({
    stageId: firstCleared.stageId,
    outcome: 'blocked',
    clearedStageIds: firstCleared.clearedStageIds,
  });
  expect('FIXTURE C: locked를 본 뒤 같은 gate가 열렸을 때만 변화 증거가 있다', returned.justCleared);
  expect('FIXTURE C: 복귀 반응은 운동 전후를 표현한다',
    DanbaekWorldStageScenes[returned.justClearedStageId!].returnedLine ===
      DanbaekWorldVoiceLines.returnedAfterWorkout);

  resetWorldVisitMemory();
  observeWorldVisit({ stageId: secondBlocked.stageId, outcome: 'blocked' });
  const secondClearedReturn = observeWorldVisit({ stageId: cleared.stageId, outcome: 'cleared' });
  expect('SECOND FIXTURE: 당기는 절벽을 본 뒤 같은 절벽이 바뀌면 변화 증거가 있다',
    secondClearedReturn.justCleared);
  expect('SECOND FIXTURE: 복귀 반응은 실제로 본 미끄러짐과 당기기만 말한다',
    /아까는 미끄러졌/.test(cleared.returnedLine) && /운동에서 본 대로 당기니/.test(cleared.returnedLine));

  expect(
    '인사가 닫을 수 있는 것이라고 말한다',
    DanbaekWorldFirstContact.dismissLabel.length > 0
  );

  const world = read('src/app/danbaek-world.tsx');
  expect('화면이 첫 인사를 그린다', world.includes('DanbaekWorldFirstContact'));
  expect('첫 인사는 World 전체가 아니라 실제 첫 문 clear 여부를 본다',
    world.includes("scene.clearedStageIds.includes('push-door')"));
  expect('첫 인사는 닫을 수 있다', world.includes('setShowFirstContact(false)'));
  expect(
    '첫 인사가 실제 운동 경로를 막지 않는다 (CTA는 그대로 고정 자리에 있다)',
    /footer={/.test(world) && world.includes('scene.actionLabel')
  );
}

if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
console.log('ALL PASS');
