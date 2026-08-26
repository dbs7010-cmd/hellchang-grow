import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';

export type DanbaekWorldBlockPresentation = {
  title: string;
  body: string;
  actionLabel: string;
  recommendedMovementFamily: MovementFamily;
  specificExerciseId: string | null;
};

const MovementFamilyLabels: Record<MovementFamily, string> = {
  push_horizontal: '앞으로 미는 운동',
  pull_vertical: '위에서 당기는 운동',
  pull_horizontal: '앞에서 당기는 운동',
  squat: '앉았다 일어나는 하체 운동',
  hinge: '엉덩이를 접어 힘을 쓰는 운동',
  push_vertical: '머리 위로 미는 운동',
  carry: '들고 이동하는 운동',
  locomotion: '걷고 달리는 움직임',
};

export function presentDanbaekWorldBlock(block: StageBlock): DanbaekWorldBlockPresentation {
  const specificExerciseId = block.requirement.specificExerciseId ?? null;
  if (specificExerciseId) {
    return {
      title: '단백이가 여기서 막혔어요',
      body: '이 문을 열려면 단백이가 아직 모르는 운동 동작을 실제로 봐야 해요.',
      actionLabel: '이 동작을 가르치러 가기',
      recommendedMovementFamily: block.recommendedMovementFamily,
      specificExerciseId,
    };
  }

  return {
    title: '단백이가 여기서 막혔어요',
    body: `단백이는 ${MovementFamilyLabels[block.recommendedMovementFamily]}을 아직 배우지 못했어요.`,
    actionLabel: '이 동작을 가르치러 가기',
    recommendedMovementFamily: block.recommendedMovementFamily,
    specificExerciseId: null,
  };
}
