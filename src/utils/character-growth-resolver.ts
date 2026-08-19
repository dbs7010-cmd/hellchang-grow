import {
  CharacterGrowthSignalWeights,
  CharacterGrowthStageThresholds,
  CharacterGrowthTargets,
  DefaultCharacterGrowthStage,
} from '@/config/character-growth';
import type { CharacterGrowthSignal, CharacterGrowthStage } from '@/config/character-growth';
import type { BodyHistoryEntry } from '@/types/body';
import type { WorkoutRecord } from '@/types/workout';
import { sumVolumeKg } from '@/utils/workout-stats';

export interface CharacterGrowthInput {
  /** 전체 운동 기록 (기간 필터 없이 누적) */
  workoutRecords: WorkoutRecord[];
  /** HELL PASS 누적 XP */
  passXp: number;
  /** 신체 기록 (최신순). 체지방률/골격근량은 없을 수 있다 */
  bodyHistory: BodyHistoryEntry[];
}

export interface CharacterGrowthResult {
  stage: CharacterGrowthStage;
  /** 종합 진행도 0~1. 디버깅/후속 확장용이고 UI에 Lv처럼 노출하지 않는다. */
  progress: number;
  /** 이번 계산에 실제로 참여한 신호. 데이터가 없던 신호는 여기 없다. */
  usedSignals: CharacterGrowthSignal[];
  /** 쓸 수 있는 신호가 하나도 없어 기본 단계로 떨어졌는지 */
  isDefault: boolean;
}

/** 0~1로 자른다. 목표치를 넘겨도 1을 넘지 않는다. */
function ratio(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

/**
 * 사용자가 직접 입력한 신체 수치의 "실제 변화"만 본다.
 * 기록이 2개 미만이거나 해당 항목이 비어 있으면 신호 자체가 없는 것으로 처리한다 —
 * 앱이 추정값을 만들어 채우지 않는다.
 */
function bodyCompositionSignal(bodyHistory: BodyHistoryEntry[]): number | undefined {
  if (bodyHistory.length < 2) return undefined;

  // bodyHistory는 최신순이다. 가장 오래된 기록을 기준선으로 삼는다.
  const latest = bodyHistory[0];
  const oldest = bodyHistory[bodyHistory.length - 1];

  const scores: number[] = [];

  if (latest.skeletalMuscleKg !== undefined && oldest.skeletalMuscleKg !== undefined) {
    const gain = latest.skeletalMuscleKg - oldest.skeletalMuscleKg;
    scores.push(ratio(gain, CharacterGrowthTargets.skeletalMuscleGainKg));
  }

  if (latest.bodyFatPercent !== undefined && oldest.bodyFatPercent !== undefined) {
    const drop = oldest.bodyFatPercent - latest.bodyFatPercent;
    scores.push(ratio(drop, CharacterGrowthTargets.bodyFatDropPercent));
  }

  if (scores.length === 0) return undefined;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

/**
 * CHARACTER GROWTH RESOLVER — 캐릭터가 지금 몇 단계로 보일지 정하는 유일한 곳.
 *
 * 원칙:
 *  1. 단일 수치로 정하지 않는다. 특히 체중 하나로는 절대 단계가 바뀌지 않는다.
 *     운동 누적(볼륨/세션), HELL PASS 진행, 그리고 사용자가 직접 넣은 체성분 변화를 섞는다.
 *  2. 있는 데이터만 쓴다. 없는 신호는 0점 처리가 아니라 계산에서 빠지고, 남은 신호의
 *     가중치를 다시 정규화한다 — 인바디를 한 번도 안 넣은 사용자가 손해 보지 않는다.
 *  3. 쓸 수 있는 신호가 하나도 없으면 안전한 기본 단계(stage1)를 돌려준다. 추측하지 않는다.
 *  4. 이 값은 게임 아바타 표현 전용이다. 사용자의 실제 신체 수치를 바꾸지 않는다.
 *
 * TODO(character-growth): Body Growth 도메인(FAT CUT / STRENGTH UP 추세)이 생기면
 * 신호를 추가하고 가중치만 조정한다. 호출부(화면/렌더러)는 손대지 않아도 된다.
 */
export function resolveCharacterGrowth(input: CharacterGrowthInput): CharacterGrowthResult {
  const { workoutRecords, passXp, bodyHistory } = input;

  const signalScores: Partial<Record<CharacterGrowthSignal, number>> = {};

  if (workoutRecords.length > 0) {
    signalScores.workoutSessions = ratio(workoutRecords.length, CharacterGrowthTargets.sessions);

    const totalVolumeKg = sumVolumeKg(workoutRecords);
    // 세트 기록이 없는 유산소만 있는 경우 볼륨은 0이다 — 그건 "데이터 없음"이 아니라
    // 실제로 든 무게가 없는 것이므로 신호로 넣지 않는다 (0점으로 끌어내리지 않는다).
    if (totalVolumeKg > 0) {
      signalScores.workoutVolume = ratio(totalVolumeKg, CharacterGrowthTargets.volumeKg);
    }
  }

  if (passXp > 0) {
    signalScores.passXp = ratio(passXp, CharacterGrowthTargets.passXp);
  }

  const bodyScore = bodyCompositionSignal(bodyHistory);
  if (bodyScore !== undefined) {
    signalScores.bodyComposition = bodyScore;
  }

  const usedSignals = Object.keys(signalScores) as CharacterGrowthSignal[];

  if (usedSignals.length === 0) {
    return { stage: DefaultCharacterGrowthStage, progress: 0, usedSignals: [], isDefault: true };
  }

  const totalWeight = usedSignals.reduce(
    (sum, signal) => sum + CharacterGrowthSignalWeights[signal],
    0
  );
  const weightedSum = usedSignals.reduce(
    (sum, signal) => sum + (signalScores[signal] ?? 0) * CharacterGrowthSignalWeights[signal],
    0
  );
  const progress = totalWeight > 0 ? weightedSum / totalWeight : 0;

  const matched = CharacterGrowthStageThresholds.find((entry) => progress >= entry.min);

  return {
    stage: matched?.stage ?? DefaultCharacterGrowthStage,
    progress,
    usedSignals,
    isDefault: false,
  };
}
