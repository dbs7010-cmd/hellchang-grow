import { readJSON, writeJSON } from '@/services/storage/local-storage';

const HOME_GYM_KEY = 'hellchang.homeGymState.v1';

export const HOME_GYM_REWARD_PER_WORKOUT = 10;
export const STARTER_RACK_COST = 30;

export interface HomeGymState {
  spentCoins: number;
  ownedItemIds: string[];
}

const EMPTY_STATE: HomeGymState = { spentCoins: 0, ownedItemIds: [] };

export async function getHomeGymState(): Promise<HomeGymState> {
  const stored = await readJSON<Partial<HomeGymState>>(HOME_GYM_KEY);
  if (!stored) return EMPTY_STATE;
  return {
    spentCoins: Number.isFinite(stored.spentCoins) && (stored.spentCoins ?? 0) >= 0 ? stored.spentCoins! : 0,
    ownedItemIds: Array.isArray(stored.ownedItemIds)
      ? stored.ownedItemIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function earnedHomeGymCoins(completedWorkoutCount: number): number {
  return Math.max(0, Math.floor(completedWorkoutCount)) * HOME_GYM_REWARD_PER_WORKOUT;
}

export function availableHomeGymCoins(state: HomeGymState, completedWorkoutCount: number): number {
  return Math.max(0, earnedHomeGymCoins(completedWorkoutCount) - state.spentCoins);
}

export async function buyStarterRack(
  state: HomeGymState,
  completedWorkoutCount: number
): Promise<HomeGymState | null> {
  if (state.ownedItemIds.includes('starter-dumbbell-rack')) return state;
  if (availableHomeGymCoins(state, completedWorkoutCount) < STARTER_RACK_COST) return null;

  const next: HomeGymState = {
    spentCoins: state.spentCoins + STARTER_RACK_COST,
    ownedItemIds: [...state.ownedItemIds, 'starter-dumbbell-rack'],
  };
  await writeJSON(HOME_GYM_KEY, next);
  return next;
}
