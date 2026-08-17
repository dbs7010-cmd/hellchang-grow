import { BodyParameters } from '@/types/body';

export type GenderExpression = 'male' | 'female';

export type SetupMethod = 'preset' | 'photo';

export interface UserProfile {
  id: string;
  createdAt: string;
  genderExpression: GenderExpression;
  bodyPresetId: string;
  bodyParameters: BodyParameters;
  heightCm?: number;
  weightKg: number;
  setupMethod: SetupMethod;
}
