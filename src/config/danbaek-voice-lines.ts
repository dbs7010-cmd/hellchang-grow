import type { LearningStage, MovementFamily } from '@/types/danbaek-contract';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 단백이가 하는 말 (표시 문구만 모아 둔 곳)
 *
 * 화면은 두 층으로 말한다:
 *   PRIMARY   — 단백이 자신의 짧은 반응 ("나도 해볼래!")
 *   SECONDARY — 정확한 시스템 상태 ("매달려 당기기 · 지켜보는 중")
 *
 * 규칙(제품 canon):
 *  - 단계보다 앞서 말하지 않는다. 한 번 본 것을 "할 수 있어"라고 하지 않는다.
 *  - 유아어를 남발하지 않고, 긴 감정 대사를 쓰지 않는다.
 *  - 운동하지 않았다고 플레이어를 탓하지 않는다.
 *  - 단계마다 **한 줄로 고정**한다 — 같은 상태면 화면이 흔들리지 않아야 하고,
 *    무작위 대사는 검증도 불가능해진다.
 *
 * 스탠리는 반대다: 전문가답게 짧게, 지시로 끝난다. 스탠리의 문장은
 * `utils/trainer-brief.ts`에 있고 여기에 섞지 않는다 — 두 목소리를 한 파일에 두면
 * 시간이 지나면서 말투가 섞인다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 상태 표시에 쓰는 **짧은** 동작 이름. 설명형 이름(`MovementFamilyLabels`)은 문장 안에서
 * 읽히고, 이쪽은 칩/한 줄 상태에서 읽힌다.
 */
export const MovementFamilyShortLabels: Record<MovementFamily, string> = {
  push_horizontal: '밀기',
  pull_vertical: '매달려 당기기',
  pull_horizontal: '당기기',
  squat: '앉았다 일어서기',
  hinge: '숙였다 세우기',
  push_vertical: '머리 위로 밀기',
  carry: '들고 버티기',
  locomotion: '이동하기',
};

/**
 * 학습 단계별 단백이 한마디. **단계가 곧 말할 수 있는 한계다.**
 * observing에서 "할 수 있어"가 나오면 그 순간 앱이 거짓말을 한다.
 */
export const DanbaekStageVoiceLines: Record<LearningStage, string> = {
  unseen: '오늘은 뭐 해요? 나도 볼래.',
  observing: '또 그거 해요? 나도 해볼래!',
  imitating: '이제 조금 알 것 같아!',
  learned: '이거 이제 나도 해!',
  familiar: '이건 꽤 익숙해졌어.',
  proficient: '이건 눈 감고도 하겠는데?',
};

/** 유효한 세트를 막 끝냈을 때. 방금 본 동작을 따라 해보는 순간이다. */
export const DanbaekSetVoiceLine = '나도 해볼래!';

/** 이번 운동으로 단계가 올라갔을 때 / 그냥 더 봤을 때 (결과 화면). */
export const DanbaekGainVoiceLines = {
  stageUp: '한 걸음 늘었어!',
  moreEvidence: '한 번 더 봤어. 다음엔 될 것 같아.',
} as const;

/**
 * 단백세상에서 길이 열렸을 때.
 *
 * **학습 단계를 말하지 않는다.** 벤치프레스를 한 번 봤을 뿐인데 "이제 밀기는 다 알아"가
 * 나오면 그 순간 앱이 거짓말을 한다. 여기서는 방금 실제로 일어난 일(문이 열렸다)만 말하고,
 * 얼마나 배웠는지는 그 아래 상태 줄이 정확하게 말한다.
 */
export const DanbaekWorldVoiceLines = {
  gateCleared: '운동에서 본 밀기다! 문이 열렸어.',
  cliffCleared: '운동에서 본 당기기다! 위까지 올라왔어.',
  stonesCleared: '운동에서 본 자세다! 흔들려도 중심을 잡았어.',
  returnedAfterWorkout: '아까는 열리지 않았는데, 운동하고 돌아오니 열렸어!',
} as const;

/** 단백세상에서 막혔을 때. 도움을 요청하되 플레이어를 탓하지 않는다. */
export const DanbaekBlockVoiceLines = {
  /** 아직 그 동작을 배울 길이 앱에 있는 경우 */
  needsPractice: '이 앞은 아직 못 지나가겠어. 이거 배우면 돼?',
  /** 지금 연결할 운동이 없는 경우 — 기다린다고만 말한다 */
  noRoute: '이 앞은 아직 어려워. 다음에 다시 와볼래.',
} as const;
