import type { MuscleGroup, MuscleGroupDetail } from '@/types/exercise';

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

/**
 * 세부 부위 표시 이름. 저장/계산은 `MuscleGroupDetail`을 쓰고, 사람에게 보여줄 일이
 * 생기면(성장 리포트 등) 이 라벨만 쓴다 — 화면 코드에 부위 이름을 문자열로 박지 않는다.
 * 묶어서 보여주고 싶으면 `MuscleDetailToGroup` + 위의 `MuscleGroupLabels`를 쓴다.
 */
export const MuscleGroupDetailLabels: Record<MuscleGroupDetail, string> = {
  chest: '가슴',
  frontDelts: '전면 어깨',
  sideDelts: '측면 어깨',
  rearDelts: '후면 어깨',
  biceps: '이두',
  triceps: '삼두',
  lats: '광배',
  upperBack: '상부 등',
  abs: '복근',
  glutes: '둔근',
  quads: '대퇴사두',
  hamstrings: '햄스트링',
  calves: '종아리',
};

/**
 * 세트를 끝냈을 때 단백이가 보내는 한 줄 반응.
 *
 * 스탠리 PT 대사(`config/trainers.ts`)와 **다른 계통**이다 — 이건 트레이너의 코칭이 아니라
 * 방금 자극받은 단백이 본인의 반응이라, 부위별로 한 줄씩만 둔다. 대사 풀을 키우지 않는다.
 * 부위를 알 수 없는 운동(직접 추가 등)은 아래 기본 문구 하나로 떨어진다.
 */
export const MuscleGroupSetReactionLines: Record<MuscleGroup, string> = {
  chest: '가슴에 제대로 들어갔어요.',
  back: '등이 슬슬 깨어납니다.',
  legs: '하체가 버티기 시작합니다.',
  shoulders: '어깨가 단단해지는 중이에요.',
  arms: '팔에 불이 붙었어요.',
  core: '코어가 조여집니다.',
  fullBody: '온몸이 뜨거워졌어요.',
};

/** 부위를 특정할 수 없을 때 쓰는 단 하나의 범용 반응. */
export const DefaultSetReactionLine = '좋아요, 한 세트 더 쌓았습니다.';
