export type WorkoutCategory =
  | 'strength'
  | 'home'
  | 'running'
  | 'walking'
  | 'cycling'
  | 'sports'
  | 'other';

export type WorkoutIntensity = 'low' | 'medium' | 'high';

export interface WorkoutExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
}

export interface WorkoutRecord {
  id: string;
  /** YYYY-MM-DD, 기록 대상 날짜 */
  date: string;
  category: WorkoutCategory;
  title: string;
  durationMinutes?: number;
  intensity?: WorkoutIntensity;
  exercises?: WorkoutExercise[];
  memo?: string;
  completed: boolean;
  createdAt: string;
}
