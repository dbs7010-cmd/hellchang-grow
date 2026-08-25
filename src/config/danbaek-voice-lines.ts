import type { LearningStage, MovementFamily } from '@/types/danbaek-contract';

export const DanbaekVoiceLines: Record<LearningStage, string> = {
  unseen: '그건 아직 못 봤어요.',
  observed: '또 그거 해요? 나도 해볼래!',
  copying: '이제 나도 조금 할 수 있어요!',
  learned: '이건 나도 알아요!',
  mastered: '이건 내가 보여줄게요!',
};

export const DanbaekMovementShortLabels: Record<MovementFamily, string> = {
  horizontal_push: '밀기',
  vertical_push: '위로 밀기',
  horizontal_pull: '당기기',
  vertical_pull: '매달려 당기기',
  squat: '앉았다 일어서기',
  hinge: '숙였다 일어서기',
  carry: '들고 버티기',
  locomotion: '움직이기',
};
