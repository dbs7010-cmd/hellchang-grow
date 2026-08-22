import { getResolvedExerciseById } from '@/config/exercises';
import { getGrowthState, saveGrowthState } from '@/data/growth-repository';
import type { GrowthEngine } from '@/services/growth/growth-engine';
import type { WorkoutSessionResult } from '@/types/growth';
import { calculateSessionMuscleSp } from '@/utils/growth-calculation';
import { buildSpExerciseInputs } from '@/utils/growth-inputs';
import { applySessionSpToState } from '@/utils/growth-state';

/**
 * V1 GrowthEngine — 로컬 계산 + 로컬 저장.
 *
 * 이 파일이 하는 일은 조립뿐이다:
 *   세션 결과 → (Exercise DB 조회) → 순수 계산 → 순수 상태 반영 → 저장 → 결과 반환
 *
 * 계산 규칙은 `utils/growth-calculation.ts`, 누적/단계/상한은 `utils/growth-state.ts`,
 * 밸런스 숫자는 `config/growth-config.ts`에 있다. 여기에는 숫자도 규칙도 두지 않는다.
 *
 * 경계:
 *  - 돌려주는 것은 **게임 진행도(부위별 SP)**다. 실제 체중/체지방률/골격근량을 만들거나
 *    바꾸지 않으며, 캐릭터 외형 파라미터로 흘러 들어가는 경로도 만들지 않는다.
 *  - PASS XP(Account Level)와 Muscle SP는 서로의 alias가 아니다. 한 번의 운동으로 각각
 *    따로 계산된다.
 *  - 지방/식단 축(FatEngine)은 아직 없다. 생기더라도 근육 SP 계산과 섞이지 않고,
 *    `DanbaekGrowthState.body`에 독립적으로 들어온다.
 */
export const localGrowthEngine: GrowthEngine = {
  async applySessionResult(result: WorkoutSessionResult) {
    const exercises = buildSpExerciseInputs(result, getResolvedExerciseById);
    if (exercises.length === 0) return null;

    const state = await getGrowthState();
    // 같은 세션이 두 번 들어와도(재시도/중복 호출) SP가 두 번 쌓이지 않는다.
    if (state.lastSessionId === result.sessionId) {
      return state.pendingCompletionResult?.sessionId === result.sessionId
        ? state.pendingCompletionResult
        : null;
    }

    const calculation = calculateSessionMuscleSp({
      exercises,
      bodyWeightKg: result.bodyWeightKg,
    });

    const applied = applySessionSpToState({
      state,
      sessionId: result.sessionId,
      spByMuscle: calculation.spByMuscle,
      pumpByMuscle: calculation.pumpByMuscle,
      nowIso: result.endedAt || new Date().toISOString(),
    });

    await saveGrowthState({
      ...applied.state,
      pendingCompletionResult: applied.result,
    });
    return applied.result;
  },
};
