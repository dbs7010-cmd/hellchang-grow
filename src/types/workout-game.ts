import type { MuscleGroup } from '@/types/exercise';

/**
 * 운동 세션 안에서 보이는 게임 표현 계약.
 * Stage/별도 전투 세션이 아니라 실제 운동 자체가 전투 입력이다.
 */
export type WorkoutMonster = Readonly<{
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  /** 화면/에셋이 붙기 전에도 안정적으로 참조할 수 있는 표현 키. */
  visualKey: string;
}>;

export type WorkoutAttackEvent = Readonly<{
  exerciseId: string;
  monster: WorkoutMonster;
  /** 유효 세트 하나가 공격 하나다. 실제 성장/SP 계산과는 독립된 표현값. */
  hitCount: 1;
  copy: string;
}>;
