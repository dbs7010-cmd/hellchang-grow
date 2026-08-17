import { MuscleGroup } from '@/types/exercise';

/** 메인 부위 선택에 노출하는 순서 (전신은 즉흥형 진입에서 "전신"으로 노출) */
export const MuscleGroups: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'fullBody',
];

export const MuscleGroupLabels: Record<MuscleGroup, string> = {
  chest: '가슴',
  back: '등',
  legs: '하체',
  shoulders: '어깨',
  arms: '팔',
  fullBody: '전신',
  core: '코어',
};
