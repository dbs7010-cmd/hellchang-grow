import type { DanbaekWorldStage } from '@/features/danbaek-world/stage-evaluator';

/** First playable only: one real workout must be enough to cause an immediate World change. */
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
}

export const DanbaekWorldStageScenes: Record<string, DanbaekWorldStageScene> = {
  arrival: {
    label: '출발',
    blockedLine: '단백이가 길 앞에 섰어요.',
    clearedLine: '단백이가 길을 나섰어요.',
  },
  'push-door': {
    label: '막힌 문',
    blockedLine: '단백이가 온 힘으로 밀어 보지만, 문은 꿈쩍도 하지 않아요.',
    clearedLine: '단백이가 배운 대로 문을 밀어 열었어요.',
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
  label: '당기는 길',
  teaser: '저 너머에 매달려 올라가야 하는 절벽이 보여요.',
} as const;
