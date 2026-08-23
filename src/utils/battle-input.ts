import type { BattleInput } from '@/types/battle';
import type { SessionCompletionResultSnapshot } from '@/types/session-completion';
import type { WorkoutRecord } from '@/types/workout';
import { countCompletedSets, sumVolumeKg } from '@/utils/workout-stats';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BATTLE INPUT — 완료된 운동 → Battle 경계
 *
 * **운동을 아는 유일한 Battle 파일이다.** resolver(`utils/battle.ts`)는 여기서 만든
 * 숫자만 받고 운동 타입을 전혀 모른다. 그래서 Battle 쪽 변경이 운동/성장 코드로 번지지 않는다.
 *
 * 두 가지 원칙:
 *  1. **진행 중인 세션을 참조하지 않는다.** 성공적으로 완료된 결과에서만 만든다 —
 *     세션은 아직 바뀔 수 있고, 바뀌는 값으로 게임 진행을 주면 중복/유실이 생긴다.
 *  2. **새 계산식을 만들지 않는다.** completion pipeline이 이미 확정한 값을 그대로 쓰고,
 *     저장된 기록에서 만들 때만 기존 헬퍼(countCompletedSets/sumVolumeKg)를 재사용한다.
 *
 * 원본 스냅샷/기록은 읽기만 한다 — 어느 경로에서도 mutate하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 세션 완료 파이프라인이 확정한 스냅샷에서 만든다. **이 경로가 기본이다** —
 * completedSets/totalVolumeKg는 기록/보상과 같은 근거로 이미 계산돼 있어서, 여기서
 * 다시 세거나 합할 이유가 없다.
 */
export function battleInputFromCompletion(
  snapshot: SessionCompletionResultSnapshot
): BattleInput | null {
  const workoutId = snapshot?.sessionResult?.sessionId;
  if (typeof workoutId !== 'string' || workoutId.length === 0) return null;

  return Object.freeze({
    workoutId,
    completedSetCount: snapshot.completedSets,
    totalVolumeKg: snapshot.totalVolumeKg,
  });
}

/**
 * 저장된 WorkoutRecord에서 만든다 — 앱을 껐다 켠 뒤 밀린 운동을 따라잡는 재시도 경로다.
 *
 * sessionId가 없는 기록(수동 입력, 옛 기록)은 **null**이다. idempotency key가 없으면 같은
 * 운동을 두 번 반영하지 않을 방법이 없으므로, 애초에 Battle에 넣지 않는다.
 *
 * 세트 수와 볼륨은 히스토리 통계와 같은 헬퍼로 구한다 — 무효 세트(횟수 없음/0회) 판정도
 * 그쪽 규칙(isEffectiveSet)을 그대로 따라가므로 화면과 게임이 다른 숫자를 보지 않는다.
 */
export function battleInputFromWorkoutRecord(record: WorkoutRecord): BattleInput | null {
  const workoutId = record?.sessionId;
  if (typeof workoutId !== 'string' || workoutId.length === 0) return null;

  return Object.freeze({
    workoutId,
    completedSetCount: countCompletedSets(record),
    totalVolumeKg: sumVolumeKg([record]),
  });
}
