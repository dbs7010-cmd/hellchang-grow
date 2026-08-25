import { Directory, File, Paths } from 'expo-file-system';

import { buildStoredPhotoName } from '@/utils/photo-file';

/**
 * 사용자가 고른 사진을 **앱이 보관하는 자리로 복사한다.**
 *
 * 사진 선택기가 돌려주는 URI는 앱의 캐시 영역을 가리킨다. 캐시는 기기 저장 공간이 부족할 때
 * 운영체제가 지운다 — 그러면 [몸 변화]의 전후 비교 사진이 어느 날 갑자기 빈칸이 된다.
 * 사용자는 사진을 지운 적이 없는데 사라진 것처럼 보인다.
 *
 * 그래서 기록을 저장하는 순간 문서 디렉터리로 복사해 두고, 그 경로를 기록에 남긴다.
 * 원본 사진(사진 앱 안의 것)은 건드리지 않는다.
 *
 * **복사에 실패해도 기록 저장을 막지 않는다.** 그 경우 원래 URI를 그대로 돌려준다 —
 * 지금까지의 동작과 같아지고, 최소한 그날의 체중·체지방 기록은 남는다.
 */
export const BodyPhotoDirectoryName = 'body-photos';

export async function persistBodyPhoto(sourceUri: string, entryId: string): Promise<string> {
  try {
    const directory = new Directory(Paths.document, BodyPhotoDirectoryName);
    if (!directory.exists) directory.create({ intermediates: true });

    const source = new File(sourceUri);
    const destination = new File(directory, buildStoredPhotoName(sourceUri, entryId));
    if (destination.exists) destination.delete();

    source.copy(destination);
    return destination.uri;
  } catch {
    // 복사할 수 없는 URI(웹의 blob:, 권한 만료 등)이거나 저장 공간이 없는 경우.
    // 기록은 그대로 남기고 사진은 원래 참조를 쓴다.
    return sourceUri;
  }
}
