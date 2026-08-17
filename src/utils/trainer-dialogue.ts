import { AppConfig } from '@/config/app-config';
import { TrainerDialogueLine, TrainerDialogueSet } from '@/types/trainer';

export function pickTrainerLine(lines: TrainerDialogueLine[]): TrainerDialogueLine {
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * 오늘 기록 여부와 streak에 따라 조건형으로 인사 대사를 고른다.
 * streak가 보상 기준일 이상이면 일반 인사 대신 streakPraise 풀을 우선한다.
 */
export function getGreetingLine(
  dialogueSet: TrainerDialogueSet,
  input: { hasRecordedToday: boolean; currentStreakDays: number }
): TrainerDialogueLine {
  if (!input.hasRecordedToday) {
    return pickTrainerLine(dialogueSet.greetingNoRecordToday);
  }
  if (input.currentStreakDays >= AppConfig.streakRewardDays) {
    return pickTrainerLine(dialogueSet.streakPraise);
  }
  return pickTrainerLine(dialogueSet.greetingRecordedToday);
}
