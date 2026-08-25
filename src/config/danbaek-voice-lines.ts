import type { LearningStage, MovementFamily } from '@/types/danbaek-contract';

/** Short movement names for compact Danbaek status lines. */
export const MovementFamilyShortLabels: Record<MovementFamily, string> = {
  push_horizontal: '밀기',
  pull_vertical: '매달려 당기기',
  pull_horizontal: '당기기',
  squat: '앉았다 일어서기',
  hinge: '숙였다 세우기',
  push_vertical: '머리 위로 밀기',
  carry: '들고 버티기',
  locomotion: '이동하기',
};

/** Deterministic first-person voice. Never speaks ahead of the actual learning stage. */
export const DanbaekStageVoiceLines: Record<LearningStage, string> = {
  unseen: '오늘은 뭐 해요? 나도 볼래.',
  observing: '또 그거 해요? 나도 해볼래!',
  imitating: '이제 조금 알 것 같아!',
  learned: '이거 이제 나도 해!',
  familiar: '이건 꽤 익숙해졌어.',
  proficient: '이건 눈 감고도 하겠는데?',
};

export const DanbaekSetVoiceLine = '나도 해볼래!';
export const DanbaekGainVoiceLines = {
  stageUp: '한 걸음 늘었어!',
  moreEvidence: '한 번 더 봤어. 다음엔 될 것 같아.',
} as const;
export const DanbaekBlockVoiceLines = {
  needsPractice: '이 앞은 아직 못 지나가겠어. 이거 배우면 돼?',
  noRoute: '이 앞은 아직 어려워. 다음에 다시 와볼래.',
} as const;
