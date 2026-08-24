import { StorageKeys } from '@/services/storage/keys';
import { readJSON, writeJSON } from '@/services/storage/local-storage';
import { TrainerUsageState } from '@/types/ads';
import {
  AiTicketReservation,
  createAiTicketCoordinator,
} from '@/utils/ai-ticket-transaction';

const defaultTrainerUsageState: TrainerUsageState = {
  rewardedPtUsesRemaining: 0,
};

const coordinator = createAiTicketCoordinator({
  async read() {
    return (await readJSON<TrainerUsageState>(StorageKeys.trainerUsageState)) ?? defaultTrainerUsageState;
  },
  async write(state) {
    await writeJSON(StorageKeys.trainerUsageState, state);
  },
});

export async function getTrainerUsageState(): Promise<TrainerUsageState> {
  return coordinator.getState();
}

export async function grantRewardedPtUses(units: number): Promise<TrainerUsageState> {
  return coordinator.grant(units, new Date().toISOString());
}

export async function reserveRewardedPtUse(): Promise<AiTicketReservation | null> {
  return coordinator.reserve();
}

export async function commitRewardedPtUse(
  reservation: AiTicketReservation
): Promise<TrainerUsageState | null> {
  return coordinator.commit(reservation);
}

export async function releaseRewardedPtUse(reservation: AiTicketReservation): Promise<void> {
  await coordinator.release(reservation);
}
