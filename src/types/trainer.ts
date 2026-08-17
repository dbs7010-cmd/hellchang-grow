export type TrainerType = 'npc' | 'ai';

export interface TrainerDialogueLine {
  id: string;
  text: string;
}

export interface TrainerDialogueSet {
  greetingNoRecordToday: TrainerDialogueLine[];
  greetingRecordedToday: TrainerDialogueLine[];
  /** streak가 streakRewardDays 이상일 때 greetingRecordedToday 대신 사용 */
  streakPraise: TrainerDialogueLine[];
  encouragement: TrainerDialogueLine[];
  tease: TrainerDialogueLine[];
  adPitch: TrainerDialogueLine[];
  /** 실시간 운동 세션 시작 직후 */
  sessionStart: TrainerDialogueLine[];
  /** 오늘 이미 완료한 세션이 있는 상태에서 새 세션을 시작했을 때 */
  sessionSecondToday: TrainerDialogueLine[];
  /** 세션 경과 약 10분 */
  sessionMidway: TrainerDialogueLine[];
  /** 세션 경과 약 20~30분 */
  sessionExtended: TrainerDialogueLine[];
  /** 장시간 세션 (약 45분 이상) */
  sessionLong: TrainerDialogueLine[];
  sessionPaused: TrainerDialogueLine[];
  sessionResumed: TrainerDialogueLine[];
  sessionEnd: TrainerDialogueLine[];
}

export type TrainerUnlockType = 'always' | 'streak_reward' | 'subscription';

export interface TrainerUnlockRule {
  type: TrainerUnlockType;
  requiredStreakDays?: number;
  sessionCount?: number;
}

export interface TrainerMonetizationRule {
  freeAccess: boolean;
  adUnlockable: boolean;
  subscriptionRequired: boolean;
}

export interface TrainerAiProfile {
  promptPersona: string;
}

export interface TrainerProfile {
  id: string;
  displayName: string;
  type: TrainerType;
  personality: string[];
  /** 최종 아트 전까지 사용하는 이모지/도형 placeholder */
  portraitPlaceholder: string;
  dialogueSet: TrainerDialogueSet;
  capabilities: string[];
  aiProfile?: TrainerAiProfile;
  unlockRule: TrainerUnlockRule;
  monetizationRule: TrainerMonetizationRule;
}
