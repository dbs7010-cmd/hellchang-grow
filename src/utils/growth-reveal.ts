import { CharacterBodyConfig, type DanbaekApprovedRegion } from '@/config/character-body-config';
import { GrowthConfig, MaxMuscleStage } from '@/config/growth-config';
import { MuscleGroupDetailLabels, MuscleGroupLabels } from '@/config/muscle-groups';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { MuscleGroupDetails, type MuscleGroup, type MuscleGroupDetail } from '@/types/exercise';
import type {
  DanbaekGrowthState,
  GrowthApplicationResult,
  MuscleStageChange,
} from '@/types/growth';

export interface GrowthRevealMuscle {
  muscle: MuscleGroupDetail;
  label: string;
  gainedSp: number;
  previousStage: number;
  currentStage: number;
  stageChanged: boolean;
  progressBefore: number;
  progressAfter: number;
  isMaxStage: boolean;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function stageProgress(totalSp: number, stage: number): number {
  if (stage >= MaxMuscleStage) return 1;
  const floor = GrowthConfig.stageThresholds[stage];
  const ceiling = GrowthConfig.stageThresholds[stage + 1];
  return clamp01((totalSp - floor) / (ceiling - floor));
}

/** Existing GrowthEngine output -> Result-only view model. No SP or stage is recalculated. */
export function buildGrowthRevealMuscles(input: {
  growth: GrowthApplicationResult | null;
  growthAfter: DanbaekGrowthState;
}): GrowthRevealMuscle[] {
  const { growth, growthAfter } = input;
  if (!growth) return [];

  return MuscleGroupDetails.flatMap((muscle) => {
    const gainedSp = growth.gainedSpByMuscle[muscle] ?? 0;
    if (!(gainedSp > 0)) return [];
    const previousStage = growth.previousStages[muscle];
    const currentStage = growth.currentStages[muscle];
    const totalAfter = growthAfter.muscles[muscle]?.totalSp ?? gainedSp;
    const totalBefore = Math.max(0, totalAfter - gainedSp);
    return [{
      muscle,
      label: MuscleGroupDetailLabels[muscle],
      gainedSp,
      previousStage,
      currentStage,
      stageChanged: currentStage > previousStage,
      progressBefore: stageProgress(totalBefore, previousStage),
      progressAfter: stageProgress(totalAfter, currentStage),
      isMaxStage: currentStage >= MaxMuscleStage,
    }];
  }).sort((a, b) => b.gainedSp - a.gainedSp);
}

export function hasPermanentBodyChange(
  before: DanbaekBodyParameters,
  after: DanbaekBodyParameters
): boolean {
  return (Object.keys(before) as (keyof DanbaekBodyParameters)[]).some(
    (key) => before[key] !== after[key]
  );
}

// ── Result reveal 순서 ──────────────────────────────────────────────────────

export type GrowthRevealPhase = 'pump' | 'before' | 'after';

/**
 * Result가 거치는 단계. **항상 실제(영구) 몸으로 끝난다.**
 *
 * 영구 변화가 있으면 BEFORE → PUMP → AFTER로 간다. 영구 변화가 없는 날에는 BEFORE가
 * AFTER와 같은 그림이라 건너뛰고 PUMP → AFTER다. 어느 쪽이든 펌핑으로 끝내지 않는다 —
 * 부푼 몸을 오늘의 결과로 이해한 뒤 홈에서 작아진 몸을 보면 혼란스럽기 때문이다.
 *
 * 순수 함수다. 새 BodyParameters를 만들지 않고 어떤 스냅샷을 보여줄지 순서만 정한다.
 */
export function buildGrowthRevealSequence(input: {
  permanentChanged: boolean;
  reducedMotion: boolean;
}): GrowthRevealPhase[] {
  // 모션을 줄인 사용자는 연출 없이 결론(실제 몸)만 본다.
  if (input.reducedMotion) return ['after'];
  // 영구 변화가 있으면 운동 전 → 펌핑 → 지금 순서다: 비교 기준(BEFORE)이 먼저 서야
  // 마지막 AFTER가 "이번 운동이 반영된 몸"으로 읽힌다.
  // 변화가 없는 날에는 BEFORE가 AFTER와 같은 그림이라 건너뛴다(빈 단계를 만들지 않는다).
  return input.permanentChanged ? ['before', 'pump', 'after'] : ['pump', 'after'];
}

/** 각 단계에서 그릴 몸. 전부 세션 완료 스냅샷에 이미 있는 값이며 다시 계산하지 않는다. */
export function revealBodyParameters(
  phase: GrowthRevealPhase,
  snapshot: {
    bodyParametersWithPump: DanbaekBodyParameters;
    bodyParametersBefore: DanbaekBodyParameters;
    bodyParametersAfter: DanbaekBodyParameters;
  }
): DanbaekBodyParameters {
  if (phase === 'pump') return snapshot.bodyParametersWithPump;
  if (phase === 'before') return snapshot.bodyParametersBefore;
  return snapshot.bodyParametersAfter;
}

/**
 * 이번 운동으로 **실제로 단계가 오른 부위**만 한 줄로 모은다. 없으면 null —
 * 화면은 그때 성장 문구를 아예 띄우지 않는다.
 *
 * SP만 쌓이고 단계가 그대로면 여기서 아무것도 만들지 않는다. "성장!"은 저장된 stage가
 * 실제로 바뀐 경우에만 쓰는 말이고, 진행 중인 SP는 부위별 목록이 이미 그대로 보여준다.
 * 새 수치를 만들지 않고 GrowthApplicationResult.stageChanges만 읽는다.
 */
export function buildGrowthHighlight(stageChanges: MuscleStageChange[]): string | null {
  const groups = [...new Set(stageChanges.map((change) => MuscleGroupLabels[change.group]))];
  if (groups.length === 0) return null;
  const shown = groups.slice(0, 2).join(' · ');
  const rest = groups.length - 2;
  return rest > 0 ? shown + ' 외 ' + rest + '곳 성장!' : shown + ' 성장!';
}

// ── 실제 성장 BEFORE ↔ AFTER 비교 카메라 ────────────────────────────────────

/**
 * 비교 화면에서 어디를 당겨 볼지. **성장 판정이 아니다** — 어떤 부위가 실제로 올랐는지는
 * GrowthEngine이 이미 정했고(`stageChanges`), 여기서는 그 결과를 보고 카메라 방향만 고른다.
 */
export type GrowthFocus = 'upper' | 'lower' | 'core' | 'full';

export const GrowthFocusLabels: Record<GrowthFocus, string> = {
  upper: '상체',
  lower: '하체',
  core: '코어',
  full: '전신',
};

/** 사용자에게 보여주는 부위 묶음 → 카메라 방향. 새 부위 분류를 만들지 않는다. */
const FocusByMuscleGroup: Record<MuscleGroup, GrowthFocus> = {
  chest: 'upper',
  back: 'upper',
  shoulders: 'upper',
  arms: 'upper',
  legs: 'lower',
  core: 'core',
  fullBody: 'full',
};

/** 각 방향이 담아야 하는 CANON 승인 영역. 좌표는 전부 CharacterBodyConfig에서만 읽는다. */
const FocusRegions: Record<GrowthFocus, DanbaekApprovedRegion[]> = {
  upper: ['shoulder', 'chest', 'back', 'arm'],
  lower: ['glute', 'thigh', 'calf'],
  core: ['waist', 'abs'],
  full: ['shoulder', 'arm', 'thigh', 'calf'],
};

/**
 * 머리 윗선. CANON headPath가 시작하는 y와 같은 값이며, 상체/전신을 당길 때 머리가
 * 잘리지 않도록 카메라가 참고만 한다 — CANON 체형을 바꾸는 값이 아니다.
 */
const CanonHeadTopY = 38;

/** 비교 창 높이(px). 두 몸이 같은 창을 쓰므로 이 값도 BEFORE/AFTER 공통이다. */
export const GrowthComparisonViewportHeight = 180;
/** 확대 상한. 이 이상 당기면 몸의 일부만 남아 무엇을 보고 있는지 알 수 없다. */
const GrowthComparisonMaxZoom = 2.4;
/** 초점 영역 위아래로 남기는 여백(viewBox 단위). */
const GrowthComparisonPaddingY = 4;

export interface GrowthComparisonCamera {
  focus: GrowthFocus;
  /** '상체' 처럼 사람에게 보여줄 이름 */
  label: string;
  /** 확대 배율. BEFORE/AFTER가 같은 값을 쓴다. */
  zoom: number;
  /** 클리핑되는 비교 창의 높이(px) */
  viewportHeight: number;
  /** 창 안에서 캐릭터를 그릴 높이(px). CANON viewBox 원본 높이 그대로다. */
  characterHeight: number;
  /** 초점 부위를 창 한가운데 놓기 위한 세로 이동(px) */
  translateY: number;
}

/**
 * 이번 세션에서 **실제로 단계가 오른 부위**를 보고 카메라 방향을 고른다.
 * 단계 변화가 없으면 null이다 — 확대 비교 자체가 존재하지 않는다.
 *
 * 서로 다른 방향이 함께 올랐거나 알 수 없는 묶음이면 전신으로 떨어진다.
 */
export function resolveGrowthFocus(stageChanges: MuscleStageChange[]): GrowthFocus | null {
  if (stageChanges.length === 0) return null;
  const focuses = new Set(stageChanges.map((change) => FocusByMuscleGroup[change.group] ?? 'full'));
  if (focuses.size !== 1) return 'full';
  return [...focuses][0];
}

/**
 * 초점 방향 하나에 대한 카메라. **순수 함수이고 인자가 같으면 결과도 같다** —
 * BEFORE와 AFTER가 같은 값을 받는다는 보장이 여기서 나온다.
 *
 * BodyParameters를 인자로 받지 않는다는 점이 핵심이다: 카메라는 몸의 수치를 읽지도,
 * 만들지도, 바꾸지도 않는다. 화면에서 어디를 얼마나 당겨 볼지만 정한다.
 */
export function buildGrowthComparisonCamera(focus: GrowthFocus): GrowthComparisonCamera {
  const { regions, stage0BodyProportion, viewBox } = CharacterBodyConfig;
  // CANON이 몸 전체에 걸어 두는 비율 보정. 화면에 실제로 찍히는 y를 알아야 초점이 맞는다.
  const toVisualY = (y: number) =>
    stage0BodyProportion.anchorY + (y - stage0BodyProportion.anchorY) * stage0BodyProportion.scaleY;

  const rects = FocusRegions[focus].map((region) => regions[region]);
  const includesHead = focus === 'upper' || focus === 'full';
  const top =
    (includesHead ? CanonHeadTopY : Math.min(...rects.map((rect) => toVisualY(rect.y)))) -
    GrowthComparisonPaddingY;
  const bottom =
    Math.max(...rects.map((rect) => toVisualY(rect.y + rect.height))) + GrowthComparisonPaddingY;

  const zoom =
    Math.round(Math.min(GrowthComparisonMaxZoom, GrowthComparisonViewportHeight / (bottom - top)) * 1000) / 1000;
  const centerY = (top + bottom) / 2;
  const characterHeight = viewBox.height;
  // 캐릭터 박스는 자기 중심을 기준으로 확대되므로, 그 중심에서 초점까지의 거리만큼 되민다.
  const half = characterHeight / 2;
  const translateY =
    Math.round((GrowthComparisonViewportHeight / 2 - half - (centerY - half) * zoom) * 100) / 100;

  return {
    focus,
    label: GrowthFocusLabels[focus],
    zoom,
    viewportHeight: GrowthComparisonViewportHeight,
    characterHeight,
    translateY,
  };
}

/**
 * Result의 실제 성장 비교에 쓸 카메라. 단계 변화가 없으면 null —
 * 그때는 확대 비교를 만들지 않고 기존 전신 비교 그대로 둔다.
 */
export function resolveGrowthComparisonCamera(
  stageChanges: MuscleStageChange[]
): GrowthComparisonCamera | null {
  const focus = resolveGrowthFocus(stageChanges);
  return focus ? buildGrowthComparisonCamera(focus) : null;
}
