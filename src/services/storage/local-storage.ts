import AsyncStorage from '@react-native-async-storage/async-storage';

import { readStoredJson } from '@/utils/stored-state';

export async function readJSON<T>(key: string): Promise<T | null> {
  return readStoredJson<T>(() => AsyncStorage.getItem(key));
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearAllKeys(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}
