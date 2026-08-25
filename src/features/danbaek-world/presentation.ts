import type { MovementFamily, StageBlock } from '@/types/danbaek-contract';

export type DanbaekWorldBlockPresentation = {
  title: string;
  body: string;
  actionLabel: string;
  recommendedMovementFamily: MovementFamily;
  specificExerciseId: string | null;
  danbaekBehavior: 'blocked';
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
  const familyLabel = MovementFamilyLabels[block.recommendedMovementFamily];
  const specificExerciseId = block.requirement.specificExerciseId ?? null;
  if (specificExerciseId) {
    return {
      title: '단백이가 여기서 막혔어요',
      body: '이 장면은 단백이가 아직 충분히 배우지 못한 특정 운동 동작이 필요해요.',
      actionLabel: '스탠리에게 배우러 가기',
      recommendedMovementFamily: block.recommendedMovementFamily,
      specificExerciseId,
      danbaekBehavior: 'blocked',
    };
  }
  return {
    title: '단백이가 여기서 막혔어요',
    body: `단백이는 ${familyLabel}을 아직 충분히 배우지 못했어요.`,
    actionLabel: '스탠리에게 배우러 가기',
    recommendedMovementFamily: block.recommendedMovementFamily,
    specificExerciseId: null,
    danbaekBehavior: 'blocked',
  };
}
