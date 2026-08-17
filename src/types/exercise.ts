export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'fullBody' | 'core';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'smith'
  | 'other';

export type ExerciseTrackingType = 'weight_reps' | 'reps_only' | 'duration';

export interface ExerciseDefinition {
  id: string;
  name: string;
  aliases?: string[];
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment: Equipment;
  trackingType: ExerciseTrackingType;
  instructions?: string;
  cautions?: string;
  tags?: string[];
}
