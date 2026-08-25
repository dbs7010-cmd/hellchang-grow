import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { StorageKeys } from '@/services/storage/keys';

export const HOME_GYM_REWARD_PER_WORKOUT = 10;

export const HomeGymItemIds = {
  starterRack: 'starter-dumbbell-rack',
} as const;

export type HomeGymItemId = (typeof HomeGymItemIds)[keyof typeof HomeGymItemIds];

export interface HomeGymItemDefinition {
  id: HomeGymItemId;
  name: string;
  cost: number;
}

export const HOME_GYM_ITEMS: readonly HomeGymItemDefinition[] = [
  { id: HomeGymItemIds.starterRack, name: '덤벨 랙', cost: 30 },
];

export const STARTER_RACK_COST = HOME_GYM_ITEMS[0].cost;

export interface HomeGymState {
  spentCoins: number;
  ownedItemIds: HomeGymItemId[];
  placedItemIds: HomeGymItemId[];
}

const EMPTY_STATE: HomeGymState = { spentCoins: 0, ownedItemIds: [], placedItemIds: [] };
const KNOWN_ITEM_IDS = new Set<string>(HOME_GYM_ITEMS.map((item) => item.id));

function sanitizeItemIds(value: unknown): HomeGymItemId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is HomeGymItemId => typeof id === 'string' && KNOWN_ITEM_IDS.has(id)))];
}

export async function getHomeGymState(): Promise<HomeGymState> {
  const stored = await readJSON<Partial<HomeGymState>>(StorageKeys.homeGymState);
  if (!stored) return EMPTY_STATE;

  const ownedItemIds = sanitizeItemIds(stored.ownedItemIds);
  // 이전 vertical slice에는 placedItemIds가 없었다. 이미 산 아이템은 홈에 배치됐다고 표시했으므로
  // 마이그레이션에서도 그 계약을 보존한다.
  const placedItemIds = stored.placedItemIds === undefined
    ? [...ownedItemIds]
    : sanitizeItemIds(stored.placedItemIds).filter((id) => ownedItemIds.includes(id));

  return {
    spentCoins: Number.isFinite(stored.spentCoins) && (stored.spentCoins ?? 0) >= 0 ? stored.spentCoins! : 0,
    ownedItemIds,
    placedItemIds,
  };
}

export function earnedHomeGymCoins(completedWorkoutCount: number): number {
  return Math.max(0, Math.floor(completedWorkoutCount)) * HOME_GYM_REWARD_PER_WORKOUT;
}

export function availableHomeGymCoins(state: HomeGymState, completedWorkoutCount: number): number {
  return Math.max(0, earnedHomeGymCoins(completedWorkoutCount) - state.spentCoins);
}

export function getHomeGymItem(id: HomeGymItemId): HomeGymItemDefinition {
  const item = HOME_GYM_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown home gym item: ${id}`);
  return item;
}

export async function buyHomeGymItem(
  state: HomeGymState,
  completedWorkoutCount: number,
  itemId: HomeGymItemId
): Promise<HomeGymState | null> {
  if (state.ownedItemIds.includes(itemId)) return state;
  const item = getHomeGymItem(itemId);
  if (availableHomeGymCoins(state, completedWorkoutCount) < item.cost) return null;

  const next: HomeGymState = {
    spentCoins: state.spentCoins + item.cost,
    ownedItemIds: [...state.ownedItemIds, itemId],
    // V1은 구매 즉시 배치한다. 별도 편집 모드를 만들지 않아 홈의 핵심 CTA를 방해하지 않는다.
    placedItemIds: [...state.placedItemIds, itemId],
  };
  await writeJSON(StorageKeys.homeGymState, next);
  return next;
}

export async function buyStarterRack(
  state: HomeGymState,
  completedWorkoutCount: number
): Promise<HomeGymState | null> {
  return buyHomeGymItem(state, completedWorkoutCount, HomeGymItemIds.starterRack);
}
