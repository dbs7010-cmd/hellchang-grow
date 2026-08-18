import { BodyGoalId, resolveBodyGoal } from '@/config/body-goals';
import { BodyHistoryEntry } from '@/types/body';
import { GenderExpression, UserProfile } from '@/types/user';
import { WorkoutRecord } from '@/types/workout';

/**
 * 추천 / 캐릭터 변화 표현 / AI PT가 공통으로 참조할 사용자 컨텍스트.
 *
 * 지금은 이 값을 소비하는 쪽이 mock 추천(recommendMuscleGroup)과 mock AI PT뿐이지만,
 * 나중에 실제 추천 엔진이나 LLM 프롬프트로 갈아끼울 때 화면 코드를 고치지 않도록
 * "무엇을 근거로 추천하는가"를 한 곳에 모아둔다.
 *
 * 중요한 원칙 두 가지:
 *  1. 추천은 성별만으로 결정하지 않는다. genderExpression은 여러 신호 중 하나일 뿐이고,
 *     핵심은 bodyGoal + 실제 운동 기록이다. 그래서 여성 사용자도 지방 CUT / 근력 UP /
 *     체형 개선을 남성과 똑같이 쓴다 — 별도의 여성용 화면이나 운동 DB를 만들지 않는다.
 *  2. 여기서 없는 신체 수치를 추정해 채우지 않는다. 값이 없으면 undefined 그대로 둔다.
 */
export interface RecommendationContext {
  bodyGoal: BodyGoalId;
  genderExpression: GenderExpression;
  heightCm?: number;
  /** 가장 최근에 사용자가 직접 입력한 체중 (없으면 온보딩 시점 체중) */
  weightKg?: number;
  /** 사용자가 직접 입력한 값만 — 앱이 계산하지 않는다 */
  bodyFatPercent?: number;
  skeletalMuscleKg?: number;
  /** 최근 활동량 판단용 */
  recentRecordCount: number;
  hasAnyRecord: boolean;
}

export function buildRecommendationContext(
  profile: UserProfile | null,
  bodyHistory: BodyHistoryEntry[],
  workoutRecords: WorkoutRecord[]
): RecommendationContext | null {
  if (!profile) return null;
  const latestBody = bodyHistory[0];

  return {
    bodyGoal: resolveBodyGoal(profile.bodyGoal),
    genderExpression: profile.genderExpression,
    heightCm: profile.heightCm,
    weightKg: latestBody?.weightKg ?? profile.weightKg,
    bodyFatPercent: latestBody?.bodyFatPercent,
    skeletalMuscleKg: latestBody?.skeletalMuscleKg,
    recentRecordCount: workoutRecords.length,
    hasAnyRecord: workoutRecords.length > 0,
  };
}
