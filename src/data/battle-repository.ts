import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import type { BattleState } from '@/types/battle';
import { createInitialBattleState, migrateBattleState } from '@/utils/battle-state';

/**
 * Battle 게임 상태의 영속화. 기존 repository들과 같은 방식(AsyncStorage + JSON)을 그대로
 * 쓴다 — Battle만을 위한 별도 저장 기술을 도입하지 않는다.
 *
 * 저장된 값이 없으면(첫 실행) 초기 상태를, 손상됐거나 옛 스키마면 `migrateBattleState()`가
 * 보정한 값을 돌려준다. 어느 쪽이든 호출부는 항상 완전하고 안전한 상태를 받는다.
 *
 * 운동 기록/성장 상태와 **다른 키**에 저장한다. Battle 저장이 실패해도 그 둘은 이미
 * 확정된 뒤이고 서로를 참조하지 않으므로 되돌아갈 수 없다.
 */
export async function getBattleState(): Promise<BattleState> {
  const stored = await readJSON<Partial<BattleState>>(StorageKeys.battleState);
  return migrateBattleState(stored);
}

export async function saveBattleState(state: BattleState): Promise<void> {
  await writeJSON(StorageKeys.battleState, state);
}

export function createDefaultBattleState(): BattleState {
  return createInitialBattleState();
}
