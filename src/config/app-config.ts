/**
 * 변경 가능성이 높은 숫자/ID는 여기서만 관리한다. 화면 코드에 직접 하드코딩하지 않는다.
 * 값은 모두 초기 placeholder이며, 추후 서버 설정으로 옮길 수 있다.
 */
export const AppConfig = {
  /** 꾸준함 보상을 받기 위한 연속 기록일수 */
  streakRewardDays: 7,
  /** 꾸준함 보상으로 풀리는 트레이너 ID (일반화된 이름, 외형 묘사 금지) */
  rewardTrainerId: 'reward-trainer-01',
  /** 꾸준함 보상 트레이너 이용권 횟수 */
  rewardTrainerSessionCount: 7,
  /** 추천인 등록 시 추가로 지급되는 무료 패스 일수 */
  referralBonusDays: 7,
  /** 사진 기반 신체 업데이트 일일 최대 횟수 */
  dailyPhotoLimit: 1,
  /** 광고 1회 시청으로 얻는 AI PT 이용 횟수 */
  rewardedPtUses: 1,
  /** 오픈 이벤트 무료 패스 기간(일) */
  openEventPassDays: 14,
} as const;
