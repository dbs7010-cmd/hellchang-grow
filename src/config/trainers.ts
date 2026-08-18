import { AppConfig } from '@/config/app-config';
import { TrainerProfile } from '@/types/trainer';

function lines(prefix: string, texts: string[]) {
  return texts.map((text, index) => ({ id: `${prefix}-${index}`, text }));
}

export const StanleyTrainer: TrainerProfile = {
  id: 'stanley',
  displayName: '골드썬-스탠리',
  type: 'npc',
  personality: ['존댓말', '기본적으로 친절함', '은근히 양아치스러움', '약간 껄렁함', '도전적', '돈을 밝힘', '자신감 있음'],
  portraitPlaceholder: '🕶️',
  dialogueSet: {
    greetingNoRecordToday: lines('stanley-no-record', [
      '오늘 기록이 비어 있는데요. 설마 숨만 쉬다 오신 건 아니죠?',
      '오늘 몸은 좀 움직이셨습니까? 기록이 안 보이는데요.',
      '아직 아무것도 안 하셨네요. 딱 보니까 압니다.',
    ]),
    greetingRecordedToday: lines('stanley-recorded', [
      '오, 오늘 뭐라도 하셨네요. 나쁘지 않습니다.',
      '기록 봤습니다. 이 정도면 회원비는 안 아깝겠네요.',
      '수고하셨습니다. 근데 내일도 오셔야 합니다?',
      '오늘은 움직이셨네요. 입금이라도 해드려야 하나.',
    ]),
    streakPraise: lines('stanley-streak', [
      '이 정도 꾸준하시면 저도 인정합니다. 계속 가시죠.',
      '연속 기록 좋은데요? 이 기세면 진짜 뭔가 되겠는데요.',
      '꾸준함 하나는 확실하시네요. 돈값 제대로 하고 계십니다.',
    ]),
    encouragement: lines('stanley-encourage', [
      '한 번 시작하신 거 며칠만 더 버텨보시죠. 몸은 거짓말 안 합니다.',
      '오늘 못하셨으면 내일 하시면 됩니다. 대신 진짜 내일은 오셔야 해요.',
      '느려도 괜찮습니다. 멈추는 게 문제죠.',
      '완벽하게 안 하셔도 됩니다. 그냥 계속하시기만 하면 돼요.',
    ]),
    tease: lines('stanley-tease', [
      '핑계는 창의적이신데 운동은 안 창의적이시네요.',
      '기록 안 하시면 저도 봐드릴 게 없습니다.',
      '어제도 그 말씀 하셨던 것 같은데요?',
      '오늘도 내일부터 하실 거죠?',
    ]),
    adPitch: lines('stanley-ad', [
      '공짜로 PT 받고 싶으세요? 광고부터 보시죠.',
      '제 시간은 돈입니다. 광고 하나 보고 오세요. 그럼 봐드리죠.',
      '무료는 없습니다. 광고는 있죠.',
      '세상에 공짜 PT가 어딨습니까. 광고라도 보셔야죠.',
    ]),
    sessionStart: lines('stanley-session-start', [
      '오셨습니까. 오늘도 몸값 좀 올려보시죠.',
      '시작하셨네요. 끝까지 가보시죠.',
      '타이머 켰습니다. 이제 발 못 빼십니다.',
    ]),
    sessionSecondToday: lines('stanley-session-second', [
      '또 오셨습니까? 이 정도면 진심이신데요.',
      '오늘 두 번째시네요. 욕심내시는 겁니까?',
      '하루에 두 번? 나쁘지 않은데요.',
    ]),
    sessionMidway: lines('stanley-session-midway', [
      '10분 됐습니다.',
      '슬슬 몸 풀리셨죠?',
      '10분 채우셨네요. 계속 가시죠.',
    ]),
    sessionExtended: lines('stanley-session-extended', [
      '오늘은 인정합니다.',
      '20분 넘었습니다. 페이스 괜찮은데요.',
      '이 정도면 진짜 하시는 거네요.',
    ]),
    sessionLong: lines('stanley-session-long', [
      '아직도 하고 계시네요. 무리는 하지 마시고.',
      '장시간 근무 중이시네요. 물 좀 드세요.',
      '이쯤 되면 저보다 열심히 하시는 것 같은데요.',
    ]),
    sessionPaused: lines('stanley-session-paused', [
      '잠깐 쉬시죠. 어디 도망가시진 말고.',
      '숨 좀 돌리세요. 대신 진짜 잠깐만입니다.',
    ]),
    sessionResumed: lines('stanley-session-resumed', [
      '다시 오셨네요. 그럼 그렇죠.',
      '재개하셨네요. 좋습니다, 계속 가시죠.',
    ]),
    sessionEnd: lines('stanley-session-end', [
      '수고하셨습니다. 오늘 몫은 하셨네요.',
      '끝! 이 정도면 회원비 값 하셨습니다.',
      '오늘 치 운동 완료입니다. 내일 또 뵙시다.',
    ]),
    homeGreeting: lines('stanley-home-greeting', [
      '오셨습니까. 슬슬 몸 좀 풀어보셔야죠.',
      '오늘도 오셨네요. 본전은 뽑고 가셔야죠.',
      '기다렸습니다. 오늘 한계 한번 뚫어보시죠.',
      '준비되셨으면 바로 시작하시죠. 시간이 돈입니다.',
      '오늘도 성실하시네요. 마음에 듭니다.',
    ]),
    prReaction: lines('stanley-pr', [
      'PR이네요. 이제 좀 제 회원 같으십니다.',
      '중량 올라가는 거 보니 흐뭇하네요.',
      '오, 방금 그거 신기록입니다. 인정하시죠.',
    ]),
    restReaction: lines('stanley-rest', [
      '좋습니다. 조금만 쉬었다가 다음 세트 가시죠.',
      '숨 고르시고, 다음 세트도 가시죠.',
      '이 정도 쉬셨으면 충분합니다.',
    ]),
  },
  capabilities: ['npc_dialogue', 'ad_unlockable_ai_pt'],
  aiProfile: {
    promptPersona:
      '돈을 밝히지만 실력은 확실한 PT 골드썬-스탠리. 존댓말을 쓰지만 은근히 양아치스럽고 껄렁하며 도전적이고 자신감 있다. 사용자를 놀리기도 하지만 욕설, 외모 비하, 몸 비하, 모욕, 과도한 밈은 쓰지 않는다. 통증/부상/질환 관련 질문에는 확정적인 의료 진단을 내리지 않는다.',
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
