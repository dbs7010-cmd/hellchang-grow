/**
 * 사진 파일 이름 규칙.
 *
 * 앱이 사진을 보관할 때 원본 파일 이름을 그대로 쓰지 않는다 — 사진 앱에서 온 이름은 길거나,
 * 겹치거나, 파일 시스템에서 쓸 수 없는 문자를 포함할 수 있다. 기록 id로 이름을 만들면
 * 항상 유일하고 어떤 기록의 사진인지도 분명하다.
 *
 * 순수 함수다 — 파일 시스템을 모른다 (scripts/verify-storage-recovery.ts가 검증한다).
 */

const DefaultPhotoExtension = 'jpg';
const MaxExtensionLength = 5;

/**
 * URI에서 확장자만 뽑는다. 알아볼 수 없으면 jpg로 둔다 — 사진 선택기는 대부분 jpeg을 준다.
 * 쿼리 문자열(`?width=...`)이나 조각(`#...`)이 붙어 와도 확장자만 남긴다.
 */
export function photoFileExtension(uri: string): string {
  const withoutQuery = uri.split('?')[0].split('#')[0];
  const lastSegment = withoutQuery.split('/').pop() ?? '';
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0) return DefaultPhotoExtension;

  const raw = lastSegment.slice(dotIndex + 1).toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, '');
  if (cleaned.length === 0 || cleaned.length > MaxExtensionLength) return DefaultPhotoExtension;
  return cleaned;
}

/** 앱이 보관할 파일 이름. 기록 id 하나당 사진 하나다. */
export function buildStoredPhotoName(uri: string, entryId: string): string {
  const safeId = entryId.replace(/[^A-Za-z0-9_-]/g, '') || 'photo';
  return `${safeId}.${photoFileExtension(uri)}`;
}
