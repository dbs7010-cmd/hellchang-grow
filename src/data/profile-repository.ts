import { StorageKeys } from '@/services/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/services/storage/local-storage';
import { UserProfile } from '@/types/user';

export async function getUserProfile(): Promise<UserProfile | null> {
  return readJSON<UserProfile>(StorageKeys.userProfile);
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await writeJSON(StorageKeys.userProfile, profile);
}

export async function clearUserProfile(): Promise<void> {
  await removeKey(StorageKeys.userProfile);
}

export async function getOnboardingComplete(): Promise<boolean> {
  const value = await readJSON<boolean>(StorageKeys.onboardingComplete);
  return value ?? false;
}

export async function setOnboardingComplete(complete: boolean): Promise<void> {
  await writeJSON(StorageKeys.onboardingComplete, complete);
}
