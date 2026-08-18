import { BodyGoalId } from '@/config/body-goals';
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
  /**
   * 운동 목표 (지방 CUT / 근력 UP / 체형 개선). 설정 > 내 정보에서 바꾼다.
   * 온보딩에는 아직 단계가 없어서 없을 수 있다 — 읽을 때는 resolveBodyGoal()을 쓴다.
   * 성별과 무관하게 같은 목록을 쓴다.
   */
  bodyGoal?: BodyGoalId;
}
