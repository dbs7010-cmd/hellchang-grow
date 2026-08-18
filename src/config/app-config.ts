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
  /** PASS: 운동 세션 1회 완료 시 지급되는 XP */
  passXpPerSession: 10,
  /** PASS: PR(자기 최고 기록 갱신) 1건당 추가 XP */
  passXpPerPr: 15,
  /** PASS: [이 루틴으로 시작]한 루틴의 모든 운동을 완료하면 추가 XP */
  passXpPerRoutineCompletion: 20,
  /** PASS: 한 레벨을 채우는 데 필요한 XP */
  passXpPerLevel: 100,
  /** 휴식 타이머 빠른 선택지(초) */
  restTimerPresetsSeconds: [60, 90, 120],
  /** 휴식 타이머 기본값(초) */
  defaultRestSeconds: 90,
  /** 세트 중량 +/- 스테퍼 증감 단위(kg) */
  setWeightStepKg: 2.5,
  /** 세트 횟수 +/- 스테퍼 증감 단위(회) */
  setRepsStep: 1,
  /** 휴식 타이머가 이 초 이하로 남으면 밝은 gold로 강조 */
  restUrgentThresholdSeconds: 10,
  /**
   * 세션이 'active' 상태로 저장되어 있는데 이 시간(분) 이상 heartbeat가 없으면
   * 백그라운드/강제종료로 방치된 것으로 보고 자동 일시정지한다.
   */
  staleActiveSessionThresholdMinutes: 3,
  /** 세션이 active인 동안 heartbeat를 저장하는 주기(초) — 강제 종료 대비용 */
  sessionHeartbeatIntervalSeconds: 20,
} as const;
