import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import type { BattleProgressionState } from '@/types/battle';
import {
  createInitialBattleProgression,
  migrateBattleProgression,
} from '@/utils/battle-state';

/**
 * Battle 진행 문서(전투 상태 + 게임 재화)의 영속화. 기존 repository들과 같은 방식
 * (AsyncStorage + JSON)을 그대로 쓴다 — Battle만을 위한 별도 저장 기술을 도입하지 않는다.
 *
 * **키 하나에 통째로 쓴다.** 저장소가 주는 원자성 단위가 "키 하나 쓰기"뿐이라, 진행도와
 * 재화를 다른 키로 나누면 그 사이에서 앱이 죽었을 때 한쪽만 반영된 상태가 남는다 —
 * 보상이 사라지거나 두 번 들어가는 바로 그 문제다. 한 문서면 전부 아니면 전무다.
 *
 * 저장된 값이 없으면(첫 실행) 초기 문서를, 손상됐거나 옛 스키마(경제가 없던 시절의
 * BattleState)면 `migrateBattleProgression()`이 보정한 값을 돌려준다.
 *
 * 운동 기록/성장 상태와는 **다른 키**다. Battle 저장이 실패해도 그 둘은 이미 확정된
 * 뒤이고 서로를 참조하지 않으므로 되돌아갈 수 없다.
 */
export async function getBattleProgression(): Promise<BattleProgressionState> {
  const stored = await readJSON<Partial<BattleProgressionState>>(StorageKeys.battleState);
  return migrateBattleProgression(stored);
}

export async function saveBattleProgression(progression: BattleProgressionState): Promise<void> {
  await writeJSON(StorageKeys.battleState, progression);
}

export function createDefaultBattleProgression(): BattleProgressionState {
  return createInitialBattleProgression();
}
