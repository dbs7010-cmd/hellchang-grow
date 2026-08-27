import type { WorkoutRecord } from '@/types/workout';
import { countCompletedExercises, countCompletedSets, effectiveSetDetails, sumVolumeKg } from '@/utils/workout-stats';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 저장된 운동 기록 하나를 사람이 읽는 모양으로.
 *
 * 결과 화면을 닫고 나면 내가 무엇을 얼마나 들었는지 다시 볼 곳이 앱에 없었다. 그래서
 * 기록 화면들이 "가슴 세션 · 3분 · 운동 2개 · 3세트" 한 줄만 보여주고 끝났다.
 *
 * 여기서 하는 일은 **이미 저장된 값을 옮겨 적는 것**뿐이다:
 *  - 없는 값을 추정하지 않는다. 세트 상세가 없는 옛 기록은 없는 대로 요약만 보여준다.
 *  - 세트 판정 기준을 새로 만들지 않는다 — 화면 어디서나 같은 `effectiveSetDetails`를 쓴다.
 *  - 통계를 새로 계산하지 않는다. 히스토리가 쓰던 함수를 그대로 부른다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WorkoutRecordSetLine {
  /** 1부터 시작하는 세트 번호. 저장된 순서 그대로다. */
  order: number;
  weightKg?: number;
  reps?: number;
}

export interface WorkoutRecordExerciseDetail {
  id: string;
  name: string;
  /** 세트별 상세가 저장돼 있으면 그 목록. 옛 기록이면 빈 배열이다. */
  sets: WorkoutRecordSetLine[];
  /**
   * 이 종목 하나의 합계. 위 `sets`를 그대로 더한 값이라 화면이 다시 세지 않는다 —
   * 중량이나 횟수가 없는 세트는 볼륨에 들어가지 않는다(없는 값을 0으로 치지 않는다).
   * 세트 상세가 없는 옛 기록은 둘 다 0이고, 그때는 화면이 이 값을 쓰지 않는다.
   */
  totals: { sets: number; volumeKg: number };
  /**
   * 세트 상세가 없는 옛 기록의 요약 한 줄. 상세가 있으면 null —
   * 같은 내용을 두 번 말하지 않는다.
   */
  legacySummary: string | null;
}

export interface WorkoutRecordDetail {
  id: string;
  date: string;
  title: string;
  durationMinutes?: number;
  memo?: string;
  totals: { exercises: number; sets: number; volumeKg: number };
  exercises: WorkoutRecordExerciseDetail[];
  /** 보여줄 종목이 하나도 없을 때 화면이 쓸 안내. 있으면 null. */
  emptyLine: string | null;
}

/** 옛 기록(sets/reps/weightKg 요약)만 있을 때 쓸 한 줄. 없는 값은 말하지 않는다. */
function legacySummaryLine(input: { sets?: number; reps?: number; weightKg?: number }): string | null {
  const parts: string[] = [];
  if (input.sets !== undefined && input.sets > 0) parts.push(`${input.sets}세트`);
  if (input.weightKg !== undefined) parts.push(`${input.weightKg}kg`);
  if (input.reps !== undefined) parts.push(`${input.reps}회`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function buildWorkoutRecordDetail(record: WorkoutRecord): WorkoutRecordDetail {
  const exercises: WorkoutRecordExerciseDetail[] = (record.exercises ?? []).map((exercise) => {
    const completed = effectiveSetDetails(exercise) ?? [];
    return {
      id: exercise.id,
      name: exercise.name,
      sets: completed.map((set, index) => ({
        order: index + 1,
        weightKg: set.weightKg,
        reps: set.reps,
      })),
      totals: {
        sets: completed.length,
        volumeKg: completed.reduce(
          (sum, set) =>
            set.weightKg !== undefined && set.reps !== undefined ? sum + set.weightKg * set.reps : sum,
          0
        ),
      },
      legacySummary:
        completed.length > 0
          ? null
          : legacySummaryLine({ sets: exercise.sets, reps: exercise.reps, weightKg: exercise.weightKg }),
    };
  });

  // 담기만 하고 한 세트도 하지 않은 종목은 보여줄 것이 없다.
  const shown = exercises.filter((exercise) => exercise.sets.length > 0 || exercise.legacySummary !== null);

  return {
    id: record.id,
    date: record.date,
    title: record.title,
    durationMinutes: record.durationMinutes,
    memo: record.memo,
    totals: {
      exercises: countCompletedExercises(record),
      sets: countCompletedSets(record),
      volumeKg: sumVolumeKg([record]),
    },
    exercises: shown,
    emptyLine: shown.length === 0 ? '이 기록에는 저장된 세트 상세가 없어요.' : null,
  };
}

/**
 * 방금 끝낸 세션이 남긴 **저장된 기록**을 찾는다.
 *
 * 결과 화면은 요약을 메모리에 들고 있을 뿐이라, "지금 화면에 보이는 숫자"와 "히스토리에
 * 남은 기록"이 같은 것인지 사용자가 확인할 방법이 없었다. 세션 ID는 이미 기록에 저장돼
 * 있으므로(`WorkoutRecord.sessionId`) 여기서는 **읽어서 찾기만 한다** — 완료 파이프라인,
 * 영수증, 보상 계산은 이 함수와 아무 관계가 없다.
 *
 * 찾지 못하면 null이다. 없는 기록을 만들어 내거나 "비슷한 날짜"로 추측하지 않는다.
 */
export function findWorkoutRecordForSession(
  records: WorkoutRecord[],
  sessionId: string | undefined
): WorkoutRecord | null {
  if (!sessionId) return null;
  return records.find((record) => record.sessionId === sessionId) ?? null;
}
