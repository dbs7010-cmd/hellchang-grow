import { MuscleGroup } from '@/types/exercise';

/**
 * 부위 필터/부위별 시작에 노출하는 순서.
 *
 * CANON 5의 권장 순서(하체 → 둔근 → 등 → 가슴 → 어깨 → 팔 → 코어 → 전신)를 따르되,
 * 실제 Exercise DB에 운동이 존재하는 부위만 넣는다.
 *  - 'core'는 DB에 운동이 3개 있는데도 이 배열에 빠져 있어서, 코어 운동이 필터/부위별
 *    시작 어디에서도 도달할 수 없었다 (실제 버그).
 *  - '둔근'은 아직 전용 운동 데이터가 없어 넣지 않는다 — 빈 필터를 만들지 않는다.
 *    (types/exercise.ts의 MuscleGroup에 추가하고 DB에 운동을 넣는 순간 여기에만 추가하면 된다.)
 */
export const MuscleGroups: MuscleGroup[] = [
  'legs',
  'back',
  'chest',
  'shoulders',
  'arms',
  'core',
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
