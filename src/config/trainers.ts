import { AppConfig } from '@/config/app-config';
import { TrainerProfile } from '@/types/trainer';

function lines(prefix: string, texts: string[]) {
  return texts.map((text, index) => ({ id: `${prefix}-${index}`, text }));
}

export const StanleyTrainer: TrainerProfile = {
  id: 'stanley',
  displayName: '스탠리',
  type: 'npc',
  personality: ['돈을 밝힘', '뻔뻔함', '실전형', '은근히 다정함'],
  portraitPlaceholder: '🤑',
  dialogueSet: {
    greetingNoRecordToday: lines('stanley-no-record', [
      '오늘 기록이 비어 있는데? 설마 숨만 쉬다 온 건 아니지?',
      '몸 좀 움직였냐? 기록이 안 보이는데.',
      '오늘 아직 아무것도 안 했지. 딱 보니까 알아.',
    ]),
    greetingRecordedToday: lines('stanley-recorded', [
      '오, 오늘 뭐라도 했네. 나쁘지 않아.',
      '기록 봤다. 이 정도면 용돈 값은 했다.',
      '수고했어. 근데 내일도 해야 한다?',
      '오호, 오늘은 움직였네. 계좌에 입금이라도 해줘야 하나.',
    ]),
    streakPraise: lines('stanley-streak', [
      '이 정도 꾸준하면 나도 인정한다. 계속 가자.',
      '연속 기록 좋은데? 이 기세면 진짜 뭔가 될 것 같아.',
      '꾸준함 하나는 확실하네. 돈값 제대로 하고 있어.',
    ]),
    encouragement: lines('stanley-encourage', [
      '한 번 시작한 거 며칠만 더 버텨봐. 몸은 거짓말 안 해.',
      '오늘 못했으면 내일 하면 되지. 대신 진짜 내일은 해라.',
      '느려도 괜찮아. 멈추는 게 문제지.',
      '완벽하게 안 해도 돼. 그냥 계속하기만 해.',
    ]),
    tease: lines('stanley-tease', [
      '핑계는 창의적인데 운동은 안 창의적이네.',
      '기록 안 하면 나도 봐줄 게 없어.',
      '어제도 그 말 했던 거 같은데?',
      '오늘도 내일부터 할 거지?',
    ]),
    adPitch: lines('stanley-ad', [
      '공짜로 PT 받고 싶어? 광고부터.',
      '내 시간은 돈이야. 광고 하나 보고 와. 그럼 봐준다.',
      '무료는 없어. 광고는 있지.',
      '세상에 공짜 PT가 어딨어. 광고라도 봐야지.',
    ]),
    sessionStart: lines('stanley-session-start', [
      '오늘은 움직이긴 하네.',
      '시작했다. 끝까지 가보자고.',
      '타이머 켰다. 이제 발 못 빼.',
    ]),
    sessionSecondToday: lines('stanley-session-second', [
      '또 시작했냐? 이 정도면 진심인데.',
      '오늘 두 번째네. 욕심내는 거야?',
      '하루에 두 번? 나쁘지 않은데.',
    ]),
    sessionMidway: lines('stanley-session-midway', [
      '10분 됐다.',
      '슬슬 몸 풀렸냐?',
      '10분 채웠네. 계속 가.',
    ]),
    sessionExtended: lines('stanley-session-extended', [
      '오늘은 인정.',
      '20분 넘었다. 페이스 괜찮은데.',
      '이 정도면 진짜 하는 거네.',
    ]),
    sessionLong: lines('stanley-session-long', [
      '아직도 하고 있네. 무리하진 말고.',
      '장시간 근무 중이시네. 물 좀 마셔.',
      '이쯤 되면 나보다 열심히 하는 듯.',
    ]),
    sessionPaused: lines('stanley-session-paused', [
      '잠깐 쉬어. 어디 도망가진 말고.',
      '숨 좀 돌려. 대신 진짜 잠깐만.',
    ]),
    sessionResumed: lines('stanley-session-resumed', [
      '다시 왔네. 그럼 그렇지.',
      '재개. 좋아, 계속 가자.',
    ]),
    sessionEnd: lines('stanley-session-end', [
      '수고했다. 오늘 몫은 했네.',
      '끝! 이 정도면 용돈 값 했다.',
      '오늘 치 운동 완료. 내일 또 보자.',
    ]),
  },
  capabilities: ['npc_dialogue', 'ad_unlockable_ai_pt'],
  aiProfile: {
    promptPersona:
      '돈을 밝히지만 실력은 확실한 PT 스탠리. 사용자를 놀리기도 하지만 과도하게 모욕하거나 비하하지 않는다. 통증/부상/질환 관련 질문에는 확정적인 의료 진단을 내리지 않는다.',
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
