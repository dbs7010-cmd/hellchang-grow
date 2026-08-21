import { GrowthConfig, MaxMuscleStage } from '@/config/growth-config';
import {
  MuscleDetailToGroup,
  MuscleGroupDetails,
  type MuscleGroupDetail,
  type MuscleSpDistribution,
} from '@/types/exercise';
import type {
  DanbaekGrowthState,
  GrowthApplicationResult,
  MuscleGrowthState,
  MuscleStageChange,
} from '@/types/growth';
import { toDateString } from '@/utils/date';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GROWTH STATE — 계산된 SP를 누적 상태에 반영하는 순수 레이어
 *
 * 저장/읽기는 `data/growth-repository.ts`가, 자극 계산은 `utils/growth-calculation.ts`가
 * 맡는다. 이 파일은 그 사이에서 "쌓고, 상한을 걸고, 단계를 다시 계산하는" 일만 한다.
 * 전부 순수 함수라 테스트로 밸런스를 검증할 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const GrowthStateVersion = 1;

function emptyMuscle(): MuscleGrowthState {
  return { totalSp: 0, currentStage: 0 };
}

export function createDefaultGrowthState(nowIso: string): DanbaekGrowthState {
  const muscles = {} as Record<MuscleGroupDetail, MuscleGrowthState>;
  for (const muscle of MuscleGroupDetails) muscles[muscle] = emptyMuscle();

  return {
    version: GrowthStateVersion,
    muscles,
    totalWorkoutSp: 0,
    daily: { date: growthDay(nowIso), spByMuscle: {} },
    updatedAt: nowIso,
  };
}

/**
 * 저장된 값을 현재 스키마로 맞춘다 — 저장 구조가 늘어나도 기존 사용자의 SP가 사라지지
 * 않게 하는 최소한의 backward-compatible 보정이다. 알고 있는 값은 그대로 두고,
 * 빠진 부위/필드만 채운다. (세부 부위가 추가되면 그 부위만 0으로 생긴다.)
 */
export function migrateGrowthState(
  stored: Partial<DanbaekGrowthState> | null,
  nowIso: string
): DanbaekGrowthState {
  const base = createDefaultGrowthState(nowIso);
  if (!stored) return base;

  const muscles = { ...base.muscles };
  for (const muscle of MuscleGroupDetails) {
    const savedMuscle = stored.muscles?.[muscle];
    if (!savedMuscle) continue;
    const totalSp = Number.isFinite(savedMuscle.totalSp) ? Math.max(0, savedMuscle.totalSp) : 0;
    muscles[muscle] = {
      totalSp,
      // stage는 저장돼 있어도 항상 threshold에서 다시 계산한다 — 밸런스를 조정하면
      // 기존 사용자의 단계도 즉시 새 기준으로 재평가돼야 한다.
      currentStage: stageForSp(totalSp),
      lastGainAt: savedMuscle.lastGainAt,
    };
  }

  return {
    version: GrowthStateVersion,
    muscles,
    totalWorkoutSp: Math.max(0, stored.totalWorkoutSp ?? sumTotalSp(muscles)),
    daily: stored.daily?.date
      ? { date: stored.daily.date, spByMuscle: stored.daily.spByMuscle ?? {} }
      : base.daily,
    lastSessionId: stored.lastSessionId,
    updatedAt: stored.updatedAt ?? nowIso,
    body: stored.body,
  };
}

/** 누적 SP → 단계. threshold는 config에 있으므로 밸런스 조정이 즉시 반영된다. */
export function stageForSp(totalSp: number): number {
  let stage = 0;
  GrowthConfig.stageThresholds.forEach((threshold, index) => {
    if (totalSp >= threshold) stage = index;
  });
  return Math.min(stage, MaxMuscleStage);
}

/** 다음 단계까지 남은 SP. 없으면(최종 단계) null. 진행도 표시용. */
export function spToNextStage(totalSp: number): number | null {
  const stage = stageForSp(totalSp);
  if (stage >= MaxMuscleStage) return null;
  return Math.max(0, GrowthConfig.stageThresholds[stage + 1] - totalSp);
}

/**
 * 하루 상한. 하드하게 끊지 않는다 — 상한까지는 그대로 쌓이고, 넘어간 만큼만 효율이
 * 떨어진다. 하루에 몰아서 운동해도 손해는 아니지만, 무한히 쌓이지도 않는다.
 */
export function applyDailySoftCap(alreadyToday: number, gain: number): number {
  const { softCapSpPerMuscle, overflowEfficiency } = GrowthConfig.dailyCap;
  const remaining = Math.max(0, softCapSpPerMuscle - alreadyToday);
  if (gain <= remaining) return gain;
  return remaining + (gain - remaining) * overflowEfficiency;
}

export interface GrowthApplication {
  state: DanbaekGrowthState;
  result: GrowthApplicationResult;
}

/**
 * 세션 하나의 계산 결과를 상태에 반영한다.
 *
 *  - 부위별로 하루 상한을 적용한 뒤 누적한다.
 *  - 단계는 threshold로 다시 계산하되, **한 세션에 한 단계까지만** 올라간다. 넘친 SP는
 *    사라지지 않고 그대로 남아 다음 세션에 반영된다("운동 한 번에 다른 몸" 방지).
 *  - pump는 상태에 저장하지 않고 결과로만 나간다 (영구 성장과 다른 값이다).
 */
export function applySessionSpToState(input: {
  state: DanbaekGrowthState;
  sessionId: string;
  spByMuscle: MuscleSpDistribution;
  pumpByMuscle: MuscleSpDistribution;
  nowIso: string;
}): GrowthApplication {
  const { state, sessionId, spByMuscle, pumpByMuscle, nowIso } = input;
  const today = growthDay(nowIso);

  // 날짜가 바뀌었으면 당일 집계는 통째로 리셋된다.
  const dailyBase: MuscleSpDistribution = state.daily.date === today ? { ...state.daily.spByMuscle } : {};

  const muscles = { ...state.muscles };
  const gainedSpByMuscle: MuscleSpDistribution = {};
  const previousStages = {} as Record<MuscleGroupDetail, number>;
  const currentStages = {} as Record<MuscleGroupDetail, number>;
  const stageChanges: MuscleStageChange[] = [];
  let totalSpGained = 0;

  for (const muscle of MuscleGroupDetails) {
    const before = muscles[muscle] ?? emptyMuscle();
    previousStages[muscle] = before.currentStage;

    const rawGain = spByMuscle[muscle] ?? 0;
    if (rawGain <= 0) {
      currentStages[muscle] = before.currentStage;
      continue;
    }

    const gain = round(applyDailySoftCap(dailyBase[muscle] ?? 0, rawGain));
    const totalSp = round(before.totalSp + gain);

    // threshold상으로는 두 단계가 올라갈 수 있어도 한 세션에는 한 단계까지만 반영한다.
    const naturalStage = stageForSp(totalSp);
    const cappedStage = Math.min(
      naturalStage,
      before.currentStage + GrowthConfig.stage.maxStagesPerSession
    );

    muscles[muscle] = {
      totalSp,
      currentStage: cappedStage,
      lastGainAt: nowIso,
    };
    dailyBase[muscle] = round((dailyBase[muscle] ?? 0) + gain);
    gainedSpByMuscle[muscle] = gain;
    currentStages[muscle] = cappedStage;
    totalSpGained += gain;

    if (cappedStage > before.currentStage) {
      stageChanges.push({
        muscle,
        group: MuscleDetailToGroup[muscle],
        previousStage: before.currentStage,
        currentStage: cappedStage,
      });
    }
  }

  const nextState: DanbaekGrowthState = {
    ...state,
    version: GrowthStateVersion,
    muscles,
    totalWorkoutSp: round(state.totalWorkoutSp + totalSpGained),
    daily: { date: today, spByMuscle: dailyBase },
    lastSessionId: sessionId,
    updatedAt: nowIso,
  };

  return {
    state: nextState,
    result: {
      sessionId,
      gainedSpByMuscle,
      previousStages,
      currentStages,
      stageChanges,
      pumpByMuscle,
      totalSpGained: round(totalSpGained),
    },
  };
}

/**
 * 하루 상한이 말하는 "하루"는 앱의 나머지(운동 기록 날짜/streak)와 같은 로컬 날짜다.
 * UTC로 자르면 자정 직후에 한 운동이 전날 몫으로 잡혀 상한 계산이 어긋난다.
 */
function growthDay(nowIso: string): string {
  return toDateString(new Date(nowIso));
}

function sumTotalSp(muscles: Record<MuscleGroupDetail, MuscleGrowthState>): number {
  return MuscleGroupDetails.reduce((sum, muscle) => sum + (muscles[muscle]?.totalSp ?? 0), 0);
}

function round(value: number): number {
  const factor = 10 ** GrowthConfig.sp.decimals;
  return Math.round(value * factor) / factor;
}
