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
  /** PT 컨텍스트에 담는 최근 운동 개수 상한 (앱 전체 기록을 보내지 않는다) */
  ptContextRecentExerciseLimit: 6,
  /** PT 컨텍스트에 담는 최근 PR 개수 상한 */
  ptContextRecentPrLimit: 3,
  /** AI 요청에 함께 보내는 직전 대화 개수 상한 (토큰/비용 폭증 방지) */
  aiHistoryMessageLimit: 8,
  /** AI 요청 타임아웃(ms). 넘으면 대화를 유지한 채 재시도 안내를 띄운다. */
  aiRequestTimeoutMs: 20000,
  /** 오픈 이벤트 무료 패스 기간(일) */
  openEventPassDays: 14,
  /** PASS: 운동 세션 1회 완료 시 지급되는 XP */
  passXpPerSession: 10,
  /** PASS: PR(자기 최고 기록 갱신) 1건당 추가 XP */
  passXpPerPr: 15,
  /**
   * 같은 중량으로 전보다 더 많이 든 PR(rep PR)의 XP. 최고 중량 갱신보다 작게 둔다 —
   * 둘 다 PR이지만 무게를 올린 쪽이 더 큰 사건이다.
   */
  passXpPerRepPr: 10,
  /** PASS: [이 루틴으로 시작]한 루틴의 모든 운동을 완료하면 추가 XP */
  passXpPerRoutineCompletion: 20,
  /** PASS: 한 레벨을 채우는 데 필요한 XP */
  passXpPerLevel: 100,
  /** 휴식 타이머 빠른 선택지(초) */
  restTimerPresetsSeconds: [60, 90, 120],
  /** 휴식 타이머 기본값(초) */
  defaultRestSeconds: 90,
  /**
   * Exercise DB에 defaultSets/defaultReps/defaultRestSeconds가 지정되지 않은 운동의 기본값.
   * 복합 관절(compound)은 무겁게 적게, 고립(isolation)은 가볍게 많이, 맨몸은 그 중간이라는
   * 일반적인 기준을 한 곳에 모아둔다 — 화면이나 Exercise DB에 숫자를 흩뿌리지 않는다.
   */
  exerciseDefaults: {
    compound: { sets: 5, reps: 5, restSeconds: 180 },
    isolation: { sets: 3, reps: 12, restSeconds: 60 },
    bodyweight: { sets: 3, reps: 12, restSeconds: 90 },
    /** trackingType이 'duration'인 운동은 reps를 '초'로 읽는다. */
    duration: { sets: 3, reps: 45, restSeconds: 60 },
  },
  /** [오늘 추천]으로 한 번에 담아주는 운동 개수 */
  recommendedExerciseCount: 4,
  /** 대체 운동(alternativeExerciseIds)을 유도할 때 최대 몇 개까지 제안할지 */
  alternativeExerciseLimit: 3,
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
  /**
   * 기록의 운동 시간(분)이 이 값을 넘으면 정상 운동이 아니라 과거 stale-session
   * 버그로 생성됐을 가능성이 높다고 보고 UI에서 눈에 띄게 경고 표시한다.
   * (recoverStaleSession이 적용되기 전에 저장된 기록에만 나타날 수 있다.)
   */
  suspiciousDurationMinutes: 240,
  /**
   * 프로필/신체 입력 허용 범위. 온보딩과 히스토리의 [몸 변화] 입력이 같은 값을 쓴다 —
   * 화면마다 다른 숫자를 하드코딩하지 않는다.
   */
  profileHeightRangeCm: { min: 100, max: 250 },
  profileWeightRangeKg: { min: 30, max: 300 },
  bodyFatPercentRange: { min: 3, max: 60 },
  skeletalMuscleRangeKg: { min: 10, max: 80 },
} as const;
