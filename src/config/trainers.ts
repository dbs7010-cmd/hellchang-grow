import { AppConfig } from '@/config/app-config';
import { TrainerProfile } from '@/types/trainer';

function lines(prefix: string, texts: string[]) {
  return texts.map((text, index) => ({ id: `${prefix}-${index}`, text }));
}

/**
 * 스탠리 — 사용자의 담당 PT.
 *
 * 톤 규칙: 자연스러운 존댓말로 짧게, 실제 사람이 할 법한 말만 한다.
 * 헬스 밈, 과장된 양아치 말투, 불필요한 훈계를 쓰지 않는다.
 * 캐릭터성은 상황이 맞을 때만 낮은 빈도로 건조한 농담 정도로 드러난다.
 *
 * 파일/컴포넌트의 내부 이름(goldsun-*)은 그대로 두고, 사용자에게 보이는 이름만 '스탠리'다.
 */
export const StanleyTrainer: TrainerProfile = {
  id: 'stanley',
  displayName: '스탠리',
  type: 'npc',
  personality: ['존댓말', '담백함', '군더더기 없음', '가끔 건조한 농담', '전문가다움'],
  portraitPlaceholder: '🕶️',
  dialogueSet: {
    greetingNoRecordToday: lines('stanley-no-record', [
      '오늘은 뭐 하실 겁니까?',
      '아직 기록이 없네요. 뭐부터 하실까요?',
      '오늘 컨디션은 어떠십니까?',
    ]),
    greetingRecordedToday: lines('stanley-recorded', [
      '오늘 기록 봤습니다. 수고하셨어요.',
      '오늘 하신 거 잘 봤습니다.',
      '기록 남기셨네요. 좋습니다.',
    ]),
    streakPraise: lines('stanley-streak', [
      '며칠째 계속 나오시네요. 좋습니다.',
      '꾸준히 하고 계시네요.',
      '이 페이스 유지하시면 됩니다.',
    ]),
    encouragement: lines('stanley-encourage', [
      '오늘 못 하셨으면 내일 하시면 됩니다.',
      '완벽하게 안 하셔도 됩니다. 계속하는 게 중요하죠.',
      '천천히 하셔도 괜찮습니다.',
    ]),
    tease: lines('stanley-tease', [
      '어제도 비슷한 말씀 하신 것 같은데요.',
      '오늘도 내일부터십니까?',
    ]),
    adPitch: lines('stanley-ad', [
      '광고 한 번 보시면 바로 이용하실 수 있습니다.',
      '제 시간도 시간이라서요. 광고 하나만 보시죠.',
      '광고를 보시거나 구독하시면 됩니다.',
    ]),
    sessionStart: lines('stanley-session-start', [
      '시작하시죠.',
      '오셨네요. 시작하시죠.',
      '타이머 켜뒀습니다.',
    ]),
    sessionSecondToday: lines('stanley-session-second', [
      '오늘 두 번째시네요.',
      '또 오셨네요.',
    ]),
    sessionMidway: lines('stanley-session-midway', [
      '10분 지났습니다.',
      '슬슬 몸 풀리셨겠네요.',
    ]),
    sessionExtended: lines('stanley-session-extended', [
      '20분 넘었습니다. 페이스 괜찮습니다.',
      '잘 하고 계십니다.',
    ]),
    sessionLong: lines('stanley-session-long', [
      '오래 하고 계시네요. 무리는 마시고요.',
      '물 한 번 드시죠.',
    ]),
    sessionPaused: lines('stanley-session-paused', [
      '잠깐 쉬시죠.',
      '숨 돌리세요.',
    ]),
    sessionResumed: lines('stanley-session-resumed', [
      '다시 가시죠.',
      '이어서 하시죠.',
    ]),
    sessionEnd: lines('stanley-session-end', [
      '수고하셨습니다.',
      '오늘 운동 끝났습니다. 수고하셨어요.',
      '마무리하셨네요. 잘하셨습니다.',
    ]),
    homeGreeting: lines('stanley-home-greeting', [
      '오셨네요. 시작하시죠.',
      '오늘은 뭐 하실 겁니까?',
      '오늘 컨디션은 어떠십니까?',
      '자, 뭐부터 하실까요?',
      '오늘도 오셨네요.',
    ]),
    prReaction: lines('stanley-pr', [
      '오, 기록 올리셨네요.',
      '방금 그거 신기록입니다.',
      '중량 올라갔네요. 좋습니다.',
    ]),
    restReaction: lines('stanley-rest', [
      '숨 고르시고 다음 세트 가시죠.',
      '조금만 쉬었다 가시죠.',
      '이 정도면 충분합니다.',
    ]),
  },
  capabilities: ['npc_dialogue', 'ad_unlockable_ai_pt'],
  aiProfile: {
    promptPersona:
      '실력 있는 PT 스탠리. 존댓말을 쓰고 짧고 담백하게 말한다. 헬스 밈이나 과장된 말투를 쓰지 않고, 훈계하지 않는다. 상황이 맞을 때만 낮은 빈도로 건조한 농담을 한다. 욕설, 외모 비하, 몸 비하, 모욕은 쓰지 않는다. 통증/부상/질환 관련 질문에는 확정적인 의료 진단을 내리지 않는다.',
  },
  unlockRule: { type: 'always' },
  monetizationRule: { freeAccess: true, adUnlockable: true, subscriptionRequired: false },
};

export const StreakRewardTrainer: TrainerProfile = {
  id: AppConfig.rewardTrainerId,
  displayName: '미스터리 트레이너',
  type: 'npc',
  personality: ['비밀스러움', '전문가 포스'],
  portraitPlaceholder: '❓',
  dialogueSet: {
    greetingNoRecordToday: lines('reward-no-record', ['오늘도 기다리고 있을게. 꾸준함이 제일 중요해.']),
    greetingRecordedToday: lines('reward-recorded', ['이 정도 꾸준함이면 나랑 잘 맞겠는데.']),
    streakPraise: lines('reward-streak', ['여기까지 꾸준히 온 사람만 만날 수 있어. 반가워.']),
    encouragement: lines('reward-encourage', ['여기까지 온 것만으로도 대단한 거야.']),
    tease: lines('reward-tease', ['설마 여기서 멈추려고?']),
    adPitch: lines('reward-ad', ['나는 광고 없이도 만날 수 있어. 꾸준함으로 얻은 거니까.']),
    sessionStart: lines('reward-session-start', ['오늘도 시작이네.']),
    sessionSecondToday: lines('reward-session-second', ['오늘 벌써 두 번째. 대단한데.']),
    sessionMidway: lines('reward-session-midway', ['10분째. 좋은 페이스야.']),
    sessionExtended: lines('reward-session-extended', ['꾸준히 하고 있네.']),
    sessionLong: lines('reward-session-long', ['오래 하네. 무리하지는 마.']),
    sessionPaused: lines('reward-session-paused', ['잠깐 쉬어가도 괜찮아.']),
    sessionResumed: lines('reward-session-resumed', ['다시 시작하는구나.']),
    sessionEnd: lines('reward-session-end', ['오늘도 수고했어.']),
    homeGreeting: lines('reward-home-greeting', ['오늘도 기다리고 있었어요.']),
    prReaction: lines('reward-pr', ['기록이 또 늘었네. 놀랍지 않아.']),
    restReaction: lines('reward-rest', ['잠깐 쉬어가. 급할 거 없어.']),
  },
  capabilities: ['npc_dialogue'],
  unlockRule: {
    type: 'streak_reward',
    requiredStreakDays: AppConfig.streakRewardDays,
    sessionCount: AppConfig.rewardTrainerSessionCount,
  },
  monetizationRule: { freeAccess: false, adUnlockable: false, subscriptionRequired: false },
};

export const Trainers: TrainerProfile[] = [StanleyTrainer, StreakRewardTrainer];

export function getTrainerById(id: string): TrainerProfile | undefined {
  return Trainers.find((trainer) => trainer.id === id);
}
