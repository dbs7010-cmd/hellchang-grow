import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import type { DanbaekGrowthState } from '@/types/growth';
import { asStoredGrowthState } from '@/utils/stored-state';
import { createDefaultGrowthState, migrateGrowthState } from '@/utils/growth-state';

/**
 * 부위별 성장 상태의 영속화. 기존 repository들과 같은 방식(AsyncStorage + JSON)을 그대로
 * 쓴다 — 성장만을 위한 별도 저장 기술을 도입하지 않는다.
 *
 * 저장된 값이 없으면(첫 실행) 기본 상태를 만들어 돌려주고, 예전 스키마로 저장돼 있으면
 * `migrateGrowthState()`가 빠진 필드만 채운다. 어느 쪽이든 호출부는 항상 완전한 상태를 받는다.
 */
export async function getGrowthState(): Promise<DanbaekGrowthState> {
  // 읽을 수 없는 필드는 여기서 없는 값으로 만든다 — 그래야 migrate의 기존 기본값 규칙이
  // 그대로 적용되고, NaN 같은 값이 다음 저장으로 굳어지지 않는다.
  const stored = asStoredGrowthState(await readJSON<unknown>(StorageKeys.growthState));
  return migrateGrowthState(stored as Partial<DanbaekGrowthState> | null, new Date().toISOString());
}

export async function saveGrowthState(state: DanbaekGrowthState): Promise<void> {
  await writeJSON(StorageKeys.growthState, state);
}

export function createInitialGrowthState(): DanbaekGrowthState {
  return createDefaultGrowthState(new Date().toISOString());
}
