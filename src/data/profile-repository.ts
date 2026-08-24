import { StorageKeys } from '@/services/storage/keys';
import { readJSON, removeKey, writeJSON } from '@/services/storage/local-storage';
import { UserProfile } from '@/types/user';
import { isOnboardingComplete, isUsableProfile } from '@/utils/stored-state';

export async function getUserProfile(): Promise<UserProfile | null> {
  const stored = await readJSON<unknown>(StorageKeys.userProfile);
  return isUsableProfile(stored) ? stored : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await writeJSON(StorageKeys.userProfile, profile);
}

export async function clearUserProfile(): Promise<void> {
  await removeKey(StorageKeys.userProfile);
}

/**
 * 온보딩 완료 플래그. **정확히 true일 때만 완료로 본다.**
 *
 * `?? false`만으로는 부족하다 — 손상된 값이 객체나 문자열이면 truthy로 통과해서,
 * 프로필도 없는 사용자가 온보딩을 건너뛰고 빈 홈 화면에 갇힌다. 그 상태에서는
 * 온보딩으로 돌아갈 방법도 없다.
 */
export async function getOnboardingComplete(): Promise<boolean> {
  return isOnboardingComplete(await readJSON<unknown>(StorageKeys.onboardingComplete));
}

export async function setOnboardingComplete(complete: boolean): Promise<void> {
  await writeJSON(StorageKeys.onboardingComplete, complete);
}
