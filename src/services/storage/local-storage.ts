import AsyncStorage from '@react-native-async-storage/async-storage';
import { asStoredArray, parseStoredJson } from '@/utils/stored-state';

/**
 * 저장된 값 하나를 읽는다.
 *
 * **손상된 값 하나가 앱 전체를 막지 않는다.** 쓰기 도중 앱이 강제 종료되면 값이 잘린 채로
 * 남을 수 있고, 그때 `JSON.parse`가 던진다. 그 예외가 부팅 경로까지 올라가면 앱은 영원히
 * 빈 화면에 머물고 사용자가 할 수 있는 일은 재설치뿐이다 — 다른 키에 멀쩡히 남아 있는
 * 운동 기록까지 함께 잃는다.
 *
 * 그래서 읽지 못한 값은 "없는 값"으로 취급하고 null을 돌려준다. 호출부(repository)는 이미
 * null에 대한 기본값을 갖고 있으므로, 손상 범위가 그 키 하나로 격리된다.
 *
 * 손상된 값을 **지우지는 않는다.** 파싱하지 못했을 뿐 사용자의 데이터이고, 삭제해서 얻는
 * 것이 없다. 다음 쓰기가 자연스럽게 덮어쓴다.
 */
export async function readJSON<T>(key: string): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    // 저장소 자체를 읽지 못하는 상황(디스크/권한). 없는 값과 똑같이 다룬다.
    return null;
  }
  return parseStoredJson(raw) as T | null;
}

/**
 * 저장된 원문을 그대로 읽는다.
 *
 * `readJSON`은 "값이 없다"와 "값이 있는데 못 읽었다"를 똑같이 null로 만든다. 대부분은 그게
 * 맞지만, 완료 receipt처럼 **없는 것과 못 읽은 것의 처리가 달라야 하는** 자리에서는 원문이
 * 필요하다. 저장소 자체를 읽지 못하면 없는 값과 똑같이 다룬다.
 */
export async function readRawString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 배열로 저장한 값을 읽는다. 배열이 아니면 빈 배열이다.
 *
 * `readJSON() ?? []`만으로는 부족하다 — 그것이 막는 것은 "값이 없는 경우"뿐이고,
 * 유효한 JSON이지만 타입이 다른 값(버전 다운그레이드, 손상, 조작)은 그대로 통과해서
 * 화면의 `.find` / `.map`에서 터진다. 실제로 그 한 줄이 앱을 빈 화면으로 만들었다.
 */
export async function readArray<T>(key: string): Promise<T[]> {
  return asStoredArray<T>(await readJSON<unknown>(key));
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
