import { LearningStages, type LearningStage } from '@/types/danbaek-contract';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DANBAEK LEARNING POLICY (tunable — **not** the shared contract)
 *
 * 계약(`types/danbaek-contract.ts`)은 "어떤 단계가 있는가"만 정한다. 그 단계에 **언제**
 * 도달하는지는 APP의 도메인 판단이며, 저장소의 실제 기록으로 튜닝될 값이다
 * (`docs/rebuild/REBUILD_STATE.md`의 EXPERIMENTAL 항목: "Exact learning thresholds").
 *
 * 그래서 숫자를 계산 코드에 박지 않고 여기 한 곳에 모은다. 튜닝은 이 파일만 고치면 되고,
 * WORLD는 이 파일을 읽지 않는다 — WORLD는 단계 이름만 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * evidence 한 개의 뜻: **완료된 운동 기록 하나에서, 실제로 수행된 운동 한 종목**.
 *
 * 세트 수로 세지 않는다. 세트로 세면 같은 동작이라도 프로그램(5x5 vs 3x12)에 따라 학습
 * 속도가 달라져 "단백이가 지켜본 횟수"라는 뜻이 흐려진다. 반대로 세션 단위로만 세면
 * 한 세션에서 벤치와 인클라인을 모두 한 것이 한 번으로 접힌다.
 */
export const DanbaekLearningThresholds: Record<Exclude<LearningStage, 'unseen'>, number> = {
  observing: 1,
  imitating: 2,
  learned: 4,
  familiar: 8,
  proficient: 16,
};

/** 대표 운동은 화면 한 줄에 들어갈 만큼만 남긴다. */
export const DanbaekRepresentativeExerciseLimit = 3;

/**
 * 사람에게 보여줄 단계 이름 (헌법 5장 — 숫자보다 학습/모방의 언어를 쓴다).
 * WORLD와 주고받는 값은 영어 enum 그대로이고, 이 표는 화면 표시용이다.
 */
export const LearningStageLabels: Record<LearningStage, string> = {
  unseen: '처음 봄',
  observing: '지켜보는 중',
  imitating: '따라 하는 중',
  learned: '배움',
  familiar: '익숙함',
  proficient: '능숙함',
};

/** 낮은 단계부터의 순서. 비교(이 단계 이상인가)에 쓴다. */
export const LearningStageOrder: readonly LearningStage[] = LearningStages;

export function learningStageRank(stage: LearningStage): number {
  return LearningStageOrder.indexOf(stage);
}

/** evidence 개수 → 단계. 임계값은 위 표 하나에서만 온다. */
export function learningStageForEvidence(evidenceCount: number): LearningStage {
  if (evidenceCount >= DanbaekLearningThresholds.proficient) return 'proficient';
  if (evidenceCount >= DanbaekLearningThresholds.familiar) return 'familiar';
  if (evidenceCount >= DanbaekLearningThresholds.learned) return 'learned';
  if (evidenceCount >= DanbaekLearningThresholds.imitating) return 'imitating';
  if (evidenceCount >= DanbaekLearningThresholds.observing) return 'observing';
  return 'unseen';
}
