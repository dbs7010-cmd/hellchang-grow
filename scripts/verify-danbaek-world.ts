// 단백세상 첫 구간이 "상태 화면"이 아니라 **상황**으로 읽히는가, 그리고 그 상황이
// 실제 운동 기록에서만 바뀌는가. WORLD 판정 자체(stage-evaluator)는 block-flow가 보고,
// 여기서는 그 판정이 장면/지도/행동/복귀로 이어지는 seam만 본다.
// Run: npm run verify:world
import { readFileSync } from 'node:fs';

import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import {
  DanbaekWorldFirstContact,
  DanbaekWorldNextPath,
  DanbaekWorldProofStages,
  DanbaekWorldStageScenes,
} from '@/features/danbaek-world/proof-stages';
import { buildDanbaekWorldScene } from '@/features/danbaek-world/world-view-model';
import {
  clearWorldReturn,
  takeDanbaekWorldFirstContact,
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

const profileFrom = (records: WorkoutRecord[]): DanbaekLearningProfile =>
  buildDanbaekLearningProfile({ records, generatedAt: NOW });

const blocked = buildDanbaekWorldScene(profileFrom([]));
const cleared = buildDanbaekWorldScene(profileFrom([benchRecord]));

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
  expect('실제 벤치프레스 기록이 생기면 열린다', cleared.state === 'cleared');
  expect('열린 문은 열려 있다', cleared.gate === 'open');
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
    const capability = profileFrom([benchRecord]).capabilities.find(
      (candidate) => candidate.movementFamily === 'push_horizontal'
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
    labels(blocked).join(' > ') === '출발:done > 막힌 문:current > 당기는 길:ahead'
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
    '다음 길은 스테이지가 아니다',
    !DanbaekWorldProofStages.some((stage) => stage.id === 'next-path')
  );
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

  const afterWorkout = observeWorldVisit({ stageId: 'push-door', outcome: 'cleared' });
  expect('막혀 있던 곳이 열리면 그 순간을 알린다', afterWorkout.justCleared === true);

  const again = observeWorldVisit({ stageId: 'push-door', outcome: 'cleared' });
  expect('다시 들어와도 같은 축하를 반복하지 않는다', again.justCleared === false);

  resetWorldVisitMemory();
  observeWorldVisit({ stageId: 'push-door', outcome: 'blocked' });
  expect(
    '여전히 막혀 있으면 축하하지 않는다',
    observeWorldVisit({ stageId: 'push-door', outcome: 'blocked' }).justCleared === false
  );
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

// ── 처음 온 사람에게 먼저 여기가 어디인지 알려준다 ─────────────────────────
//
// 처음 들어온 사람에게 "문이 꿈쩍도 안 한다"부터 보여주면, 여기가 어디인지도 모르는 채
// 실패 화면을 본다. 인사는 한 번이면 충분하고, 진행도가 아니라 연출 타이밍일 뿐이다.
{
  resetWorldVisitMemory();
  expect('처음 들어오면 인사한다', takeDanbaekWorldFirstContact() === true);
  expect('같은 세션에서 다시 들어오면 인사하지 않는다', takeDanbaekWorldFirstContact() === false);
  expect('세 번째도 마찬가지다', takeDanbaekWorldFirstContact() === false);

  // 세계관 규칙을 새로 만들지 않는다 — 움직이는 건 단백이, 운동하는 건 나.
  const intro = DanbaekWorldFirstContact.lines.join(' ');
  expect('인사가 이곳이 어디인지 말한다', DanbaekWorldFirstContact.title.includes('단백세상'));
  expect('인사가 내가 무엇을 하는지 말한다', intro.includes('운동'));
  expect('움직이는 것은 단백이다', intro.includes('단백이'));
  expect(
    '인사가 닫을 수 있는 것이라고 말한다',
    DanbaekWorldFirstContact.dismissLabel.length > 0
  );

  const world = read('src/app/danbaek-world.tsx');
  expect('화면이 첫 인사를 그린다', world.includes('DanbaekWorldFirstContact'));
  expect('첫 인사는 닫을 수 있다', world.includes('setFirstContact(false)'));
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
