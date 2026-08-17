export type TrainerType = 'npc' | 'ai';

export interface TrainerDialogueLine {
  id: string;
  text: string;
}

export interface TrainerDialogueSet {
  greetingNoRecordToday: TrainerDialogueLine[];
  greetingRecordedToday: TrainerDialogueLine[];
  encouragement: TrainerDialogueLine[];
  tease: TrainerDialogueLine[];
  adPitch: TrainerDialogueLine[];
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
