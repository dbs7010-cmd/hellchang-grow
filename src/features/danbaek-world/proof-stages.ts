import type { DanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

/** Each playable segment opens from one real, completed workout record. */
export const DanbaekWorldProofStages: DanbaekWorldStage[] = [
  { id: 'arrival' },
  {
    id: 'push-door',
    requirement: {
      movementFamily: 'push_horizontal',
      minimumLearningStage: 'observing',
      specificExerciseId: 'bench-press',
      reason: '벤치프레스 기록이 생기면 단백이가 미는 동작을 보고 이 문을 열 수 있어요.',
    },
  },
  {
    id: 'pull-cliff',
    requirement: {
      movementFamily: 'pull_vertical',
      minimumLearningStage: 'observing',
      specificExerciseId: 'lat-pulldown',
      reason: '랫풀다운 기록이 생기면 단백이가 위에서 당기는 동작을 보고 이 절벽을 오를 수 있어요.',
    },
  },
  {
    id: 'squat-stones',
    requirement: {
      movementFamily: 'squat',
      minimumLearningStage: 'observing',
      specificExerciseId: 'squat',
      reason: '스쿼트 기록이 생기면 단백이가 낮게 앉아 중심을 잡는 동작을 보고 돌길을 건널 수 있어요.',
    },
  },
  {
    id: 'hinge-ridge',
    requirement: {
      movementFamily: 'hinge',
      minimumLearningStage: 'observing',
      specificExerciseId: 'deadlift',
      reason: '데드리프트 기록이 생기면 단백이가 몸을 숙여 중심을 낮추고 다시 세우는 동작을 보고 강풍을 뚫고 갈 수 있어요.',
    },
  },
];

/**
 * 단백세상에 처음 들어온 사람에게 하는 인사.
 *
 * 처음 온 사람에게 "문이 안 열린다"부터 말하면, 여기가 어디인지도 모르는 채 실패 화면을
 * 보게 된다. 먼저 알아야 하는 것은 셋뿐이다: 여기가 어디인가 / 왜 못 지나가는가 /
 * 내가 무엇을 하면 되는가.
 *
 * 세계관 규칙 그대로다 — 단백세상 사람들은 운동을 모르고, 움직이는 것은 단백이이며,
 * 현실에서 운동하는 사람은 나다. 여기서 새로운 설정을 만들지 않는다.
 */
export const DanbaekWorldFirstContact = {
  locked: {
    title: '첫 번째 길은 아직 닫혀 있어요',
    lines: [
      '단백이가 사는 단백세상이에요. 내가 실제로 운동하면 단백이가 옆에서 보고 따라 해요.',
      '벤치프레스 기록이 생기면 단백이가 미는 동작을 보고 이 문을 열 수 있어요.',
    ],
  },
  alreadyUnlocked: {
    title: '첫 번째 길이 이미 열려 있어요',
    lines: [
      '단백이가 사는 단백세상이에요. 내가 실제로 운동하면 단백이가 옆에서 보고 따라 해요.',
      '벤치프레스 운동 기록 덕분에 단백이가 미는 동작을 보고 첫 번째 길을 열었어요.',
    ],
  },
  dismissLabel: '알겠어요',
} as const;

/** 이 길의 이름. 화면 제목이 아니라 지도 위의 이름이다. */
export const DanbaekWorldPathTitle = '첫 번째 길';

/**
 * 구간별 장면.
 *
 * 판정에는 쓰이지 않는다 — `stage-evaluator`는 id와 requirement만 본다. 여기 있는 건
 * 그 판정을 **사람이 보는 장면**으로 옮기기 위한 문장뿐이다. 상태표("● 막힌 문")가 아니라
 * 지금 눈앞에서 무슨 일이 벌어지는지가 한 줄로 읽혀야 한다.
 */
export interface DanbaekWorldStageScene {
  /** 지도 위 짧은 이름. */
  label: string;
  /** 막혀 있을 때 눈앞에서 벌어지는 일. */
  blockedLine: string;
  /** 지나간 뒤의 장면. */
  clearedLine: string;
  /** 화면이 그릴 장애물. 판정에는 관여하지 않는다. */
  obstacle: 'gate' | 'cliff' | 'stones' | 'wind';
  /** 같은 관문을 막힌 채 본 뒤 운동하고 돌아왔을 때만 쓰는 반응. */
  returnedLine: string;
  /** 열린 순간의 짧은 제목. */
  clearedTitle: string;
}

export const DanbaekWorldStageScenes: Record<string, DanbaekWorldStageScene> = {
  arrival: {
    label: '출발',
    blockedLine: '단백이가 길 앞에 섰어요.',
    clearedLine: '단백이가 길을 나섰어요.',
    obstacle: 'gate',
    returnedLine: '길을 나설 준비가 됐어!',
    clearedTitle: '길을 나섰어요!',
  },
  'push-door': {
    label: '막힌 문',
    blockedLine: '단백이가 온 힘으로 밀어 보지만, 문은 꿈쩍도 하지 않아요.',
    clearedLine: '단백이가 배운 대로 문을 밀어 열었어요.',
    obstacle: 'gate',
    returnedLine: '아까는 열리지 않았는데, 운동하고 돌아오니 열렸어!',
    clearedTitle: '문이 열렸어요!',
  },
  'pull-cliff': {
    label: '당기는 절벽',
    blockedLine: '단백이가 바위턱에 매달렸지만, 몸을 끌어올리지 못하고 제자리로 내려와요.',
    clearedLine: '단백이가 배운 대로 몸을 당겨 바위턱 위에 올라섰어요.',
    obstacle: 'cliff',
    returnedLine: '아까는 미끄러졌는데, 운동에서 본 대로 당기니 올라왔어!',
    clearedTitle: '절벽을 올랐어요!',
  },
  'squat-stones': {
    label: '굽이진 돌길',
    blockedLine: '단백이가 기울어진 돌에 올라서지만, 몸이 흔들려 다시 출발점으로 내려와요.',
    clearedLine: '단백이가 몸을 낮추고 중심을 잡아 흔들리는 돌길을 건넜어요.',
    obstacle: 'stones',
    returnedLine: '아까는 휘청였는데, 운동에서 본 대로 몸을 낮추니 중심이 잡혔어!',
    clearedTitle: '돌길을 건넜어요!',
  },
  'hinge-ridge': {
    label: '바람 부는 능선',
    blockedLine: '단백이가 능선에 발을 내딛지만, 정면에서 몰아치는 바람에 몸이 밀려 돌길로 돌아와요.',
    clearedLine: '단백이가 몸을 숙여 중심을 낮추고, 바람 사이로 한 걸음씩 능선을 건넜어요.',
    obstacle: 'wind',
    returnedLine: '아까는 밀려났는데, 운동에서 본 대로 몸을 숙여 버티니 앞으로 갈 수 있어!',
    clearedTitle: '강풍을 뚫었어요!',
  },
};

/**
 * 아직 갈 수 없는 다음 길.
 *
 * **스테이지가 아니다.** 여기에 requirement를 달면 문을 연 순간 바로 다시 막혀서 방금 얻은
 * 성취가 화면에서 사라진다. 그래서 판정에 들어가지 않는 "저 너머" 한 줄로만 둔다 —
 * 다음 콘텐츠가 실제로 생길 때 스테이지로 승격시키면 된다.
 */
export const DanbaekWorldNextPath = {
  label: '빛나는 동굴 입구',
  teaser: '능선 아래 바위틈에서 희미한 금빛이 새어 나와요.',
} as const;
