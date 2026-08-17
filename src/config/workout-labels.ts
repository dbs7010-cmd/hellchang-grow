import { WorkoutCategory, WorkoutIntensity } from '@/types/workout';

export const WorkoutCategories: WorkoutCategory[] = [
  'strength',
  'home',
  'running',
  'walking',
  'cycling',
  'other',
];

export const WorkoutCategoryLabels: Record<WorkoutCategory, string> = {
  strength: '웨이트',
  home: '홈트레이닝',
  running: '러닝',
  walking: '걷기',
  cycling: '자전거',
  other: '기타',
};

export const WorkoutIntensities: WorkoutIntensity[] = ['low', 'medium', 'high'];

export const WorkoutIntensityLabels: Record<WorkoutIntensity, string> = {
  low: '가볍게',
  medium: '적당히',
  high: '빡세게',
};
