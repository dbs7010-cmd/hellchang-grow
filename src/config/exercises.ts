import type { ExerciseDefinition } from '@/types/exercise';

/**
 * V1 Exercise DB. 수백~수천 개를 무리하게 넣지 않고, 실제 헬스장에서 자주 쓰는 부위별 대표 운동만
 * 담는다 (제품 기획 7장). DB에 없는 운동은 [직접 운동 추가]로 보조한다.
 *
 * UI 컴포넌트 내부에 운동 목록을 하드코딩하지 않는다 — 항상 이 배열을 통해 참조한다.
 */
export const Exercises: ExerciseDefinition[] = [
  // 가슴
  {
    id: 'bench-press',
    name: '벤치프레스',
    aliases: ['바벨 벤치프레스'],
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['arms', 'shoulders'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    instructions: '벤치에 누워 바벨을 가슴 중앙까지 내렸다가 밀어 올린다.',
    cautions: '어깨가 아프면 그립 너비를 좁혀본다. 무리한 중량보다 가동범위 유지가 우선.',
    tags: ['compound'],
  },
  {
    id: 'incline-bench-press',
    name: '인클라인 벤치프레스',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['shoulders', 'arms'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    instructions: '벤치를 30~45도로 세우고 벤치프레스와 동일하게 진행한다.',
  },
  {
    id: 'dumbbell-bench-press',
    name: '덤벨 벤치프레스',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['arms', 'shoulders'],
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
    instructions: '양손 덤벨을 가슴 옆에서 위로 밀어 올린다. 가동범위가 바벨보다 크다.',
  },
  {
    id: 'incline-dumbbell-press',
    name: '인클라인 덤벨프레스',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['shoulders'],
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'chest-press-machine',
    name: '체스트프레스',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['arms'],
    equipment: 'machine',
    trackingType: 'weight_reps',
    instructions: '머신에 앉아 손잡이를 정면으로 밀어낸다. 초보자도 안정적으로 하기 좋다.',
  },
  {
    id: 'pec-deck-fly',
    name: '펙덱 플라이',
    primaryMuscleGroup: 'chest',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'cable-fly',
    name: '케이블 플라이',
    primaryMuscleGroup: 'chest',
    equipment: 'cable',
    trackingType: 'weight_reps',
  },
  {
    id: 'dips',
    name: '딥스',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['arms'],
    equipment: 'bodyweight',
    trackingType: 'reps_only',
    cautions: '어깨 앞쪽에 통증이 있으면 상체를 더 숙이지 말고 각도를 세워본다.',
  },
  {
    id: 'push-up',
    name: '푸쉬업',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['arms', 'core'],
    equipment: 'bodyweight',
    trackingType: 'reps_only',
  },

  // 등
  {
    id: 'lat-pulldown',
    name: '랫풀다운',
    primaryMuscleGroup: 'back',
    secondaryMuscleGroups: ['arms'],
    equipment: 'cable',
    trackingType: 'weight_reps',
    instructions: '바를 어깨너비보다 약간 넓게 잡고 가슴 위쪽으로 당긴다.',
  },
  {
    id: 'pull-up',
    name: '풀업',
    primaryMuscleGroup: 'back',
    secondaryMuscleGroups: ['arms'],
    equipment: 'bodyweight',
    trackingType: 'reps_only',
  },
  {
    id: 'barbell-row',
    name: '바벨로우',
    primaryMuscleGroup: 'back',
    secondaryMuscleGroups: ['arms'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    cautions: '허리를 곧게 유지한다. 허리가 말리면 중량을 낮춘다.',
  },
  {
    id: 'dumbbell-row',
    name: '덤벨로우',
    primaryMuscleGroup: 'back',
    secondaryMuscleGroups: ['arms'],
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'seated-cable-row',
    name: '시티드 케이블로우',
    primaryMuscleGroup: 'back',
    equipment: 'cable',
    trackingType: 'weight_reps',
  },
  {
    id: 'machine-row',
    name: '머신로우',
    primaryMuscleGroup: 'back',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 't-bar-row',
    name: '티바로우',
    primaryMuscleGroup: 'back',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'straight-arm-pulldown',
    name: '스트레이트암 풀다운',
    primaryMuscleGroup: 'back',
    equipment: 'cable',
    trackingType: 'weight_reps',
  },

  // 하체
  {
    id: 'squat',
    name: '스쿼트',
    primaryMuscleGroup: 'legs',
    secondaryMuscleGroups: ['core'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    instructions: '바벨을 등 위에 얹고 무릎이 발끝 방향을 향하게 앉았다 일어난다.',
    cautions: '무릎이 안으로 모이지 않게 주의. 허리 통증이 있으면 중량을 낮추고 자세부터 점검.',
    tags: ['compound'],
  },
  {
    id: 'leg-press',
    name: '레그프레스',
    primaryMuscleGroup: 'legs',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'hack-squat',
    name: '핵스쿼트',
    primaryMuscleGroup: 'legs',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'leg-extension',
    name: '레그익스텐션',
    primaryMuscleGroup: 'legs',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'leg-curl',
    name: '레그컬',
    primaryMuscleGroup: 'legs',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'romanian-deadlift',
    name: '루마니안 데드리프트',
    primaryMuscleGroup: 'legs',
    secondaryMuscleGroups: ['back'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    cautions: '허리가 아니라 엉덩이를 뒤로 빼며 접는다. 허리가 굽으면 중량을 낮춘다.',
  },
  {
    id: 'lunge',
    name: '런지',
    primaryMuscleGroup: 'legs',
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'hip-thrust',
    name: '힙쓰러스트',
    primaryMuscleGroup: 'legs',
    equipment: 'barbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'calf-raise',
    name: '카프레이즈',
    primaryMuscleGroup: 'legs',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },

  // 어깨
  {
    id: 'overhead-press',
    name: '오버헤드프레스',
    primaryMuscleGroup: 'shoulders',
    secondaryMuscleGroups: ['arms'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    tags: ['compound'],
  },
  {
    id: 'dumbbell-shoulder-press',
    name: '덤벨 숄더프레스',
    primaryMuscleGroup: 'shoulders',
    secondaryMuscleGroups: ['arms'],
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'machine-shoulder-press',
    name: '머신 숄더프레스',
    primaryMuscleGroup: 'shoulders',
    equipment: 'machine',
    trackingType: 'weight_reps',
  },
  {
    id: 'side-lateral-raise',
    name: '사이드 레터럴레이즈',
    primaryMuscleGroup: 'shoulders',
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
    cautions: '반동을 쓰지 않는다. 가벼운 중량으로 정확하게.',
  },
  {
    id: 'rear-delt-fly',
    name: '리어델트 플라이',
    primaryMuscleGroup: 'shoulders',
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'face-pull',
    name: '페이스풀',
    primaryMuscleGroup: 'shoulders',
    secondaryMuscleGroups: ['back'],
    equipment: 'cable',
    trackingType: 'weight_reps',
  },

  // 팔
  {
    id: 'barbell-curl',
    name: '바벨컬',
    primaryMuscleGroup: 'arms',
    equipment: 'barbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'dumbbell-curl',
    name: '덤벨컬',
    primaryMuscleGroup: 'arms',
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'hammer-curl',
    name: '해머컬',
    primaryMuscleGroup: 'arms',
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'cable-curl',
    name: '케이블컬',
    primaryMuscleGroup: 'arms',
    equipment: 'cable',
    trackingType: 'weight_reps',
  },
  {
    id: 'triceps-pushdown',
    name: '트라이셉스 푸시다운',
    primaryMuscleGroup: 'arms',
    equipment: 'cable',
    trackingType: 'weight_reps',
  },
  {
    id: 'overhead-triceps-extension',
    name: '오버헤드 트라이셉스 익스텐션',
    primaryMuscleGroup: 'arms',
    equipment: 'dumbbell',
    trackingType: 'weight_reps',
  },
  {
    id: 'skull-crusher',
    name: '스컬크러셔',
    primaryMuscleGroup: 'arms',
    equipment: 'barbell',
    trackingType: 'weight_reps',
    cautions: '팔꿈치를 고정하고 천천히 내린다. 어깨/팔꿈치 통증이 있으면 중단.',
  },

  // 전신/코어
  {
    id: 'deadlift',
    name: '데드리프트',
    primaryMuscleGroup: 'fullBody',
    secondaryMuscleGroups: ['back', 'legs'],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    instructions: '바벨을 바닥에서 잡고 허리를 곧게 편 채로 일어선다.',
    cautions: '허리가 둥글게 말리면 중량을 낮춘다. 처음이면 가벼운 중량으로 자세부터.',
    tags: ['compound'],
  },
  {
    id: 'burpee',
    name: '버피',
    primaryMuscleGroup: 'fullBody',
    equipment: 'bodyweight',
    trackingType: 'reps_only',
  },
  {
    id: 'plank',
    name: '플랭크',
    primaryMuscleGroup: 'core',
    equipment: 'bodyweight',
    trackingType: 'duration',
  },
  {
    id: 'crunch',
    name: '크런치',
    primaryMuscleGroup: 'core',
    equipment: 'bodyweight',
    trackingType: 'reps_only',
  },
  {
    id: 'hanging-leg-raise',
    name: '행잉레그레이즈',
    primaryMuscleGroup: 'core',
    equipment: 'bodyweight',
    trackingType: 'reps_only',
  },
];

export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return Exercises.find((exercise) => exercise.id === id);
}

export function getExercisesByMuscleGroup(muscleGroup: string) {
  return Exercises.filter((exercise) => exercise.primaryMuscleGroup === muscleGroup);
}

export function searchExercises(query: string): ExerciseDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return Exercises;
  return Exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(normalized) ||
      exercise.aliases?.some((alias) => alias.toLowerCase().includes(normalized))
  );
}
